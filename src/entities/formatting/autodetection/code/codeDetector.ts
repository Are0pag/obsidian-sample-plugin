// npm install prismjs
// npm install --save-dev @types/prismjs
import Prism from 'prismjs';
// Хак для того, чтобы компоненты Prism увидели библиотеку
(window as any).Prism = Prism;
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-shell-session';
import {CodeScanOptions} from "../../../../core/codeScanOptions";

export function detectCodeBlocks(input: string, lang: CodeScanOptions): string {
	// Регулярка: ищет текст, который начинается после ":"
	// и заканчивается на ";" (включая переносы строк)
	// [^:]*? — берет ближайшее совпадение, чтобы не захватить лишнего
	const codeRegex = /:\s*([^:]+?;)/gs;

	return input.replace(codeRegex, (match, codeGroup) => {
		const cleanCode = codeGroup.trim();

		// Простая проверка: если внутри "кода" меньше 5 символов
		// или нет ни одного спецсимвола/цифры — скорее всего это просто текст
		if (cleanCode.length < 5 || !/[0-9;()',]/.test(cleanCode)) {
			return `: ${cleanCode}`;
		}

		// Возвращаем двоеточие, а код упаковываем в блок Obsidian
		return `:\n\`\`\`${lang}\n${cleanCode}\n\`\`\`\n`;
	});
}


