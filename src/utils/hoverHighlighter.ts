import { EditorState } from "@codemirror/state";

export enum HighlightMode { Word, Sentence, Paragraph }

export function getRangeAtPos(state: EditorState, pos: number, mode: HighlightMode) {
	const docText = state.doc.toString();

	if (mode === HighlightMode.Word) {
		const word = state.wordAt(pos);
		return word ? { from: word.from, to: word.to } : null;
	}

	if (mode === HighlightMode.Sentence) {
		// Ищем границы предложения во всем тексте, игнорируя \n
		const stopChars = /[.!?](\s|$)/g;
		let start = 0;
		let end = docText.length;

		// Ищем ближайшее завершение предложения слева
		const textBefore = docText.substring(0, pos);
		const matchesBefore = [...textBefore.matchAll(stopChars)];
		if (matchesBefore.length > 0) {
			const lastMatch = matchesBefore[matchesBefore.length - 1];
			start = lastMatch.index! + lastMatch[0].length;
		}

		// Ищем ближайшее завершение справа
		stopChars.lastIndex = pos;
		const matchAfter = stopChars.exec(docText);
		if (matchAfter) {
			end = matchAfter.index + matchAfter[0].trim().length;
		}

		return { from: start, to: end };
	}

	if (mode === HighlightMode.Paragraph) {
		// В Obsidian/Markdown абзацы разделены двойным переносом \n\n
		const text = docText;
		const start = text.lastIndexOf('\n\n', pos - 1);
		const end = text.indexOf('\n\n', pos);

		return {
			from: start === -1 ? 0 : start + 2,
			to: end === -1 ? text.length : end
		};
	}

	return null;
}

