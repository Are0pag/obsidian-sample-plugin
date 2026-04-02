import { TFile, App } from 'obsidian';

export class MermaidSyncer {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	async syncMermaidWithLinks(file: TFile) {
		const content = await this.app.vault.read(file);

		// 1. Извлекаем карту NodeID -> Название из скрытого блока
		// Ищем строки вида Node1=[[Новое Имя]]
		const linkMap = new Map<string, string>();
		const hiddenBlockRegex = /> \[!hidden\][\s\S]*?(?=\n\n|\n$|$)/g;
		const hiddenBlockMatch = content.match(hiddenBlockRegex);

		if (!hiddenBlockMatch) return;

		const lineRegex = /(Node\d+)=\[\[(.*?)(?:\|.*?)?\]\]/g;
		let match;
		while ((match = lineRegex.exec(hiddenBlockMatch[0])) !== null) {
			if (match[1] === undefined || match[2] === undefined) return;
			linkMap.set(match[1], match[2]);
		}

		if (linkMap.size === 0) return;

		// 2. Обновляем Mermaid диаграмму
		let newContent = content;
		let changed = false;

		linkMap.forEach((newName, nodeId) => {
			// Регулярка ищет Node1[Старое Имя] или Node1(Старое Имя) и т.д.
			const mermaidNodeRegex = new RegExp(`(${nodeId})\\[(.*?)\\]`, 'g');

			newContent = newContent.replace(mermaidNodeRegex, (fullMatch, id, oldName) => {
				if (oldName !== newName) {
					changed = true;
					return `${id}[${newName}]`;
				}
				return fullMatch;
			});
		});

		// 3. Сохраняем, если были изменения
		if (changed) {
			await this.app.vault.modify(file, newContent);
		}
	}
}
