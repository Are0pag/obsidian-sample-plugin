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
