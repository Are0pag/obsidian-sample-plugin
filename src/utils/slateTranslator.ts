
import {Descendant} from "slate";

export const slateToText = (nodes: Descendant[]): string => {
	return nodes
		.map(node => {
			if ('children' in node && node.children) {
				return node.children.map(child => child.text).join('');
			}
			return '';
		})
		.join('\n');
};

export const textToSlateValue = (text: string): Descendant[] => {
	const lines = text.split('\n');
	return lines.map(line => ({
		type: 'paragraph',
		children: [{ text: line }],
	}));
};


