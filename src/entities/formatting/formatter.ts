interface TextComponent {

}

interface Sentence extends TextComponent {
	text: string;
}

interface Enumeration extends TextComponent {
	// Colon - двоеточие `:`
	textBeforeColon: string;
	values: string[];
}

