
// Распределитель
import {Searcher} from "./ searcher";
import {TFile} from "obsidian";

export class Distributor {
	private readonly searcher: Searcher;
	constructor(searcher: Searcher) {
		this.searcher = searcher;
	}
	// Получаем быстро нарезанные куски чистого текста
	insert = async (parts: string[]) => {
		const files: TFile[] = [];
		try {
			// доп проверка: вдруг такое уже есть (будет идти с опозданием т.к.нехуй тормозить поиском в огромном хранилище
			//await this.searcher.getSearchResults(`${parts[0]}.md`);


		} catch (e) {
			console.error("Ошибка при загрузке данных для ховера:", e);
		}
	}

}
