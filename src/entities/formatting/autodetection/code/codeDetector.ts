// npm install prismjs
// npm install --save-dev @types/prismjs

import Prism from 'prismjs';

import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-shell-session';
import {CodeScanOptions} from "../../../../core/codeScanOptions";

export function detectCodeBlocks(input: string, lang: CodeScanOptions): string {
	const grammar = Prism.languages[lang];
	if (!grammar) {
		debugger; return input;
	}

	const tokens = Prism.tokenize(input, grammar);
	let finalMarkdown = "";
	let codeBuffer = "";

	for (const token of tokens) {
		if (typeof token !== 'string') {
			// Prism распознал это как элемент кода (ключевое слово, оператор и т.д.)
			codeBuffer += (typeof token.content === 'string') ? token.content : token.content.toString();
		} else {
			// Это обычный текст. Если в буфере накопился код — сбрасываем его в блок.
			if (codeBuffer.trim().length > 0) {
				finalMarkdown += `\n\`\`\`${lang}\n${codeBuffer.trim()}\n\`\`\`\n`;
				codeBuffer = "";
			}
			finalMarkdown += token;
		}
	}

	// Если код был в самом конце текста
	if (codeBuffer.trim().length > 0) {
		finalMarkdown += `\n\`\`\`${lang}\n${codeBuffer.trim()}\n\`\`\`\n`;
	}

	return finalMarkdown.trim();
}

