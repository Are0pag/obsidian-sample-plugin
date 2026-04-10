interface KeyMap {
	Eng: string,
	Rus: string
}

interface HoverHotKey {
	Clear: KeyMap;
	Ref: KeyMap;
	Merge: KeyMap;

	RefModifiers: {
		Sentence: KeyMap;
		Word: KeyMap;
	};
}


