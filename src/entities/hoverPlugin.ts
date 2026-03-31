import {setHoverRange} from "./hover";
import {EditorView, ViewPlugin} from "@codemirror/view";
import {ScanMode, TextScanner} from "./scanner";

export const hoverPlugin = (scanner: TextScanner, getMode: () => ScanMode) =>
	ViewPlugin.fromClass(class {
		constructor(readonly view: EditorView) {}
	}, {
		eventHandlers: {
			mousemove(event: MouseEvent, view: EditorView) {
				// Превращаем координаты мыши в позицию в тексте
				const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });

				if (pos == null) {
					view.dispatch({ effects: setHoverRange.of(null) });
					return;
				}

				// Используем ваш класс TextScanner для расчета границ
				const range = scanner.getRange(view.state, pos, getMode());

				// Обновляем состояние (это заставит hoverField перерисовать подсветку)
				view.dispatch({ effects: setHoverRange.of(range) });
			},

			mouseleave(event: MouseEvent, view: EditorView) {
				// Снимаем подсветку, когда мышь уходит из окна редактора
				view.dispatch({ effects: setHoverRange.of(null) });
			},

			mousedown(event: MouseEvent, view: EditorView) {
				// Пример реализации удаления: клик с зажатым Ctrl/Cmd
				if (event.ctrlKey || event.metaKey) {
					const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
					if (pos == null) return;

					const range = scanner.getRange(view.state, pos, getMode());
					if (range) {
						// Предотвращаем стандартное выделение кликом
						event.preventDefault();

						// Удаляем текст в найденном диапазоне
						view.dispatch({
							changes: { from: range.from, to: range.to, insert: "" }
						});
					}
				}
			}
		}
	});
