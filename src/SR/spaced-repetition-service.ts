import {TFile, Vault, MetadataCache, FrontMatterCache, Notice} from 'obsidian';

export interface ReviewInfo {
	file: TFile;
	stage: number;
	nextReview: string;
	reviewed: string;
	diaryTime?: string; // HH:mm:ss из тега diary
}

export class SpacedRepetitionService {
	private vault: Vault;
	private metadataCache: MetadataCache;
	private intervals: number[] = [1, 3, 7, 14, 30];

	private allFilesCache: Map<string, ReviewInfo> = new Map(); // все заметки, наблюдаемые плагином
	private dueFilesCache: ReviewInfo[] = []; // заметки для текущего повторения
	private cacheValid = false;

	private today: string;

	constructor(vault: Vault, metadataCache: MetadataCache) {
		this.vault = vault;
		this.metadataCache = metadataCache;
		this.today = this.getTodayStr();

		this.registerEvents();
		this.rebuildCache();
	}

	/**
	 * Получить список файлов, которые нужно повторить сегодня
	 */
	getDueFiles(): ReviewInfo[] {
		if (!this.cacheValid) {
			this.updateDueFilesCache();
		}
		return this.dueFilesCache;
	}

	/**
	 * Перевести заметку на следующий этап
	 */
	async promoteFile(file: TFile): Promise<void> {
		const info = this.allFilesCache.get(file.path);
		if (!info) return;

		const nextStage = info.stage + 1;
		const nextReviewDate = this.calculateNextReviewDate(nextStage);
		const today = this.getTodayStr();

		await this.vault.process(file, (data) => {
			return this.updateFrontmatter(data, {
				stage: nextStage,
				reviewed: today,
				next_review: nextReviewDate
			});
		});

		const updatedInfo = this.indexFile(file);
		if (updatedInfo)
			this.dueFilesCache = this.dueFilesCache.filter(
				info => info.file.path !== file.path
			);

		this.cacheValid = true;
		this.onCacheUpdate?.();
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

	getFileInfo(file: TFile): ReviewInfo | null {
		return this.allFilesCache.get(file.path) || null;
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

	/**
	 * Доб/обновление данных о файле
	 * @param file
	 * @private
	 */
	private indexFile(file: TFile): ReviewInfo | null {
		const metadata = this.metadataCache.getFileCache(file);
		const frontmatter = metadata?.frontmatter;

		// Проверяем, есть ли нужные поля
		if (frontmatter && typeof frontmatter.stage === 'number') {
			const info: ReviewInfo = {
				file,
				stage: frontmatter.stage,
				nextReview: frontmatter.next_review || this.getTodayStr(),
				reviewed: frontmatter.reviewed || '',
				diaryTime: this.extractDiaryTime(frontmatter)
			};
			this.allFilesCache.set(file.path, info);

			if (frontmatter.next_review <= this.today)
				this.dueFilesCache.push(info);

			return info;
		}

		//this.allFilesCache.delete(file.path); - макс. идиотский сценарий, так что пусть лучшая оптимизация
		return null;
	}

	private invalidateFile(file: TFile): void {
		this.cacheValid = false;
		const info = this.indexFile(file);
		this.cacheValid = true;

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
		this.dueFilesCache = Array.from(this.allFilesCache.values())
			.filter(info => {
				// Заметка требует повторения, если nextReview <= today
				return info.nextReview <= this.today;
			})
			//.sort((a, b) => a.nextReview.localeCompare(b.nextReview));
			.sort((a, b) => {
				// 1. Сначала сравниваем по дате
				const dateCompare = a.nextReview.localeCompare(b.nextReview);
				if (dateCompare !== 0) {
					return dateCompare;
				}

				// 2. Если даты одинаковые — сортируем по времени из diary
				const timeA = a.diaryTime;
				const timeB = b.diaryTime;

				// Обе имеют время — сравниваем
				if (timeA && timeB) {
					const timeCompare = timeA.localeCompare(timeB);
					if (timeCompare !== 0) {
						return timeCompare;
					}
				}

				// 3. Если всё одинаково — по имени файла для стабильности
				return a.file.basename.localeCompare(b.file.basename);
			});

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

	private extractDiaryTime(frontmatter: FrontMatterCache) {
		if (frontmatter?.diary && typeof frontmatter.diary === 'string') {
			const timeMatch = frontmatter.diary.match(/(\d{2}:\d{2}:\d{2})/);
			if (timeMatch) {
				return timeMatch[1];
			}
		}

		new Notice("Have not dairy property");
		return;
		//throw new Error("Have not dairy property");
	}
}
