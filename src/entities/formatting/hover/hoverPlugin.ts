import {setHoverRange} from "./hover";
import {EditorView, ViewPlugin, ViewUpdate} from "@codemirror/view";
import {ScanMode, TextScanner} from "../scanning/scanner";
import {Distributor} from "../../fileManagers/distributor";

type Range = {
	from: number;
	to: number;
}

// Замыкание (Closure) — это способность функции «помнить» переменные из того места,
// 	где она была создана, даже после того, как внешняя функция завершила работу.
export const hoverPlugin = (
	scanner: TextScanner,
	distributor: Distributor,
	getMode: () => ScanMode,
	//textReadinessCallback: (parts: string[]) => void, //(намеренно не ждём) Promise<void>,
	isEnabled: () => boolean
) =>
	ViewPlugin.fromClass(class {
		constructor(readonly view: EditorView) {}

		public currentRange: { from: number, to: number } | null = null;
		currentPos: number | null = null;
		//lastRange: {from: number, to: number} | null = null;
		lastSelectionAnchor: number | null = null;
		isCPressed = false;

		applyTextCleanup(view: EditorView, range: { from: number, to: number }) {
			const oldText = view.state.sliceDoc(range.from, range.to);

			let firstIdx = oldText.search(/[A-ZА-ЯЁ]/);
			if (firstIdx === -1) {
				firstIdx = oldText.search(/[a-zа-яё]/i);
			}

			const newText = firstIdx !== -1 ? oldText.slice(firstIdx) : "";

			if (newText !== oldText) {
				const newTo = range.from + newText.length;
				view.dispatch({
					changes: { from: range.from, to: range.to, insert: newText },
					effects: setHoverRange.of(newText ? { from: range.from, to: newTo } : null)
				});

				// Обновляем текущий диапазон, так как текст укоротился
				this.currentRange = newText ? { from: range.from, to: newTo } : null;
			}
		}

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

				const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
				if (pos == null) {
					view.dispatch({ effects: setHoverRange.of(null) });
					return;
				}

				const range = scanner.getRange(view.state, pos, getMode());
				this.currentPos = pos;
				this.currentRange = range;

				// ЛОГИКА "РИСОВАНИЯ": если 'c' зажата и мы нашли диапазон под мышкой
				if (this.isCPressed && range) {
					this.applyTextCleanup(view, range);
				} else {
					// Обычная подсветка
					view.dispatch({ effects: setHoverRange.of(range) });
				}
			},

			keydown(event: KeyboardEvent, view: EditorView) {
				if (!isEnabled()) return false;

				if (event.key.toLowerCase() === "c" || event.key.toLowerCase() === "с") {
					this.isCPressed = true;

					// Если уже наведены на что-то, применяем сразу при нажатии
					if (this.currentRange) {
						event.preventDefault();
						this.applyTextCleanup(view, this.currentRange);
						return true;
					}
				}
				return false;
			},

			keyup(event: KeyboardEvent) {
				if (event.key.toLowerCase() === "c" || event.key.toLowerCase() === "с") {
					this.isCPressed = false;
				}
			},

			mouseleave(event: MouseEvent, view: EditorView) {
				view.dispatch({ effects: setHoverRange.of(null) });
				this.currentRange = null;
				// На всякий случай сбрасываем флаг, если мышь ушла, а keyup не сработал
				this.isCPressed = false;
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
					distributor.insert([firstPart, lastPart]);
					//textReadinessCallback([firstPart, lastPart]);
				}
			},
		}
	});
