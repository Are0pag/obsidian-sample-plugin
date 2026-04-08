import {setHoverRange} from "./hover";
import {EditorView, ViewPlugin, ViewUpdate} from "@codemirror/view";
import { Transaction } from "@codemirror/state";
import {ScanMode, TextScanner} from "../scanning/scanner";
import {Distributor} from "../../fileManagers/distributor";
import {App, TFile} from "obsidian";
import {setHoverRefRange} from "./hoverRef";

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
	changeMode: {getMode: () => ScanMode, setMode: (mode: ScanMode) => void},
	isEnabled: () => boolean
) =>
	ViewPlugin.fromClass(class {
		constructor(readonly view: EditorView) {}

		public currentRange: { from: number, to: number } | null = null;
		currentPos: number | null = null;
		mergedRanges: Array<TextRange> = [];
		isChangeModeOnStartR = false;
		isCPressed = false;
		isRPressed = false;
		isMPressed = false;

		dragState: DragState = {
			isDragging: false,
			sourceRange: null,
			sourceText: '',
			startPos: { x: 0, y: 0 }
		};

		getCurrentContext(view: EditorView, event: MouseEvent) {
			const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
			if (pos == null) {
				view.dispatch({ effects: setHoverRange.of(null) });
				return null;
			}
			this.currentPos = pos;

			const range = scanner.getRange(view.state, pos, changeMode.getMode());
			// Защита: если range.from === range.to, считаем что диапазона нет
			const validRange = range && range.to > range.from ? range : null;
			if (validRange)
				return validRange;
			return null;
		}

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

		applyTextMerging(view: EditorView) {
			const changes = [];
			// Итерируемся по промежуткам МЕЖДУ накопленными диапазонами
			for (let i = 0; i < this.mergedRanges.length - 1; i++) {
				const endOfCurrent = this.mergedRanges[i]?.to;
				const startOfNext = this.mergedRanges[i + 1]?.from;

				if (startOfNext && endOfCurrent && startOfNext > endOfCurrent) {
					// Решаем, нужен ли пробел: берем символы на границах
					const charBefore = view.state.sliceDoc(endOfCurrent - 1, endOfCurrent);
					const charAfter = view.state.sliceDoc(startOfNext, startOfNext + 1);

					// Если между ними нет пробела в исходном тексте, добавляем его
					const needsSpace = /\S/.test(charBefore) && /\S/.test(charAfter);
					const insertText = needsSpace ? " " : "";

					changes.push({
						from: endOfCurrent,
						to: startOfNext,
						insert: insertText
					});
				}
			}

			if (changes.length > 0) {
				view.dispatch({
					changes,
					annotations: Transaction.userEvent.of("merge-ranges")
				});
			}

			// Сброс состояния
			this.mergedRanges = [];
			this.currentRange = null;
			view.dispatch({ effects: setHoverRange.of(null) });
		}

		fixSpacesAtPosition(view: EditorView) {
			const state = view.state;
			const pos = this.view.state.selection.main.head;

			const textBefore = state.sliceDoc(Math.max(0, pos - 100), pos);
			const leftMatch = textBefore.match(/[.!?]\s+$/);
			if (!leftMatch) return; // Если слева не конец предложения, выходим

			const leftBoundary = pos - leftMatch[0].length + 1; // Позиция сразу ПОСЛЕ знака препинания

			const textAfter = state.sliceDoc(pos, Math.min(state.doc.length, pos + 100));
			const rightMatch = textAfter.match(/^\s+[\p{Lu}]/u);
			if (!rightMatch) return; // Если справа не начало с заглавной, выходим

			const rightBoundary = pos + rightMatch[0].length - 1; // Позиция ПЕРЕД заглавной буквой

			const spacesBetween = state.sliceDoc(leftBoundary, rightBoundary);

			if (spacesBetween.length > 1) {
				view.dispatch({
					changes: {
						from: leftBoundary,
						to: rightBoundary,
						insert: " "
					},
					userEvent: "plugin.fix-spaces"
				});
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
				view.dispatch({
					changes: [
						// Удаляем исходный перетаскиваемый текст
						{ from: this.dragState.sourceRange.from, to: this.dragState.sourceRange.to, insert: "" },
						// Вставляем ссылку на месте цели
						{ from: targetRange.from, to: targetRange.to, insert: `[[${result.fileName}]]` }
					]
				});
			}
			this.dragState.isDragging = false;
			this.dragState.sourceRange = null;
			this.cancelR(view);
		}

		cancelR(view: EditorView) {
			const ghost = document.getElementById('drag-ghost');
			if (ghost) ghost.remove();
			view.contentDOM.style.cursor = '';  // Теперь view доступен
			this.dragState.isDragging = false;
			this.isRPressed = false;
			this.isChangeModeOnStartR = false;
			changeMode.setMode(ScanMode.Sentence);
			setTimeout(() => this.fixSpacesAtPosition(this.view), 100);
		}

	}, {
		eventHandlers: {
			mousemove(event: MouseEvent, view: EditorView) {
				if (!isEnabled()) return;
				const validRange = this.getCurrentContext(view, event);
				if (!validRange) return;

				if (this.isRPressed && this.dragState.isDragging && validRange) {
					if (!this.isChangeModeOnStartR) {
						this.isChangeModeOnStartR = true;
						changeMode.setMode(ScanMode.Word);
					}

					event.preventDefault();
					this.updateDragGhost(event.clientX, event.clientY);
					view.dispatch({ effects: setHoverRefRange.of(validRange) });
					return;
				}
				else {
					view.dispatch({ effects: setHoverRefRange.of(null) });
				}

				if (this.isMPressed && validRange) {
					if (this.mergedRanges.length < 1 /* !this.currentRange */) {
						this.currentRange = validRange;
						this.mergedRanges = [validRange];
					} else {
						// Проверяем, что этот диапазон мы еще не добавляли
						const lastRange = this.mergedRanges[this.mergedRanges.length - 1];
						if (!lastRange || !this.currentRange) return;
						if (validRange.from > lastRange.to) {
							this.mergedRanges.push(validRange);
							this.currentRange = { from: this.currentRange.from, to: validRange.to };
							view.dispatch({ effects: setHoverRange.of(this.currentRange) });
						}
					}
					return;
				}

				this.currentRange = validRange;

				if (this.isCPressed && validRange) {
					this.applyTextCleanup(view, validRange);
				} else {
					view.dispatch({ effects: setHoverRange.of(validRange) }); // Обычная подсветка
				}
			},

			keydown(event: KeyboardEvent, view: EditorView) {
				if (!isEnabled()) return false;

				if (event.key.toLowerCase() === "c" || event.key.toLowerCase() === "с") {
					this.isCPressed = true;
					if (this.currentRange) {
						event.preventDefault();
						this.applyTextCleanup(view, this.currentRange);
						this.fixSpacesAtPosition(this.view);
						return true;
					}
				}

				if (event.key.toLowerCase() === "r" || event.key.toLowerCase() === "к") {
					// Если мы УЖЕ в процессе драга или под курсором есть текст для начала драга
					if (!this.isRPressed && this.dragState.isDragging || this.currentRange) {
						this.isRPressed = true;
						event.preventDefault();
						return true;
					}
				}

				if ((event.key.toLowerCase() === "m" || event.key.toLowerCase() === "ь")) {
					this.isMPressed = true;
					return true;
				}

				if (event.key.toLowerCase() === "s" || event.key.toLowerCase() === "ы") {
					if (this.isRPressed)
						changeMode.setMode(ScanMode.Sentence);
					return true;
				}

				if (event.key.toLowerCase() === "w" || event.key.toLowerCase() === "ц") {
					if (this.isRPressed)
						changeMode.setMode(ScanMode.Word);
					return true;
				}
				return false;
			},

			keyup(event: KeyboardEvent, view: EditorView) {
				if (event.key.toLowerCase() === "c" || event.key.toLowerCase() === "с") {
					this.isCPressed = false;
				}

				if (event.key.toLowerCase() === "r" || event.key.toLowerCase() === "к") {
					this.isRPressed = false;
					if (this.dragState.isDragging) {
						this.cancelR(view);
					}
				}

				if ((event.key.toLowerCase() === "m" || event.key.toLowerCase() === "ь")) {
					this.isMPressed = false;
					if (this.mergedRanges.length < 2) return;
					this.applyTextMerging(view);
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

					const range = scanner.getRange(view.state, pos, changeMode.getMode());
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
						const targetRange = scanner.getRange(view.state, pos, changeMode.getMode());
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
			},

			blur(event: FocusEvent, view: EditorView) {
				// При потере фокуса окна сбрасываем всё состояние
				if (this.dragState.isDragging) {
					this.cancelR(view);
				}
				this.isRPressed = false;
				this.isCPressed = false;
				this.isMPressed = false;

				// Опционально: скрываем подсветку
				view.dispatch({ effects: setHoverRange.of(null) });
				view.dispatch({ effects: setHoverRefRange.of(null) });
			},
		}
	});
