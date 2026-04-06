import { Menu, Plugin } from "obsidian";
import {CodeScanOptions} from "../../core/codeScanOptions";

export interface ScanSettings {
	currentMode: string;
	modes: string[];
	onModeChange: (newMode: string) => Promise<void>;
}

export class StatusBarCodeScanOptions {
	private selectEl: HTMLSelectElement;

	constructor(statusBarItem: HTMLElement) {
		// Создаем обертку и сам селект
		this.selectEl = statusBarItem.createEl("select", {
			cls: "status-bar-item-select"
		});

		// Стилизуем, чтобы он выглядел аккуратно в статус-баре
		this.selectEl.style.backgroundColor = "transparent";
		this.selectEl.style.border = "none";
		this.selectEl.style.color = "var(--text-muted)";
		this.selectEl.style.cursor = "pointer";

		// Заполняем опциями из Enum
		(Object.entries(CodeScanOptions) as [string, string][]).forEach(([key, value]) => {
			const option = this.selectEl.createEl("option", {
				text: value,
				value: value,
			});
		});

		// Слушаем изменения
		this.selectEl.addEventListener("change", () => {
			console.log("Selected:", this.selectEl.value);
		});
	}

	public getValue(): string {
		return this.selectEl.value;
	}
}
