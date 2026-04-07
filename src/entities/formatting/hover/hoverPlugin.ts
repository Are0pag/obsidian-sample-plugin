import {setHoverRange} from "./hover";
import {EditorView, ViewPlugin, ViewUpdate} from "@codemirror/view";
import {ScanMode, TextScanner} from "../scanning/scanner";
import {Distributor} from "../../fileManagers/distributor";
import {App, TFile} from "obsidian";

interface DragState {
	isDragging: boolean;
	sourceRange: { from: number, to: number } | null;
	sourceText: string;
	startPos: { x: number, y: number };
}

export const hoverPlugin = (
	app: App,
	scanner: TextScanner,
	distributor: Distributor,
	getMode: () => ScanMode,
	isEnabled: () => boolean
) =>
	ViewPlugin.fromClass(class {
		constructor(readonly view: EditorView) {}

		public currentRange: { from: number, to: number } | null = null;
		currentPos: number | null = null;
		lastSelectionAnchor: number | null = null;
		isCPressed = false;
		isRPressed = false;

		dragState: DragState = {
			isDragging: false,
			sourceRange: null,
			sourceText: '',
			startPos: { x: 0, y: 0 }
		};

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

		startDrag(view: EditorView, range: { from: number, to: number }, event: MouseEvent) {
			const sourceText = view.state.sliceDoc(range.from, range.to);

			this.dragState = {
				isDragging: true,
				sourceRange: range,
				sourceText: sourceText,
				startPos: { x: event.clientX, y: event.clientY }
			};

			// Меняем курсор для визуальной обратной связи
			view.contentDOM.style.cursor = 'grabbing';

			// Показываем "призрак" перетаскиваемого текста
			this.showDragGhost(sourceText, event.clientX, event.clientY);
		}

		showDragGhost(text: string, x: number, y: number) {
			const ghost = document.createElement('div');
			ghost.id = 'drag-ghost';
			ghost.textContent = text.length > 50 ? text.slice(0, 47) + '...' : text;
			ghost.style.cssText = `
		       position: fixed;
		       left: ${x + 10}px;
		       top: ${y + 10}px;
		       background: var(--background-modifier-hover);
		       border: 1px solid var(--interactive-accent);
		       border-radius: 4px;
		       padding: 4px 8px;
		       font-size: 12px;
		       pointer-events: none;
		       z-index: 1000;
		       opacity: 0.8;
		       box-shadow: 0 2px 8px rgba(0,0,0,0.2);
	       `;
			document.body.appendChild(ghost);
		}

		updateDragGhost(x: number, y: number) {
			const ghost = document.getElementById('drag-ghost');
			if (ghost) {
				ghost.style.left = `${x + 10}px`;
				ghost.style.top = `${y + 10}px`;
			}
		}

		async finishDrag(view: EditorView, targetRange: { from: number, to: number } | null, targetWord: string) {
			const ghost = document.getElementById('drag-ghost');
			if (ghost) ghost.remove();

			// Восстанавливаем курсор
			view.contentDOM.style.cursor = '';

			if (!this.dragState.isDragging || !this.dragState.sourceRange || !targetRange) {
				this.dragState.isDragging = false;
				return;
			}

			const result = await distributor.createReference(
				targetRange,
				this.dragState.sourceText,
				targetWord
			);

			if (result.success) {
				const can = confirm("Удалить исходный текст?");
				if (can) {
					view.dispatch({
						changes: {
							from: this.dragState.sourceRange!.from,
							to: this.dragState.sourceRange!.to,
							insert: ""
						}
					});
				}
			}
			this.dragState.isDragging = false;
			this.dragState.sourceRange = null;
		}

		cancelR(view: EditorView) {
			const ghost = document.getElementById('drag-ghost');
			if (ghost) ghost.remove();
			view.contentDOM.style.cursor = '';  // Теперь view доступен
			this.dragState.isDragging = false;
			this.isRPressed = false;
		}

	}, {
		eventHandlers: {
			mousemove(event: MouseEvent, view: EditorView) {
				if (!isEnabled()) return;

				// Если идет перетаскивание, обновляем позицию призрака
				if (this.isRPressed && this.dragState.isDragging) {
					this.updateDragGhost(event.clientX, event.clientY);
					event.preventDefault();
					return;
				}

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
					if (this.currentRange) {
						event.preventDefault();
						this.applyTextCleanup(view, this.currentRange);
						return true;
					}
				}

				if ((event.key.toLowerCase() === "r" || event.key.toLowerCase() === "к") && this.currentRange) {
					this.isRPressed = true;
					event.preventDefault();
					return true;
				}

				return false;
			},

			keyup(event: KeyboardEvent, view: EditorView) {
				if (event.key.toLowerCase() === "c" || event.key.toLowerCase() === "с") {
					this.isCPressed = false;
				}

				if ((event.key.toLowerCase() === "r" || event.key.toLowerCase() === "к") && this.dragState.isDragging) {
					this.cancelR(view);
				}
			},

			mouseleave(event: MouseEvent, view: EditorView) {
				view.dispatch({ effects: setHoverRange.of(null) });
				this.currentRange = null;
				this.isCPressed = false;

				if (this.dragState.isDragging) {
					this.cancelR(view);
				}
			},

			mousedown(event: MouseEvent, view: EditorView) {
				if (!isEnabled()) return;

				if (this.isRPressed && this.currentRange) {
					event.preventDefault();
					this.startDrag(view, this.currentRange, event);
					return;
				}

				if (event.ctrlKey || event.metaKey) {
					const pos = this.currentPos;
					if (pos == null) return;

					if (this.currentRange) {
						event.preventDefault();
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
				}
			},

			mouseup(event: MouseEvent, view: EditorView) {
				if (!isEnabled()) return;

				if (this.dragState.isDragging && this.isRPressed) {
					event.preventDefault();

					// Получаем целевой диапазон под курсором
					const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
					if (pos) {
						const targetRange = scanner.getRange(view.state, pos, getMode());
						if (targetRange) {
							const targetWord = view.state.sliceDoc(targetRange.from, targetRange.to);
							this.finishDrag(view, targetRange, targetWord);
						} else {
							this.finishDrag(view, null, '');
						}
					} else {
						this.finishDrag(view, null, '');
					}

					this.isRPressed = false;
				}
			}
		}
	});
