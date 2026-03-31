import { App, TFile, LinkCache, HeadingCache } from 'obsidian';

export type LinkExtractResult = LinkCache[] | 'invalid cache' | 'invalid heading' | 'file not found';

export class LinkExtractor {
	private app: App;
	private readonly headingEnding: string;
	private readonly keyEnding: string;

	constructor(app: App, headingEnding: string, keyEnding: string) {
		this.app = app;
		this.headingEnding = headingEnding;
		this.keyEnding = keyEnding;
	}

	public async extractFromH6(filePath: string, targetHeading: string, keyWord?: string ): Promise<LinkExtractResult> {
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

		let startLine = h6.position.start.line;
		let endLine = lines.length; // По умолчанию до конца файла

		// Ищем строку с маркером ~~headingEnd~~ после заголовка
		for (let i = startLine + 1; i < lines.length; i++) {
			const line = lines[i];
			if (line === undefined) continue;

			if (line.includes(this.headingEnding)) {
				endLine = i;
				break;
			}
		}

		if (keyWord) {
			for (let j = startLine; j < endLine; j++) { // в рамках заголовка
				const line = lines[j];
				if (line === undefined) continue;
				if (line.includes(keyWord)) {
					startLine = j;
					for (let e = j; e < endLine; e++) {
						const keyLine = lines[e];
						if (keyLine === undefined) continue;
						if (keyLine.includes(this.keyEnding)) {
							endLine = e;
						}
					}
				}
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
