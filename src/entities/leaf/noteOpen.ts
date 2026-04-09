import { App, MarkdownView, Plugin } from "obsidian";

/**
 * Функция для принудительного переключения открытых заметок в режим Editing.
 * @param plugin - Экземпляр вашего плагина
 */
export function setupViewOnOpen(plugin: Plugin) {
	plugin.registerEvent(
		plugin.app.workspace.on('file-open', (file) => {
			if (!file) return;

			// Используем setTimeout, чтобы дождаться инициализации leaf
			setTimeout(() => {
				const activeLeaf = plugin.app.workspace.getLeaf(false);
				if (!activeLeaf) return;

				const viewState = activeLeaf.getViewState();
				if (!viewState.state) return;

				// Проверяем, что это заметка и что она в режиме preview
				if (viewState.type === 'markdown' && viewState.state.mode === 'preview') {
					viewState.state.mode = 'source';

					// Чтобы гарантированно сработало, применяем состояние
					activeLeaf.setViewState(viewState, { focus: true });

					console.log(`Плагин: Переключил ${file.name} в режим редактирования`);
				}
			}, 50); // 50мс обычно достаточно для обхода гонки процессов
		})
	);
}
