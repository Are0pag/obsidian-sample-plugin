import { TFile, Vault, MetadataCache, FrontMatterCache } from 'obsidian';

export interface ReviewInfo {
	stage: number;
	reviewed: string; // YYYY-MM-DD
	nextReview: string | null;
}

// Интервалы в днях
//const Intervals = 1 | 3 | 7 | 14 | 30;

export class SpacedRepetitionService {
	private intervals: number[] = [1, 3, 7, 14, 30];

	constructor(
		private vault: Vault,
		private metadataCache: MetadataCache
	) {}

	/**
	 * Получить список файлов, которые нужно повторить сегодня
	 */
	getDueFiles(): TFile[] {
		const today = this.getTodayStr();
		const files: TFile[] = [];

		// Проходим по всем .md файлам в хранилище
		const allFiles = this.vault.getMarkdownFiles();

		for (const file of allFiles) {
			const metadata = this.metadataCache.getFileCache(file);
			const frontmatter = metadata?.frontmatter;

			if (!frontmatter) continue;

			// Если есть next_review и оно совпадает с сегодня или раньше (на случай если вчера не заходили)
			const nextReview = frontmatter['next_review'];
			if (nextReview && nextReview <= today) {
				files.push(file);
			}

			// Также добавляем заметки, у которых stage === 0 и прошло больше 1 дня с создания,
			// но next_review еще не проставлен (первичная инициализация).
			// Это сгладит переход при первом запуске плагина.
			if (frontmatter['stage'] === 0 && !nextReview) {
				const reviewed = frontmatter['reviewed'];
				if (reviewed && reviewed <= this.getDateStrDaysAgo(1)) {
					files.push(file);
				}
			}
		}

		return files;
	}

	/**
	 * Перевести заметку на следующий этап
	 */
	async promoteFile(file: TFile): Promise<void> {
		// Получаем уже распарсенный фронтматтер из кэша
		const cache = this.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;

		if (!frontmatter) return;

		const currentStage = frontmatter['stage'] || 0;
		const nextStage = currentStage + 1;
		const today = this.getTodayStr();
		const nextReviewDate = this.calculateNextReviewDate(nextStage);

		// Обновляем через process (как и было)
		await this.vault.process(file, (data) => {
			// А вот здесь парсить текст ВСЕ РАВНО придется,
			// потому что process работает с сырым текстом
			return this.updateFrontmatter(data, {
				stage: nextStage,
				reviewed: today,
				next_review: nextReviewDate
			});
		});
	}
	/**
	 * Сбросить прогресс заметки (если забыл)
	 */
	async resetFile(file: TFile): Promise<void> {
		await this.vault.process(file, (data) => {
			return this.updateFrontmatter(data, {
				stage: 0,
				reviewed: this.getTodayStr(),
				next_review: this.calculateNextReviewDate(1) // через 1 день
			});
		});
	}

	/**
	 * Вычислить дату следующего повторения
	 */
	private calculateNextReviewDate(stage: number): string {
		//if (stage <= 0) return this.getDateStrDaysAgo(1);

		let daysToAdd: number;
		if (stage <= this.intervals.length) {
			let number = this.intervals[stage];
			if (!number) throw new RangeError();
			daysToAdd = number;
		} else {
			daysToAdd = 90;
		}

		const date = new Date();
		date.setDate(date.getDate() + daysToAdd);
		let string = date.toISOString().split('T')[0];
		if (!string) throw new RangeError();
		return string;
	}

	private updateFrontmatter(data: string, updates: Record<string, any>): string {
		const match = data.match(/^---\n([\s\S]*?)\n---/);
		if (!match) {
			// Если фронтматтера нет, создаем его
			const newFm = `---\n${this.objToYaml(updates)}\n---\n`;
			return newFm + data;
		}

		const oldFm = match[1];
		let newFm = oldFm;

		Object.entries(updates).forEach(([key, value]) => {
			const regex = new RegExp(`^${key}:.*$`, 'm');
			const newLine = `${key}: ${value}`;
			if (!newFm) return;
			if (regex.test(newFm)) {
				newFm = newFm.replace(regex, newLine);
			} else {
				newFm += `\n${newLine}`;
			}
		});

		return data.replace(match[0], `---\n${newFm}\n---`);
	}

	private objToYaml(obj: Record<string, any>): string {
		return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join('\n');
	}

	private getTodayStr(): string {
		let date = new Date().toISOString().split('T')[0];
		if (!date)
			throw new Error("Не удалось сформировать строку даты");
		return date;
	}

	private getDateStrDaysAgo(days: number): string {
		const d = new Date();
		d.setDate(d.getDate() - days);

		const dateStr = d.toISOString().split('T')[0];
		if (!dateStr)
			throw new Error(`Не удалось вычислить дату для значения: ${days} дн. назад`);

		return dateStr;
	}
}
