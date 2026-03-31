import { App, TFile, LinkCache, HeadingCache } from 'obsidian';

export type LinkExtractResult = LinkCache[] | 'invalid cache' | 'invalid heading' | 'file not found';

export class LinkExtractor {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Извлекает ссылки из блока H6 до маркера ~~headingEnd~~
	 */
	public async extractFromH6(filePath: string, targetHeading: string, headingEnd: string): Promise<LinkExtractResult> {
		const file = this.app.vault.getAbstractFileByPath(filePath);

		if (!(file instanceof TFile)) return 'file not found';

		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache || !cache.headings) return 'invalid cache';

		// 1. Ищем заголовок H6
		const h6 = cache.headings.find(
			(h: HeadingCache) => h.heading === targetHeading && h.level === 6
		);

		if (!h6) return 'invalid heading';

		// 2. Читаем содержимое, чтобы найти маркер завершения
		const content = await this.app.vault.cachedRead(file);
		const lines = content.split('\n');

		const startLine = h6.position.start.line;
		let endLine = lines.length; // По умолчанию до конца файла

		// Ищем строку с маркером ~~headingEnd~~ после заголовка
		for (let i = startLine + 1; i < lines.length; i++) {
			const line = lines[i]; // TypeScript запоминает тип здесь
			if (line === undefined) continue;

			if (line.includes(headingEnd)) { // Ошибки не будет
				endLine = i;
				break;
			}
		}

		// 3. Фильтруем ссылки из к'ша по найденным границам
		if (!cache.links) return "invalid cache";

		return cache.links.filter((link) => {
			const linkLine = link.position.start.line;
			// Включаем ссылки, которые находятся МЕЖДУ заголовком и маркером
			return linkLine >= startLine && linkLine <= endLine;
		});
	}
}
