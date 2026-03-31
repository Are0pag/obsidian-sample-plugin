// example-view.tsx
import React, { StrictMode, useRef, useEffect } from 'react';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import {DraftSlateEditor, DraftSlateEditorRef} from "./comps/draft/Draft";


export const DRAFT_VIEW_TYPE = 'draft-view' as const;

export class DraftView extends ItemView {
	root: Root | null = null;
	editorRef: React.RefObject<DraftSlateEditorRef | null> = React.createRef();

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return DRAFT_VIEW_TYPE;
	}

	getDisplayText() {
		return 'draft view';
	}

	async onOpen() {
		this.root = createRoot(this.contentEl);

		// Компонент-обертка для доступа к ref
		const EditorWrapper = () => {
			return (
				<StrictMode>
					<DraftSlateEditor
						ref={this.editorRef}
						onChange={(text) => {
							console.log('Текст изменен:', text);
						}}
						placeholder="Введите текст или получите данные с сервера..."
					/>
				</StrictMode>
			);
		};

		this.root.render(<EditorWrapper />);
	}

	async onClose() {
		this.root?.unmount();
	}

	// Публичный метод для изменения текста извне
	setEditorText(text: string) {
		this.editorRef.current?.setText(text);
	}

	// Публичный метод для получения текста
	getEditorText(): string {
		return this.editorRef.current?.getText() || '';
	}

	// Публичный метод для вставки текста
	insertEditorText(text: string) {
		this.editorRef.current?.insertText(text);
	}

	// Публичный метод для очистки
	clearEditorText() {
		this.editorRef.current?.clearText();
	}


	// Публичный метод для фокуса
	focusEditor() {
		this.editorRef.current?.focus();
	}
}
