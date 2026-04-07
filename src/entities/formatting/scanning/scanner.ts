import { EditorState } from "@codemirror/state";

export enum ScanMode {
	Word,
	//Clause,    // Часть предложения (между запятыми/знаками)
	Sentence,
	Paragraph
}

export class TextScanner {
	// Метод для получения диапазона
	getRange(state: EditorState, pos: number, mode: ScanMode) {
		if (mode === ScanMode.Word) {
			const word = state.wordAt(pos);
			return word ? { from: word.from, to: word.to } : null;
		}

		const docText = state.doc.toString();

		if (mode === ScanMode.Sentence) {
			// 1. Сначала определяем "базовый" диапазон текущего элемента (текст или блок кода)
			let range = this.getCodeBlockRange(docText, pos);

			if (!range) {
				// Если не блок кода, ищем границы обычного предложения
				let start = 0;
				let end = docText.length;
				const boundaryRegex = /([.!?]\s+(?=[A-ZА-ЯЁ]))|(\n+)/g;

				const matchesBefore = Array.from(docText.substring(0, pos).matchAll(boundaryRegex));
				if (matchesBefore.length > 0) {
					let count = matchesBefore[matchesBefore.length - 1];
					if (count)
						start = count.index! + count[0].length;
				}

				boundaryRegex.lastIndex = pos;
				const matchAfter = boundaryRegex.exec(docText);
				if (matchAfter) {
					end = matchAfter.index + (matchAfter[1] ? 1 : 0);
				}
				range = { from: start, to: end };
			}

			// 2. САМАЯ ВАЖНАЯ ЧАСТЬ: проверка на двоеточие ПЕРЕД текущим диапазоном
			// Смотрим на текст прямо перед началом найденного диапазона
			const textBefore = docText.substring(Math.max(0, range.from - 50), range.from).trim();

			if (textBefore.endsWith(':')) {
				// Если перед нами двоеточие, значит текущий блок — это продолжение.
				// Ищем начало того предложения, которое закончилось этим двоеточием.
				let prevStart = 0;
				const boundaryRegex = /([.!?]\s+(?=[A-ZА-ЯЁ]))|(\n+)/g;
				const matchesEvenBefore = Array.from(docText.substring(0, range.from - 1).matchAll(boundaryRegex));

				if (matchesEvenBefore.length > 0) {
					let count = matchesEvenBefore[matchesEvenBefore.length - 1];
					if (count)
						prevStart = count.index! + count[0].length;
				}

				// Объединяем: от начала вводной фразы до конца текущего блока
				return { from: prevStart, to: range.to };
			}

			return range;
		}

		if (mode === ScanMode.Paragraph) {
			const start = docText.lastIndexOf('\n\n', pos - 1);
			const end = docText.indexOf('\n\n', pos);
			return {
				from: start === -1 ? 0 : start + 2,
				to: end === -1 ? docText.length : end
			};
		}
		return null;
	}

	// Новый метод для определения блока кода с любым языком
	private getCodeBlockRange(text: string, pos: number): { from: number; to: number } | null {
		// Ищем все блоки кода: ```language и закрывающие ```
		const codeBlockRegex = /```\w*\n[\s\S]*?```/g;
		let match;

		while ((match = codeBlockRegex.exec(text)) !== null) {
			const from = match.index;
			const to = match.index + match[0].length;

			if (pos >= from && pos <= to) {
				return { from, to };
			}
		}

		return null;
	}
}
