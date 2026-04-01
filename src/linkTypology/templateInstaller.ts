import { App, TFile, TFolder, Notice, normalizePath } from 'obsidian';

export class TemplateManager {
	private app: App;
	private readonly folderPath: string = "Templates";

	constructor(app: App) {
		this.app = app;
	}

	async setupTemplate(fileName: string = "LinkTypologyTemplate.md"): Promise<void> {
		const filePath = normalizePath(`${this.folderPath}/${fileName}`);

		const content = this.getTemplateContent();

		try {
			await this.ensureDirectoryExists(this.folderPath);

			if (this.app.vault.getAbstractFileByPath(filePath)) {
				return;
			}

			await this.app.vault.create(filePath, content);
		} catch (error) {
			console.error("Ошибка при создании шаблона:", error);
		}
	}

	private getTemplateContent(): string {
		return [
			"###### Definitions",
			"",
			"###### Properties",
			"",
			"###### Hierarchical relations",
			"",
			"###### Part-whole relations",
			""
		].join("\n");
	}

	private async ensureDirectoryExists(path: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(path);
		if (!(folder instanceof TFolder)) {
			await this.app.vault.createFolder(path);
		}
	}
}
