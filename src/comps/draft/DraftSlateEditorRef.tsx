//  иногда родительскому компоненту нужно напрямую «приказать» дочернему что-то сделать (например, очистить поле или поставить фокус)
export interface DraftSlateEditorRef {
	setText: (text: string) => void;
	getText: () => string;
	insertText: (text: string) => void;
	clearText: () => void;
	focus: () => void;
}
