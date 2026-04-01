class InDependentFormatter {
	getTextContent(origin: string): TextComponent[] {
		let comps: TextComponent[] = [];

		let f = getFirstLetter(origin);
		if (f === null) return comps;

		let cleanOrigin = origin.slice(origin.indexOf(f));

		let enumerationParagraphStartIndex = cleanOrigin.search(/:/);
		if (enumerationParagraphStartIndex !== -1) {
			const enumerationParagraph = cleanOrigin.slice(0, enumerationParagraphStartIndex);


		}

		let sentenceEndIndex = cleanOrigin.search(/[.?!]/);
		if (sentenceEndIndex !== -1) {
			let x = cleanOrigin.slice(0, sentenceEndIndex);
			comps.push({text: x} as Sentence);
			let nextStep = cleanOrigin.slice(sentenceEndIndex);
		} else {
			comps.push({text: cleanOrigin} as Sentence);
			return comps;
		}

		return comps;
	}
}
