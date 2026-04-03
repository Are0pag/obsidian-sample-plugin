import { App, SuggestModal, TFile, WorkspaceLeaf } from "obsidian";

export class FileSelectionModal extends SuggestModal<TFile> {
	files: TFile[];

	constructor(app: App, files: TFile[]) {
		super(app);
		this.files = files;
		this.setPlaceholder("Выберите заметку для открытия...");
	}

	// Фильтрация списка при вводе текста в поиск
	getSuggestions(query: string): TFile[] {
		return this.files.filter((file) =>
			file.basename.toLowerCase().includes(query.toLowerCase())
		);
	}

	// Отрисовка каждого элемента в списке
	renderSuggestion(file: TFile, el: HTMLElement) {
		el.createEl("div", { text: file.basename });
		el.createEl("small", {
			text: file.path,
			cls: "suggestion-content" // Используем встроенный класс для мелкого текста
		});
	}

	// Логика при выборе элемента (нажатие Enter или клик)
	onChooseSuggestion(file: TFile, evt: MouseEvent | KeyboardEvent) {
		// Открываем в новом окне (leaf)
		const leaf = this.app.workspace.getLeaf('window');
		leaf.openFile(file);
	}
}
