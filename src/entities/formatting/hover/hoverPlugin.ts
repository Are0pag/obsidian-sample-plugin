import {setHoverRange} from "./hover";
import {EditorView, ViewPlugin, ViewUpdate} from "@codemirror/view";
import {ScanMode, TextScanner} from "../scanning/scanner";

type Range = {
	from: number;
	to: number;
}

// Замыкание (Closure) — это способность функции «помнить» переменные из того места,
// 	где она была создана, даже после того, как внешняя функция завершила работу.
export const hoverPlugin = (
	scanner: TextScanner,
	getMode: () => ScanMode,
	textReadinessCallback: (parts: string[]) => void, //(намеренно не ждём) Promise<void>,
	isEnabled: () => boolean
) =>
	ViewPlugin.fromClass(class {
		constructor(readonly view: EditorView) {}

		public currentRange: { from: number, to: number } | null = null;
		currentPos: number | null = null;
		//lastRange: {from: number, to: number} | null = null;
		lastSelectionAnchor: number | null = null;

		// для ручного указания границ части текста
		update(update: ViewUpdate) {
			if (!isEnabled()) return;
			// 1. Проверяем, изменилось ли выделение
			if (update.selectionSet) {
				// 2. Ищем транзакцию, вызванную именно мышью (pointer)
				const isMouseClick = update.transactions.some(tr =>
					tr.isUserEvent("select.pointer") || tr.isUserEvent("input.mouse")
				);

				if (isMouseClick) {
					// Только если кликнули мышкой, обновляем наш кеш
					this.lastSelectionAnchor = update.state.selection.main.anchor;
				}
			}
		}
	}, {
		eventHandlers: {
			mousemove(event: MouseEvent, view: EditorView) {
				if (!isEnabled()) return;
				// Превращаем координаты мыши в позицию в тексте
				const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
				if (pos == null) {
					view.dispatch({ effects: setHoverRange.of(null) });
					return;
				}

				const range = scanner.getRange(view.state, pos, getMode());

				view.dispatch({
					effects: setHoverRange.of(range),
					//selection: range ? { anchor: range.from } : undefined
				});
				this.currentPos = pos;
				this.currentRange = range;
				//this.lastSelectionAnchor = range ? range.from : null;
			},

			mouseleave(event: MouseEvent, view: EditorView) {
				// Снимаем подсветку, когда мышь уходит из окна редактора
				view.dispatch({ effects: setHoverRange.of(null) });
				this.currentRange = null;
			},

			mousedown(event: MouseEvent, view: EditorView) {
				if (!isEnabled()) return;
				// Пример реализации удаления: клик с зажатым Ctrl/Cmd
				if (event.ctrlKey || event.metaKey) {
					const pos = this.currentPos;
					if (pos == null) return;

					if (this.currentRange) {
						event.preventDefault();

						// Удаляем текст в найденном диапазоне
						view.dispatch({
							changes: { from: this.currentRange.from, to: this.currentRange.to, insert: "" }
						});
					}
				}

				if (event.altKey) {
					const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
					if (pos == null) {
						view.dispatch({ effects: setHoverRange.of(null) });
						return;
					}

					const range = scanner.getRange(view.state, pos, getMode());
					if (range === null) return;
					view.dispatch({
						effects: setHoverRange.of(range),
						selection: range ? { anchor: range.from } : undefined
					});

					const firstPart = view.state.sliceDoc(range.from, pos);
					const lastPart = view.state.sliceDoc(pos, range.to);
					textReadinessCallback([firstPart, lastPart]);
				}
			},

			keydown(event: KeyboardEvent, view: EditorView) {
				if (!isEnabled()) return false; // Разрешаем стандартный ввод, если плагин выключен

				if (this.currentRange) {
					switch (event.key) {
						case "c":
						case "с": { // Блок { } нужен, чтобы переменные не конфликтовали с другими case
							event.preventDefault();
							const { from, to } = this.currentRange;
							const oldText = view.state.sliceDoc(from, to);

							// Ищем заглавную, если нет — любую букву
							let firstIdx = oldText.search(/[A-ZА-ЯЁ]/);
							if (firstIdx === -1) {
								firstIdx = oldText.search(/[a-zа-яё]/i);
							}

							const newText = firstIdx !== -1 ? oldText.slice(firstIdx) : "";

							if (newText !== oldText) {
								view.dispatch({
									changes: { from, to, insert: newText },
									// Обновляем визуальную подсветку сразу в этой же транзакции
									effects: setHoverRange.of(newText ? { from, to: from + newText.length } : null)
								});

								// Обновляем состояние плагина, чтобы он "помнил" новый диапазон
								this.currentRange = newText
									? { from, to: from + newText.length }
									: null;
							}
							return true;
						}

					}
				}

				return false; // Важно: разрешаем стандартную обработку для всех остальных случаев
			},
		}
	});
