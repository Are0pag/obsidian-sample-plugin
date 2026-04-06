import {CodeScanOptions} from "../../core/codeScanOptions";

export class StatusBarCodeScanOptions {
	private selectEl: HTMLSelectElement;

	constructor(statusBarItem: HTMLElement, currentMode: string, onChange: (val: string) => Promise<void>) {
		this.selectEl = statusBarItem.createEl("select", { cls: "status-bar-item-select" });

		// Стили...
		this.selectEl.style.backgroundColor = "transparent";
		this.selectEl.style.color = "var(--text-muted)";

		// Заполнение
		Object.values(CodeScanOptions).forEach((value) => {
			const option = this.selectEl.createEl("option", { text: value, value: value });
		});

		// Устанавливаем текущее значение из настроек
		this.selectEl.value = currentMode;

		this.selectEl.addEventListener("change", async () => {
			await onChange(this.selectEl.value);
		});
	}

	// Метод для обновления селекта извне (если изменили в настройках)
	public updateValue(value: string) {
		this.selectEl.value = value;
	}
}
