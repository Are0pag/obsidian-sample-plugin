import {Editor, MarkdownView, Plugin} from "obsidian";

export class InlineCodeDetector {
	// Регулярное выражение для поиска
	// Ищем:
	// 1. <...> (как <stdio.h>)
	// 2. Слова с точкой (файлы .h, .c, .i, .o)
	// 3. Специфичные технические слова (срр, gcc и т.д.)
	private readonly regex = /(?<![`\\])(?:<[^>\s]+>|\b[\w-]+\.[a-z]{1,4}\b|\b(?:срр|cpp|gcc|make|cmake)\b)(?![`])/gi;

	public register(plugin: Plugin) {
		plugin.registerEvent(
			plugin.app.workspace.on('editor-change', (editor: Editor, info: MarkdownView) => {
				this.processInlineCode(editor);
			})
		);
	}

	private processInlineCode(editor: Editor) {
		const doc = editor.getValue();
		let changed = false;

		// Используем Map для хранения защищенных секций
		const protectedSections = new Map<string, string>();
		let counter = 0;

		// Защита: ```блоки```
		let tempDoc = doc.replace(/```[\s\S]*?```/g, (match) => {
			const placeholder = `__PROTECTED_${counter}__`;
			protectedSections.set(placeholder, match);
			counter++;
			return placeholder;
		});

		// Защита: уже существующие `инлайн коды`
		tempDoc = tempDoc.replace(/`[^`]+`/g, (match) => {
			const placeholder = `__PROTECTED_${counter}__`;
			protectedSections.set(placeholder, match);
			counter++;
			return placeholder;
		});

		// Применяем нашу логику только к незащищенному тексту
		const processedDoc = tempDoc.replace(this.regex, (match) => {
			changed = true;
			return `\`${match}\``;
		});

		if (changed) {
			// Восстанавливаем защищенные участки обратно
			const newDoc = processedDoc.replace(/__PROTECTED_\d+__/g, (match) => {
				return protectedSections.get(match) || match;
			});

			// Сохраняем позицию курсора
			const cursor = editor.getCursor();
			editor.setValue(newDoc);
			editor.setCursor(cursor);
		}
	}}
