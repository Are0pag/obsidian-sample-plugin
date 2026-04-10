import { Editor, Plugin } from "obsidian";

export class TextCleaner {
	public register(plugin: Plugin) {
		plugin.registerEvent(
			plugin.app.workspace.on('editor-change', (editor: Editor) => {
				this.removeHyphenArtifacts(editor);
			})
		);
	}

	private removeHyphenArtifacts(editor: Editor) {
		const content = editor.getValue();

		// Регулярка ищет: буква + дефис + (любой пробельный символ: пробел или перенос) + буква
		// [а-яёa-z] — буквы (RU/EN)
		// \s+ — один или несколько пробелов/переносов
		const cleaned = content.replace(/([а-яёa-z])-\s+([а-яёa-z])/gi, '$1$2');

		if (content !== cleaned) {
			const cursor = editor.getCursor();
			editor.setValue(cleaned);
			editor.setCursor(cursor);
		}
	}
}
