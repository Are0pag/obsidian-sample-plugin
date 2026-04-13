import { TFile, Vault, MetadataCache, FrontMatterCache } from 'obsidian';

interface ReviewInfo {
	file: TFile;
	stage: number;
	nextReview: string;
	reviewed: string;
}

export class SpacedRepetitionService {
	private vault: Vault;
	private metadataCache: MetadataCache;
	private intervals: number[] = [1, 3, 7, 14, 30];

	private allFilesCache: Map<string, ReviewInfo> = new Map(); // все заметки, наблюдаемые плагином
	private dueFilesCache: ReviewInfo[] = []; // заметки для текущего повторения
	private cacheValid = false;

	constructor(vault: Vault, metadataCache: MetadataCache) {
		this.vault = vault;
		this.metadataCache = metadataCache;

		// Подписываемся на изменения файлов
		this.registerEvents();

		// Первоначальное построение кэша
		this.rebuildCache();
	}

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
			//console.log("Next Review Value:", nextReview, "Type:", typeof nextReview);
			if (nextReview && nextReview <= today) {
				files.push(file);
			}
		}
		return files;
	}

	/**
	 * Перевести заметку на следующий этап
	 */
	async promoteFile(file: TFile): Promise<void> {
		const cache = this.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;

		if (!frontmatter) return;

		const currentStage = frontmatter['stage'] || 0;
		const nextStage = currentStage + 1;
		const today = this.getTodayStr();
		const nextReviewDate = this.calculateNextReviewDate(nextStage);

		await this.vault.process(file, (data) => {
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



	private registerEvents(): void {
		this.metadataCache.on('changed', (file) => {
			this.invalidateFile(file);
		});

		this.vault.on('rename', (file) => {
			if (file instanceof TFile) {
				this.invalidateFile(file);
			}
		});

		this.vault.on('delete', (file) => {
			if (file instanceof TFile) {
				this.allFilesCache.delete(file.path);
				this.cacheValid = false;
			}
		});

		this.vault.on('create', (file) => {
			if (file instanceof TFile) {
				this.indexFile(file);
				this.cacheValid = false;
			}
		});
	}

	private indexFile(file: TFile): ReviewInfo | null {
		const metadata = this.metadataCache.getFileCache(file);
		const frontmatter = metadata?.frontmatter;

		// Проверяем, есть ли нужные поля
		if (frontmatter && typeof frontmatter.stage === 'number') {
			const info: ReviewInfo = {
				file,
				stage: frontmatter.stage,
				nextReview: frontmatter.next_review || this.getTodayStr(),
				reviewed: frontmatter.reviewed || ''
			};
			this.allFilesCache.set(file.path, info);
			return info;
		}

		//this.allFilesCache.delete(file.path); - макс. идиотский сценарий, так что пусть лучшая оптимизация
		return null;
	}

	private invalidateFile(file: TFile): void {
		const info = this.indexFile(file);
		this.cacheValid = false; // Проще инвалидировать весь кэш dueFiles

		// Можно emit событие для UI
		this.onCacheUpdate?.();
	}

	private rebuildCache(): void {
		this.allFilesCache.clear();
		const markdownFiles = this.vault.getMarkdownFiles();

		for (const file of markdownFiles) {
			this.indexFile(file);
		}

		this.updateDueFilesCache();
	}

	private updateDueFilesCache(): void {
		const today = this.getTodayStr();

		this.dueFilesCache = Array.from(this.allFilesCache.values())
			.filter(info => {
				// Заметка требует повторения, если nextReview <= today
				return info.nextReview <= today;
			})
			.sort((a, b) => a.nextReview.localeCompare(b.nextReview));

		this.cacheValid = true;
	}

	onCacheUpdate?: () => void;


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
