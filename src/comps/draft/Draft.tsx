// comps/draft/DraftSlateEditor.tsx
import React, {forwardRef, useCallback, useImperativeHandle, useMemo} from 'react';
import {BaseEditor, createEditor, Descendant, Transforms} from 'slate';
import {Editable, ReactEditor, Slate, withReact} from 'slate-react';
import {withHistory} from 'slate-history';
import {slateToText, textToSlateValue} from "../../utils/slateTranslator";
import {DraftSlateEditorRef} from "./DraftSlateEditorRef"; // npm install slate slate-react slate-history

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

		const editor = useMemo(() => withHistory(withReact(createEditor())), []);

		// Публичные методы через ref
		useImperativeHandle(ref, () => ({
			setText: (text: string) => {
				debugger;
				const slateValue = textToSlateValue(text);

				// Правильный способ обновления всего контента в Slate:
				// 1. Удаляем всё
				Transforms.removeNodes(editor, { at: [0] });
				// 2. Вставляем новое
				Transforms.insertNodes(editor, slateValue);

				onChange?.(text);
			},

			getText: () => {
				return slateToText(editor.children);
			},

			insertText: (text: string) => {
				editor.insertText(text);
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
