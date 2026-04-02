
export const DRAFT_FILE_NAME = "draft" as const;

export interface HeadingNamingConvention {
	Definition: "Definitions",
	Properties: "Properties",
	Hierarchical: "Hierarchical relations",
	Part: "Part-whole relations",
	End: '~~h~~',
}

export  interface KeyWordsNamingConvention {
	Source: "source:",
	Property: "prop:",
	Genus: "genus:",
	Species: "species:",
	End: "}"
}
