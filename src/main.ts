import {App, Editor, MarkdownView, Modal, Notice, Plugin, View, WorkspaceLeaf} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";
import { createContext } from 'react';
import {ExampleView, VIEW_TYPE_EXAMPLE} from "./ExampleView";
import {waitForCopy} from "./ICS/clipboardManager";


export default class LinkTypology extends Plugin {
	settings: MyPluginSettings;
	private exampleView: ExampleView | null = null;

	async onload() {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_EXAMPLE, (leaf) => {
			this.exampleView = new ExampleView(leaf);
			return this.exampleView;
		});
		await this.activateView();

		this.addCommand({
			id: 'open-react-view',
			name: 'Open React View',
			callback: () => this.activateView(),
		});

		this.registerDomEvent(document, 'click', async (evt: MouseEvent) => {
			console.log("Wait text import")
			let currentText = await waitForCopy();
			console.log('Перехвачен текст:', currentText);

			if (this.exampleView) {
				// 1. Заменить весь текст
				this.exampleView.setEditorText(currentText);

				// 2. Вставить текст в текущую позицию курсора
				// this.exampleView.insertText(currentText);

				// 3. Очистить и вставить новый текст
				// this.exampleView.clearText();
				// this.exampleView.setText(currentText);

				// 4. Фокусируемся на редакторе
				//this.exampleView.focus();
			}


		});
	}

	onunload() {
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE)[0];

		if (!leaf) {
			leaf = workspace.getRightLeaf(false) ?? undefined;
			await leaf?.setViewState({
				type: VIEW_TYPE_EXAMPLE,
				active: true,
			});
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
