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
			console.log("v-03")
			const docText = state.doc.toString();

			// 1. Ищем границы предложений во всем тексте
			// Границей считаем: (.!?), за которыми идет пробел и заглавная буква, ИЛИ начало/конец строки
			const boundaryRegex = /([.!?]\s+(?=[A-ZА-ЯЁ]))|(\n+)/g;

			let start = 0;
			let end = docText.length;

			// Ищем ближайшую границу СЛЕВА (начало предложения)
			const matchesBefore = Array.from(docText.substring(0, pos).matchAll(boundaryRegex));
			if (matchesBefore.length > 0) {
				const lastMatch = matchesBefore[matchesBefore.length - 1];
				if (lastMatch === undefined) return null;
				start = lastMatch.index! + lastMatch[0].length;
			}

			// Ищем ближайшую границу СПРАВА (конец предложения)
			boundaryRegex.lastIndex = pos;
			const matchAfter = boundaryRegex.exec(docText);
			if (matchAfter) {
				// Если это знак препинания, включаем его в диапазон, если перенос строки — нет
				end = matchAfter[1] ? matchAfter.index + 1 : matchAfter.index;
			}

			return {
				from: Math.max(0, start),
				to: Math.min(docText.length, end)
			};
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
