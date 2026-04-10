import { EditorState } from "@codemirror/state";

export enum ScanMode {
	Word,
	//Clause,    // Часть предложения (между запятыми/знаками)
	Sentence,
	Paragraph
}

export class TextScanner {
	getRange(state: EditorState, pos: number, mode: ScanMode) {
		switch (mode) {
			case ScanMode.Word: {
				const word = state.wordAt(pos);
				return word ? { from: word.from, to: word.to } : null;
			}

			case ScanMode.Sentence:
				return this.getSentence(state.doc.toString(), pos);

			case ScanMode.Paragraph: {
				const docText = state.doc.toString();
				const start = docText.lastIndexOf('\n\n', pos - 1);
				const end = docText.indexOf('\n\n', pos);

				return {
					from: start === -1 ? 0 : start + 2,
					to: end === -1 ? docText.length : end
				};
			}

			default:
				return null;
		}
	}

	private getSentence(docText: string, pos: number) {
		// определяем "базовый" диапазон текущего элемента (текст или блок кода)
		let range = this.getCodeBlockRange(docText, pos);
		if (!range) {
			range = this.getSimpleSentence(docText, pos);
		}

		// проверка на двоеточие ПЕРЕД текущим диапазоном (ищем текст прямо перед началом найденного диапазона)
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
			return {from: prevStart, to: range.to};
		}

		return range;
	}

	private getSimpleSentence(docText: string, pos: number) {
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
		return {from: start, to: end};
	}

	// метод для определения блока кода с любым языком
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
