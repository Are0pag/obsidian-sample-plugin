import {App} from "obsidian";

export class MermaidExtentions {
	private readonly app: App;
	constructor(app: App) {
		this.app = app;
	}

	processMermaidDiagrams() {
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
