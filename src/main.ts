import {App, Editor, MarkdownView, Modal, Notice, Plugin, View, WorkspaceLeaf} from 'obsidian';
import {DEFAULT_SETTINGS, PluginSettings, SampleSettingTab} from "./settings";
import {waitForCopy} from "./ICS/clipboardManager";
import {ScanMode, TextScanner} from "./entities/formatting/scanning/scanner";
import {hoverField} from "./entities/formatting/hover/hover";
import {hoverPlugin} from "./entities/formatting/hover/hoverPlugin";
import {shiftEnumValue} from "./utils/ShiftEnumValue";
import {MermaidExtentions} from "./entities/formatting/mermaid/mermaidExtentions";
import {MermaidSyncer} from "./entities/formatting/mermaid/MermaidSyncer";
import {Distributor} from "./entities/fileManagers/distributor";
import {DRAFT_FILE_NAME} from "./core/NameConventions";
import {Searcher} from "./entities/fileManagers/searcher";
import {LinksMapProvider} from "./entities/linksManagers/linksMapProvider";
import {StatusBarCodeScanOptions} from "./ui/statusBarItems/statusBarCodeScanOptions";
import {DraftManager} from "./app/DraftManager";
import {hoverRefField} from "./entities/formatting/hover/hoverRef";


export default class LinkTypology extends Plugin {
	settings: PluginSettings;
	statusBarControl: StatusBarCodeScanOptions;
	private statusBar: StatusBarCodeScanOptions;
	private mermaidExt: MermaidExtentions;
	private syncer: MermaidSyncer;
	private distributor: Distributor;
	private searcher: Searcher;
	private isWaitingForTextCopy : boolean = false;
	draftManager: DraftManager;
	scanner: TextScanner;
	currentMode: ScanMode = ScanMode.Sentence;
	isDraftActive: boolean = false;

	async onload() {
		console.clear();
		await this.loadSettings();
		this.install();
		this.setupHover();
		this.setupIsDraftActive();
		this.setupSettings();

		this.app.workspace.onLayoutReady(async () => {
			if (!await this.app.vault.adapter.exists('Content')) {
				await this.app.vault.createFolder(`Content`);
			}
		});
		//this.setupMermaidExtensions();

	}


	private install() {

		this.scanner = new TextScanner();
		this.mermaidExt = new MermaidExtentions(this.app);
		this.syncer = new MermaidSyncer(this.app);
		this.searcher = new Searcher(this.app);
		this.distributor = new Distributor(this.app, this.searcher, new LinksMapProvider(this.app));
		this.draftManager = new DraftManager(this.app, this.settings);
		this.draftManager.setup();
	}

	private setupSettings() {
		// 1. Создаем элемент в статус-баре
		const statusBarItemEl = this.addStatusBarItem();

		// 2. Инициализируем наш контроллер
		this.statusBarControl = new StatusBarCodeScanOptions(
			statusBarItemEl,
			this.settings.codeScanOptions,
			async (newValue) => {
				this.settings.codeScanOptions = newValue;
				await this.saveSettings();
			}
		);
	}

	private setupIsDraftActive() {
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				const activeFile = this.app.workspace.getActiveFile();
				this.isDraftActive = activeFile?.basename === DRAFT_FILE_NAME;
			})
		);

		// Инициализируем при старте
		this.isDraftActive = this.app.workspace.getActiveFile()?.basename === DRAFT_FILE_NAME;
	}

	private setupHover() {
		// Регистрируем расширения CodeMirror 6
		this.registerEditorExtension([
			hoverField,
			hoverRefField,
			hoverPlugin(
				this.app,
				this.scanner,
				this.distributor,
				{getMode: () => this.currentMode, setMode: mode => {this.currentMode = mode}},
				() => this.isDraftActive)
		]);
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
	}

	private setupMermaidExtensions() {
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.mermaidExt.processMermaidDiagrams();
			})
		)
		// Наблюдаем за новыми диаграммами
		const observer = new MutationObserver(() => {
			this.mermaidExt.processMermaidDiagrams();
		});
		observer.observe(document.body, {childList: true, subtree: true});

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
						editor.setCursor({line: 0, ch: 0});
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
	}

	onunload() {
		this.draftManager.destroy();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
