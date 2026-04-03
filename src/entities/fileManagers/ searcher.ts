import {App, TFile} from "obsidian";

export class Searcher {
	private readonly app: App;
	constructor(app: App) {
		this.app = app;
	}

	async getSearchResults(query: string): Promise<TFile | null> {
		const file = this.app.vault.getFiles()
			.find(f => f.name === query || f.path === query);
		return file || null;
	}


}
