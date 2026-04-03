import {App, TFile} from "obsidian";
import {CONTENT_FOLDER_NAME} from "../../core/NameConventions";

export class LinksMapProvider {
	private readonly app: App;
	constructor(app: App) {
		this.app = app;
	}

	getItemsWithoutBacklinks() : TFile[] {
		const { vault, metadataCache } = this.app;
		const files = vault.getAllLoadedFiles();
		const referencedPaths = new Set<string>();

		// metadataCache.resolvedLinks возвращает объект { "путь/откуда.md": { "путь/куда.md": 1 } }
		/* {
 			  "Папка/Заметка_А.md": {           // <--- Это "Source" (ключ объекта)
  			  "Папка/Заметка_Б.md": 1,        // <--- Это "destPath" (ключ вложенного объекта)
  			  "Изображение.png": 1
			}*/
		//  destination path (путь назначения)
		Object.values(metadataCache.resolvedLinks).forEach((links) => {
			Object.keys(links).forEach(destPath => referencedPaths.add(destPath));
		});
		return vault.getMarkdownFiles().filter(file => {
			const isInTargetFolder = file.path.startsWith(CONTENT_FOLDER_NAME);
			const hasNoBacklinks = !referencedPaths.has(file.path);
			return isInTargetFolder && hasNoBacklinks;
		});
	}
}
