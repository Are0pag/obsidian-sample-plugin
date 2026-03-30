// comps/draft/DraftSlateEditor.tsx
import React, { useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import { createEditor, Descendant, BaseEditor } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history'; // npm install slate slate-react slate-history

// Типизация для Slate
type CustomElement = { type: 'paragraph'; children: CustomText[] };
type CustomText = { text: string };

declare module 'slate' {
	interface CustomTypes {
		Editor: BaseEditor & ReactEditor;
		Element: CustomElement;
		Text: CustomText;
	}
}

//  иногда родительскому компоненту нужно напрямую «приказать» дочернему что-то сделать (например, очистить поле или поставить фокус)
export interface DraftSlateEditorRef {
	setText: (text: string) => void;
	getText: () => string;
	insertText: (text: string) => void;
	clearText: () => void;
	focus: () => void;
}

// Начальное значение
const initialValue: Descendant[] = [
	{
		type: 'paragraph',
		children: [{ text: '' }],
	},
];

interface DraftSlateEditorProps {
	onChange?: (value: string) => void;
	placeholder?: string;
}

export const DraftSlateEditor = forwardRef<DraftSlateEditorRef, DraftSlateEditorProps>(
	(props, ref) => {
		const { onChange, placeholder = 'Начните вводить текст...' } = props;

		// Создаем редактор с историей и React-привязкой
		const editor = useMemo(() => withHistory(withReact(createEditor())), []);

		// Функция для преобразования текста в формат Slate
		const textToSlateValue = useCallback((text: string): Descendant[] => {
			const paragraphs = text.split('\n').map(line => ({
				type: 'paragraph' as const,
				children: [{ text: line }],
			}));
			return paragraphs.length ? paragraphs : initialValue;
		}, []);

		// Функция для преобразования Slate в текст
		const slateToText = useCallback((nodes: Descendant[]): string => {
			return nodes
				.map(node => {
					if ('children' in node && node.children) {
						return node.children.map(child => child.text).join('');
					}
					return '';
				})
				.join('\n');
		}, []);

		// Публичные методы через ref
		useImperativeHandle(ref, () => ({
			setText: (text: string) => {
				const slateValue = textToSlateValue(text);
				editor.children = slateValue;
				editor.onChange();
				onChange?.(text);
			},

			getText: () => {
				return slateToText(editor.children);
			},

			insertText: (text: string) => {
				editor.insertText(text);
				onChange?.(slateToText(editor.children));
			},

			clearText: () => {
				editor.children = initialValue;
				editor.onChange();
				onChange?.('');
			},

			focus: () => {
				ReactEditor.focus(editor);
			},
		}));

		// Обработчик изменений
		const handleChange = useCallback((newValue: Descendant[]) => {
			const text = slateToText(newValue);
			onChange?.(text);
		}, [onChange, slateToText]);

		return (
			<div style={{
				border: '1px solid #ccc',
				borderRadius: '4px',
				padding: '8px',
				minHeight: '200px',
				backgroundColor: 'var(--background-primary)'
			}}>
				<Slate editor={editor} initialValue={initialValue} onChange={handleChange}>
					<Editable
						placeholder={placeholder}
						style={{
							minHeight: '180px',
							outline: 'none',
						}}
					/>
				</Slate>
			</div>
		);
	}
);

DraftSlateEditor.displayName = 'DraftSlateEditor';
