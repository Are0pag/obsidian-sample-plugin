import { StateEffect, StateField } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";

// 1. Эффект для референсной подсветки (фиолетовой)
export const setHoverRefRange = StateEffect.define<{from: number, to: number} | null>();

// 2. Поле состояния для хранения фиолетовой подсветки
export const hoverRefField = StateField.define<DecorationSet>({
	create() { return Decoration.none; },
	update(underlines, tr) {
		// Обновляем позиции при изменении текста
		underlines = underlines.map(tr.changes);

		for (let e of tr.effects) {
			if (e.is(setHoverRefRange)) {
				if (e.value) {
					// Используем ваш новый CSS класс .cm-hover-highlight-ref
					underlines = Decoration.set([
						Decoration.mark({ class: "cm-hover-highlight-ref" }).range(e.value.from, e.value.to)
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
