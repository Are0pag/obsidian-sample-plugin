import {App, Editor, MarkdownView, Modal, Notice, Plugin, View, WorkspaceLeaf} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";
import { createContext } from 'react';
import {DraftView, DRAFT_VIEW_TYPE} from "./DraftView";
import {waitForCopy} from "./ICS/clipboardManager";
import {ScanMode, TextScanner} from "./entities/formatting/scanner";
import {hoverField} from "./entities/formatting/hover/hover";
import {hoverPlugin} from "./entities/formatting/hover/hoverPlugin";
import {shiftEnumValue} from "./utils/ShiftEnumValue";
import {TemplateManager} from "./linkTypology/templateInstaller";
import {MermaidExtentions} from "./entities/formatting/mermaid/mermaidExtentions";
import {MermaidSyncer} from "./entities/formatting/mermaid/MermaidSyncer";
import {Distributor} from "./entities/fileManagers/distributor";
import {DRAFT_FILE_NAME} from "./core/NameConventions";
import {Searcher} from "./entities/fileManagers/ searcher";
import {LinksMapProvider} from "./entities/linksManagers/linksMapProvider";


export default class LinkTypology extends Plugin {
	settings: MyPluginSettings;
	private mermaidExt: MermaidExtentions;
	private syncer: MermaidSyncer;
	private distributor: Distributor;
	private searcher: Searcher;
	//private draftView: DraftView | null = null;
	private isWaitingForTextCopy : boolean = false;
	scanner: TextScanner;
	currentMode: ScanMode = ScanMode.Sentence;
	isDraftActive: boolean = false;

	async onload() {
		console.clear();
		await this.loadSettings();
		this.scanner = new TextScanner();
		this.mermaidExt = new MermaidExtentions(this.app);
		this.syncer = new MermaidSyncer(this.app);
		this.searcher = new Searcher(this.app);
		this.distributor = new Distributor(this.app, this.searcher, new LinksMapProvider(this.app));
		// Регистрируем расширения CodeMirror 6
		this.registerEditorExtension([
			hoverField,
			hoverPlugin(
				this.scanner,
				() => this.currentMode,
				this.distributor.insert,
				() => this.isDraftActive)
		]);

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				const activeFile = this.app.workspace.getActiveFile();
				this.isDraftActive = activeFile?.basename === DRAFT_FILE_NAME;
			})
		);

		// Инициализируем при старте
		this.isDraftActive = this.app.workspace.getActiveFile()?.basename === DRAFT_FILE_NAME;

		// this.registerView(DRAFT_VIEW_TYPE, (leaf) => {
		// 	this.draftView = new DraftView(leaf);
		// 	return this.draftView;
		// });

		this.app.workspace.onLayoutReady(async () => {
			//await this.activateView();
			//await new TemplateManager(this.app).setupTemplate();
			if (!await this.app.vault.adapter.exists('Content')) {
				await this.app.vault.createFolder(`Content`);
			}
		});

		// this.addCommand({
		// 	id: 'open-react-view',
		// 	name: 'Open React View',
		// 	callback: () => this.activateView(),
		// });

		this.registerDomEvent(document, 'click', async (evt: MouseEvent) => {
			//await this.catchBuffer();
		});
		this.registerDomEvent(document, 'pointerdown', (evt: PointerEvent) => {
			if (evt.button === 3) {
				evt.preventDefault();
				this.currentMode = shiftEnumValue(ScanMode, this.currentMode, -1);
				console.log(ScanMode[this.currentMode]);
			} else if (evt.button === 4) {
				evt.preventDefault();
				this.currentMode = shiftEnumValue(ScanMode, this.currentMode, 1);
				console.log(ScanMode[this.currentMode]);
			}
		});

		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.mermaidExt.processMermaidDiagrams();
			})
		)
		// Наблюдаем за новыми диаграммами
		const observer = new MutationObserver(() => {
			this.mermaidExt.processMermaidDiagrams();
		});
		observer.observe(document.body, { childList: true, subtree: true });

		// Используем 'changed', так как Obsidian вызывает его после
		// автоматического обновления внутренних ссылок в файле.
		this.registerEvent(
			this.app.metadataCache.on('changed', (file) => {
				this.syncer.syncMermaidWithLinks(file);
			})
		);

		// для скрытого содержания: Слушаем событие изменения активного представления (включая переходы по ссылкам)
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) return;

				const editor = view.editor;
				let currLine = editor.getCursor().line;

				// Идем вверх от курсора, пока строки начинаются с '>' (цитата/коллаут)
				while (currLine >= 0) {
					const lineText = editor.getLine(currLine).trim();

					// Если нашли начало нашего скрытого блока
					if (lineText.startsWith('> [!hidden]')) {
						// Выбрасываем курсор в начало файла
						editor.setCursor({ line: 0, ch: 0 });
						// Опционально: убираем фокус с редактора, чтобы не развернуло блок
						(editor as any).blur();
						break;
					}

					// Если строка не начинается с '>', значит мы вышли за пределы коллаута вверх
					if (!lineText.startsWith('>')) break;

					currLine--;
				}
			})
		);
;

	}

	private async catchBuffer() {
		if (!this.app.workspace.layoutReady) return;
		if (this.isWaitingForTextCopy) return;
		console.log("Wait text import")
		this.isWaitingForTextCopy = true;
		let currentText = await waitForCopy();
		this.isWaitingForTextCopy = false;
		console.log('Перехвачен текст:', currentText);

		// Получаем активное представление (view)
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

		if (activeView) {
			// Получаем объект редактора
			const editor = activeView.editor;

			// Вставляем текст в позицию курсора
			editor.setValue(currentText);
		}
	}

	onunload() {
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(DRAFT_VIEW_TYPE)[0];

		if (!leaf) {
			leaf = workspace.getRightLeaf(false) ?? undefined;
			await leaf?.setViewState({
				type: DRAFT_VIEW_TYPE,
				active: true,
			});
		}

		if (leaf === undefined) {
			console.error("draft leaf is undefined", leaf);
			return;
		}

		await workspace.revealLeaf(leaf);
	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
