import {Plugin, WorkspaceLeaf} from "obsidian";
import {SpacedRepetitionService} from "./spaced-repetition-service";
import {REVIEW_VIEW_TYPE, ReviewListView} from "../ui/ItemViews/review-list-view";

export function SetupMemory(plugin: Plugin) {
	const service = new SpacedRepetitionService(plugin.app.vault, plugin.app.metadataCache);

	plugin.registerView(
		REVIEW_VIEW_TYPE,
		(leaf) => new ReviewListView(leaf, service)
	);

	plugin.addRibbonIcon('brain', 'Открыть повторения Эббингауза', () => {
		activateView(plugin);
	});
	createContinueCommand(plugin, service);

	//additionalCommands(plugin, service);
}

async function activateView(plugin: Plugin) {
	const { workspace } = plugin.app;

	let leaf: WorkspaceLeaf | undefined | null = workspace.getLeavesOfType(REVIEW_VIEW_TYPE)[0];
	if (!leaf) {
		const leaf = workspace.getRightLeaf(false);
		if (!leaf) return;
		await leaf.setViewState({ type: REVIEW_VIEW_TYPE, active: true });
	}

	if (!leaf) return;
	workspace.revealLeaf(leaf);
}

function createContinueCommand(plugin: Plugin, service: SpacedRepetitionService) {
	plugin.addCommand({
		id: 'mark-current-and-next',
		name: 'Отметить текущую заметку как повторенную и открыть следующую',
		hotkeys: [
			{ modifiers: ['Alt'], key: '`' },
			{ modifiers: ['Alt'], key: 'ë' }
		],
		checkCallback: (checking) => {
			const activeFile = plugin.app.workspace.getActiveFile();
			if (!activeFile) return false;

			const dueFiles = service.getDueFiles();
			const currentIndex = dueFiles.findIndex(f => f.file.path === activeFile.path);
			if (currentIndex === -1) return false;

			if (!checking) {
				const currentFilePath = activeFile.path;
				// Создаём одноразовый обработчик обновления метаданных
				const metadataHandler = plugin.app.metadataCache.on('changed', (file) => {
					if (file.path === currentFilePath) {
						// Метаданные обновились, можно продолжать
						plugin.app.metadataCache.offref(metadataHandler);

						const updatedDueFiles = service.getDueFiles();
						const remainingFiles = updatedDueFiles.filter(f => f.file.path !== currentFilePath);

						if (remainingFiles[0]) {
							plugin.app.workspace.openLinkText(remainingFiles[0].file.path, '', false);
						}

						// Обновляем представление
						const reviewView = plugin.app.workspace.getLeavesOfType(REVIEW_VIEW_TYPE)[0]?.view;
						if (reviewView instanceof ReviewListView) {
							reviewView.render();
						}
					}
				});

				// Запускаем обновление
				service.promoteFile(activeFile);
			}

			return true;
		}
	});
}


function additionalCommands(plugin: Plugin, service: SpacedRepetitionService) {
	// Команда "Повторил" для текущей открытой заметки
	plugin.addCommand({
		id: 'promote-current-note',
		name: 'Я повторил эту заметку (Перейти на следующий этап)',
		editorCallback: async (editor, view) => {
			const file = view.file;
			if (file) {
				await service.promoteFile(file);
			}
		}
	});

	// Команда для ручного добавления заметки в систему (на случай, если не сработало авто)
	plugin.addCommand({
		id: 'mark-for-review',
		name: 'Начать повторять эту заметку',
		editorCallback: async (editor, view) => {
			const file = view.file;
			if (file) {
				await service.resetFile(file); // reset ставит stage 0 и next_review = сегодня
			}
		}
	});
}
