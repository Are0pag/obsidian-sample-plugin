interface KeyMap {
	Eng: string,
	Rus: string
}

interface HoverHotKey {
	Clear: KeyMap;
	Ref: KeyMap;
	Merge: KeyMap;
	Separate: KeyMap;

	RefModifiers: {
		Sentence: KeyMap;
		Word: KeyMap;
	};
}


