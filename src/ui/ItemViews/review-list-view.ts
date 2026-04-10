import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import {SpacedRepetitionService} from "../../SR/spaced-repetition-service";

export const REVIEW_VIEW_TYPE = 'ebbinghaus-review-view';

export class ReviewListView extends ItemView {
	private service: SpacedRepetitionService;

	constructor(leaf: WorkspaceLeaf, service: SpacedRepetitionService) {
		super(leaf);
		this.service = service;
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
		this.render();

		// Обновление списка каждую минуту (или при фокусе/изменении файла)
		this.registerInterval(window.setInterval(() => this.render(), 60000));
	}

	private render() {
		this.containerEl.empty();
		const dueFiles = this.service.getDueFiles();

		if (dueFiles.length === 0) {
			this.containerEl.createEl('div', {
				text: '🎉 Нет заметок для повторения',
				cls: 'review-empty'
			});
			return;
		}

		const list = this.containerEl.createEl('ul', { cls: 'review-list' });

		dueFiles.forEach(file => {
			const item = list.createEl('li', { cls: 'review-item' });

			// Ссылка на заметку (открывается в активной вкладке, контекст не теряется!)
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

			// Кнопка "Повторил" (переводит на следующий этап)
			const doneBtn = item.createEl('button', {
				text: '✓',
				cls: 'review-done-btn'
			});
			doneBtn.onclick = async (e) => {
				e.preventDefault();
				e.stopPropagation();
				await this.service.promoteFile(file);
				this.render(); // Перерисовать список

				// Маленький бонус: уведомление, которое не перекрывает интерфейс
				// или можно просто убрать строку из списка
			};

			// Кнопка "Сбросить" (опционально, если забыл)
			const resetBtn = item.createEl('button', {
				text: '↺',
				cls: 'review-reset-btn'
			});
			resetBtn.onclick = async (e) => {
				e.preventDefault();
				e.stopPropagation();
				await this.service.resetFile(file);
				this.render();
			};
		});
	}
}
