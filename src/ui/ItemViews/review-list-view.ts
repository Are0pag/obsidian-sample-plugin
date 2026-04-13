import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import {ReviewInfo, SpacedRepetitionService} from "../../SR/spaced-repetition-service";

export const REVIEW_VIEW_TYPE = 'ebbinghaus-review-view';

export class ReviewListView extends ItemView {
	private service: SpacedRepetitionService;
	private activeFilePath: string | null = null;
	private renderedItems: Map<string, HTMLElement> = new Map();
	private list: HTMLUListElement;

	constructor(leaf: WorkspaceLeaf, service: SpacedRepetitionService) {
		super(leaf);
		this.service = service;
		this.service.onCacheUpdate = () => {
			this.render();
		};
	}

	getViewType(): string {
		return REVIEW_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Повторение (Эббингауз)';
	}

	getIcon(): string {
		return 'brain'; // Иконка в боковой панели
	}

	async onOpen() {
		this.containerEl = this.contentEl.createDiv({ cls: 'review-list-container' });
		this.list = this.containerEl.createEl('ul', {cls: 'review-list'});
		this.render();

		// Обновление списка каждую минуту (или при фокусе/изменении файла)
		//this.registerInterval(window.setInterval(() => this.render(), 60000));

		// Отслеживание активного файла
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				this.updateActiveFile();
				this.render();
			})
		);

		this.updateActiveFile();
	}

	private updateActiveFile() {
		const activeFile = this.app.workspace.getActiveFile();
		this.activeFilePath = activeFile?.path ?? null;
	}

	public render() {
		const dueFiles = this.service.getDueFiles();

		if (dueFiles.length === 0) {
			this.contentEl.empty();
			return;
		}

		const newPaths = new Set(dueFiles.map(info => info.file.path));
		for (const [path, el] of this.renderedItems) {
			if (!newPaths.has(path)) {
				el.remove();
				this.renderedItems.delete(path);
			}
		}

		dueFiles.forEach((info, index) => {
			const path = info.file.path;
			const existingEl = this.renderedItems.get(path);

			if (existingEl) {
				existingEl.toggleClass('is-active', path === this.activeFilePath);
			} else {
				const newEl = this.list.createEl('li', {cls: 'review-item'});
				if (path === this.activeFilePath) {
					newEl.addClass('is-active');
				}
				this.createLink(newEl, info.file);
				this.renderedItems.set(path, newEl);
			}
		});
	}


	/**
	 * Ссылка на заметку (открывается в активной вкладке, контекст не теряется!)
	 */
	private createLink(item: HTMLLIElement, file: TFile) {
		const link = item.createEl('span', {
			text: file.basename,
			cls: 'review-link' // свой класс вместо internal-link
		});

		link.addEventListener('click', async (e) => {
			e.preventDefault();
			e.stopPropagation();

			await this.app.workspace.openLinkText(
				file.path,
				'',         // пустая строка = открыть в активном листе
				false       // не создавать новую вкладку, использовать текущую
			);
		});
	}
}
