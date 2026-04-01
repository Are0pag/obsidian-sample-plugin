export interface TextItems {
	// абзац с одним/несколькими предложениями, идущими последовательно до переноса строки
	ContinuousParagraph: string;
	// Включает строку перед двоеточием и соответствующее перечисление
	EnumerationParagraph: string;
	CodeBlock: string;
}

export interface CodeBlock {
	rule: RegExp;
}

// если перед началом строки лишние отступы/символы #, 1...9, точки, ... - удалить
// (разумеется кроме естественных знаков препинания в тексте)

//
