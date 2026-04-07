// Распределитель
import {Searcher} from "./searcher";
import {App, TFile} from "obsidian";
import {CONTENT_FOLDER_NAME} from "../../core/NameConventions";
import {LinksMapProvider} from "../linksManagers/linksMapProvider";
import {FileSelectionModal} from "../../ui/modals/fileSelectionModal";

export class Distributor {
	private readonly app: App;
	private readonly searcher: Searcher;
	private readonly linksMap: LinksMapProvider;

	constructor(app: App, searcher: Searcher, linksMap: LinksMapProvider) {
		this.searcher = searcher;
		this.app = app;
		this.linksMap = linksMap;
	}

	// Получаем быстро нарезанные куски чистого текста
	insert = async (parts: string[]) => {
		const files: TFile[] = [];
		try {
			const roots = this.linksMap.getItemsWithoutBacklinks();
			const filePath = `${CONTENT_FOLDER_NAME}/${parts[0]}.md`;
			let newFile: TFile;

			const existingFile = this.app.vault.getAbstractFileByPath(filePath);

			if (existingFile instanceof TFile) {
				newFile = existingFile;
			} else {
				newFile = await this.app.vault.create(filePath, "- ");
			}

			new FileSelectionModal(this.app, roots)
				.open();

		} catch (e) {
			console.error("Ошибка при загрузке данных для ховера:", e);
		}
	}

	/**
	 * Создает новую заметку из выделенного текста и заменяет его на ссылку
	 * @param sourceRange - диапазон выделенного текста
	 * @param sourceText - выделенный текст (станет содержимым новой заметки)
	 * @param targetWord - слово/фраза, на которое перетащили (станет названием заметки)
	 */
	createReference = async (
		sourceRange: { from: number, to: number },
		sourceText: string,
		targetWord: string
	) => {
		try {
			const fileName = this.sanitizeFileName(targetWord);
			const filePath = `${CONTENT_FOLDER_NAME}/${fileName}.md`;

			let newFile: TFile;
			const existingFile = this.app.vault.getAbstractFileByPath(filePath);

			if (existingFile instanceof TFile) {
				const shouldOverwrite = await this.showFileExistsModal(fileName);
				if (!shouldOverwrite) {
					return { success: false, error: "Операция отменена пользователем" };
				}
				newFile = existingFile;
				// Перезаписываем содержимое
				await this.app.vault.modify(newFile, sourceText);
			} else {
				newFile = await this.app.vault.create(filePath, sourceText);
			}

			const sourceFile = this.app.workspace.getActiveFile();
			if (sourceFile) // Заменяем исходный текст на ссылку в текущем документе
				await this.replaceWithLink(sourceFile, sourceRange, fileName, sourceText);

			// Открываем новую заметку (опционально)
			// await this.app.workspace.openLinkText(newFile.path, "");

			return { success: true, newFile, linkText: `[[${fileName}]]` };

		} catch (error) {
			console.error("Ошибка при создании заметки:", error);
			return { success: false, error };
		}
	}

	/**
	 * Заменяет выделенный текст на ссылку
	 */
	private async replaceWithLink(file: TFile, range: { from: number, to: number }, linkName: string, originalText: string) {
		// Читаем текущее содержимое
		let content = await this.app.vault.read(file);

		// Конвертируем позиции из CodeMirror в индексы строки
		// Этот метод зависит от того, как вы работаете с позициями
		// В CodeMirror from/to - это индексы символов в документе

		const before = content.slice(0, range.from);
		const after = content.slice(range.to);
		const newContent = before + `[[${linkName}]]` + after;

		// Сохраняем изменения
		await this.app.vault.modify(file, newContent);
	}

	/**
	 * Очищает строку для использования в качестве имени файла
	 */
	private sanitizeFileName(text: string): string {
		return text
			.trim()
			.replace(/[\\/:*?"<>|]/g, '')
			.replace(/\s+/g, ' ')
			.substring(0, 100);
	}

	/**
	 * Показывает модальное окно при существующем файле
	 */
	private async showFileExistsModal(fileName: string): Promise<boolean> {
		// Здесь можно реализовать модальное окно с выбором
		// Пока просто спрашиваем через confirm
		return confirm(`Файл "${fileName}.md" уже существует. Перезаписать?`);
	}
}
