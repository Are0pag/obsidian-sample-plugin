import {App} from "obsidian";

export class MermaidExtentions {
	private readonly app: App;
	constructor(app: App) {
		this.app = app;
	}

	async processMermaidDiagrams() {
		// Получаем текущий активный файл
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) return;

		// Читаем содержимое файла
		const content = await this.app.vault.read(activeFile);

		// Ищем все mermaid блоки
		const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
		let match;

		while ((match = mermaidRegex.exec(content)) !== null) {
			const mermaidCode = match[1];
			if (mermaidCode === undefined) return;

			// Парсим узлы: NodeID[Текст узла]
			const nodeRegex = /(\w+)\[([^\]]+)\]/g;
			const nodeMatches = [...mermaidCode.matchAll(nodeRegex)];

			// Создаём маппинг ID -> текст
			const nodeTextMap = new Map();
			nodeMatches.forEach(nodeMatch => {
				const id = nodeMatch[1];
				const text = nodeMatch[2];
				nodeTextMap.set(id, text);
			});

			// Теперь можно повесить обработчики на DOM узлы
			document.querySelectorAll('.mermaid .node').forEach(node => {
				if (node.hasAttribute('data-clickable')) return;

				// Найти ID узла (обычно в id атрибуте: "flowchart-Node1-123")
				const nodeId = node.id;
				const idMatch = nodeId.match(/-(\w+)-/);

				if (idMatch && nodeTextMap.has(idMatch[1])) {
					const noteName = nodeTextMap.get(idMatch[1]);

					node.setAttribute('style', 'cursor: pointer;');
					node.setAttribute('data-clickable', 'true');

					node.addEventListener('click', (e) => {
						e.preventDefault();
						e.stopPropagation();
						this.app.workspace.openLinkText(noteName, '');
					});
				}
			});
		}
	}

	processMermaidDiagramsSVX() {
		const diagrams = document.querySelectorAll('.mermaid');

		diagrams.forEach(diagram => {
			// Убираем старый обработчик, если есть
			if (diagram.hasAttribute('data-listener')) return;
			diagram.setAttribute('data-listener', 'true');

			// Вешаем один обработчик на всю диаграмму
			diagram.addEventListener('click', (e) => {
				// Ищем родителя .node
				let target = e.target as Element;
				let node = target.closest('.node');

				if (!node) return;

				const textSpan = node.querySelector('span');
				const noteName = textSpan?.textContent?.trim();

				if (noteName) {
					e.preventDefault();
					e.stopPropagation();
					this.app.workspace.openLinkText(noteName, '');
				}
			});
		});
	}

	getTextFromNode(node: Element): string {
		// Прямой текст в узле
		if (node.textContent) return node.textContent.trim();

		// Ищем любой дочерний элемент с текстом
		const childWithText = node.querySelector('text, tspan, span, div, p');
		return childWithText?.textContent?.trim() || '';
	}
}
