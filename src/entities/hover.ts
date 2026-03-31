import { StateEffect, StateField } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";

// эффект подсветки
export const setHoverRange = StateEffect.define<{from: number, to: number} | null>();

// 2. Создаем "поле состояния" (хранилище)
// Оно следит за эффектом и хранит саму декорацию (подсветку)
export const hoverField = StateField.define({
	create() { return Decoration.none; },
	update(underlines, tr) {
		// Обновляем позиции при редактировании текста (чтобы подсветка не уплывала)
		underlines = underlines.map(tr.changes);

		for (let e of tr.effects) {
			if (e.is(setHoverRange)) {
				if (e.value) {
					// Создаем графическую декорацию
					underlines = Decoration.set([
						Decoration.mark({ class: "cm-hover-highlight" }).range(e.value.from, e.value.to)
					]);
				} else {
					underlines = Decoration.none;
				}
			}
		}
		return underlines;
	},
	provide: f => EditorView.decorations.from(f)
});
