import { App, Modal, Setting } from 'obsidian';

export class FromDraftModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;
	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "Настройки уведомления" });

		// Используем класс Setting для удобной верстки полей
		new Setting(contentEl)
			.setName("Введите текст")
			.addText((text) =>
				text.onChange((value) => {
					this.result = value;
				}));

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Сохранить")
					.setCta() // Делает кнопку акцентной (синей)
					.onClick(() => {
						this.close();
						this.onSubmit(this.result);
					}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
