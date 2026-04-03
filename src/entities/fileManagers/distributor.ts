
// Распределитель
import {Searcher} from "./ searcher";
import {App, TFile} from "obsidian";
import {CONTENT_FOLDER_NAME} from "../../core/NameConventions";
import {LinksMapProvider} from "../linksManagers/linksMapProvider";
import {FromDraftModal} from "../../ui/modals/fromDraftModal";
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
			// доп проверка: вдруг такое уже есть (будет идти с опозданием т.к.нехуй тормозить поиском в огромном хранилище
			//await this.searcher.getSearchResults(`${parts[0]}.md`);

			// Откуда?
			// 1 - от корня (привет граф)
			// 2 от текущей (привет локальный граф)
			const roots = this.linksMap.getItemsWithoutBacklinks();
			//roots[0].path

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

}
