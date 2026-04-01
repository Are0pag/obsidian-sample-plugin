import {App, Editor, MarkdownView, Modal, Notice, Plugin, View, WorkspaceLeaf} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";
import { createContext } from 'react';
import {DraftView, DRAFT_VIEW_TYPE} from "./DraftView";
import {waitForCopy} from "./ICS/clipboardManager";
import {ScanMode, TextScanner} from "./entities/scanner";
import {hoverField} from "./entities/hover";
import {hoverPlugin} from "./entities/hoverPlugin";
import {shiftEnumValue} from "./utils/ShiftEnumValue";


export default class LinkTypology extends Plugin {
	settings: MyPluginSettings;
	//private draftView: DraftView | null = null;
	private isWaitingForTextCopy : boolean = false;
	scanner: TextScanner;
	currentMode: ScanMode = ScanMode.Sentence;

	async onload() {
		console.clear();
		await this.loadSettings();
		this.scanner = new TextScanner();

		// Регистрируем расширения CodeMirror 6
		this.registerEditorExtension([
			hoverField,
			// Передаем инстанс сканера и текущий режим в плагин визуализации
			hoverPlugin(this.scanner, () => this.currentMode)
		]);

		// this.registerView(DRAFT_VIEW_TYPE, (leaf) => {
		// 	this.draftView = new DraftView(leaf);
		// 	return this.draftView;
		// });

		// this.app.workspace.onLayoutReady(async () => {
		// 	await this.activateView();
		// });

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
