import {App} from "obsidian";

export class LinksMapProvider {
	private readonly app: App;
	constructor(app: App) {
		this.app = app;
	}

	async getItemsWithoutBacklinks() {
		const { vault, metadataCache } = this.app;
		const files = vault.getAllLoadedFiles();
		const referencedPaths = new Set<string>();

		// metadataCache.resolvedLinks возвращает объект { "путь/откуда.md": { "путь/куда.md": 1 } }
		Object.values(metadataCache.resolvedLinks).forEach((links) => {
			Object.keys(links).forEach(destPath => referencedPaths.add(destPath));
		});
		const rootNotes = files.filter(file => !referencedPaths.has(file.path));

		console.log("Корневые заметки:", rootNotes.map(f => f.path));
	}
}
