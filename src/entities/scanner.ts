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
			const stopChars = /[.!?](\s+|$)/g;
			let start = 0;
			let lastMatch;

			// Ищем начало (ближайший стоп-символ слева)
			const textBefore = docText.substring(0, pos);
			const matchesBefore = Array.from(textBefore.matchAll(stopChars));
			if (matchesBefore.length > 0) {
				const last = matchesBefore[matchesBefore.length - 1];
				start = last.index! + last[0].length;
			}

			// Ищем конец (ближайший стоп-символ справа)
			stopChars.lastIndex = pos;
			const matchAfter = stopChars.exec(docText);
			const end = matchAfter ? matchAfter.index + matchAfter[0].trim().length : docText.length;

			return { from: start, to: end };
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
}
