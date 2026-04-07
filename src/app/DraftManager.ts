import { App, TFile, MarkdownView } from 'obsidian';
import {waitForCopy} from "../ICS/clipboardManager";
import {detectCodeBlocks} from "../entities/formatting/autodetection/code/codeDetector";
import {PluginSettings} from "../settings";

export class DraftManager {
	private readonly app: App;
	private readonly _settings;
	private draftFileName = "draft";

	constructor(app: App, settings: PluginSettings) {
		this.app = app;
		this._settings = settings;
	}

	// Основной метод инициализации событий
	setup() {
		window.addEventListener('blur', this.onWindowBlur);
	}

	destroy() {
		window.removeEventListener('blur', this.onWindowBlur);
	}

	private onWindowBlur = async () => {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

		// Проверяем, что активная заметка именно "draft"
		if (activeView && activeView.file?.basename === this.draftFileName) {
			try {
				const currentText = await waitForCopy();

				if (currentText) {
					//await this.appendToDraft(activeView.file, currentText);
				}
			} catch (e) {
				console.error("DraftPlugin Error:", e);
			}
		}
	};

	private async appendToDraft(file: TFile, text: string) {
		// Добавляем текст в конец файла с новой строки
		let formated = detectCodeBlocks(text, this._settings);
		await this.app.vault.process(file, (data) => {
			return data + `\n${formated}`;
		});
	}
}
