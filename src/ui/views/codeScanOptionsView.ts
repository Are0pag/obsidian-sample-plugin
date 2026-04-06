import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_ENUM_PANEL = "code-scan-options-view";

export class CodeScanOptionsVies extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() { return VIEW_TYPE_ENUM_PANEL; }
    getDisplayText() { return "Enum Selector"; }
    getIcon() { return "list"; } // Иконка из библиотеки Lucide

    async onOpen() {
        const container = this.containerEl.children[1];
		if (container === undefined) {
			console.error("container is null");
			return;
		}
        container.empty();
        container.createEl("h6", { text: "Выберите опцию:" });

        // Создаем выпадающий список (Enum)
        const selectEl = container.createEl("select");
        selectEl.style.width = "100%";

        const options = ["Опция 1", "Опция 2", "Опция 3"];
        options.forEach(opt => {
            const option = selectEl.createEl("option", { text: opt });
            option.value = opt;
        });

        // Обработка выбора
        selectEl.addEventListener("change", (e) => {
            const value = (e.target as HTMLSelectElement).value;
            console.log("Выбрано:", value);
            // Здесь ваша логика (например, запись в файл или state)
        });
    }
}
