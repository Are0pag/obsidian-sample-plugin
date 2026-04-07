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
			// Сначала проверим, не находимся ли мы внутри блока кода
			const codeBlockRange = this.getCodeBlockRange(docText, pos);
			if (codeBlockRange) {
				return codeBlockRange;
			}

			// Находим обычные границы предложения
			let start = 0;
			let end = docText.length;

			// Ищем границы предложений во всем тексте
			const boundaryRegex = /([.!?]\s+(?=[A-ZА-ЯЁ]))|(\n+)/g;

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
				end = matchAfter[1] ? matchAfter.index + 1 : matchAfter.index;
			}

			// Проверяем, не заканчивается ли предыдущее предложение на двоеточие
			// Для этого смотрим на текст перед start
			const beforeText = docText.substring(Math.max(0, start - 50), start);
			const endsWithColon = /:\s*$/.test(beforeText);

			if (endsWithColon) {
				// Если заканчивается на двоеточие, ищем следующий конец предложения
				// Пропускаем блоки кода, которые могут быть между
				let nextEnd = end;
				let tempPos = end;

				// Ищем следующий конец предложения, пропуская блоки кода
				while (tempPos < docText.length) {
					const tempBoundaryRegex = /([.!?]\s+(?=[A-ZА-ЯЁ]))|(\n+)/g;
					tempBoundaryRegex.lastIndex = tempPos;
					const nextMatch = tempBoundaryRegex.exec(docText);

					if (nextMatch) {
						nextEnd = nextMatch[1] ? nextMatch.index + 1 : nextMatch.index;
						// Проверяем, не находится ли этот конец внутри блока кода
						const potentialCodeBlock = this.getCodeBlockRange(docText, nextEnd - 1);
						if (!potentialCodeBlock) {
							// Нашли следующий конец предложения вне блока кода
							end = nextEnd;
							break;
						} else {
							// Пропускаем блок кода
							tempPos = potentialCodeBlock.to;
						}
					} else {
						nextEnd = docText.length;
						end = nextEnd;
						break;
					}
				}
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
