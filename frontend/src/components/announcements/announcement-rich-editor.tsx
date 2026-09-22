'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
};

export function AnnouncementRichEditor({
  value,
  onChange,
  placeholder = 'Write the announcement…',
  disabled,
  id,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false }
      }),
      Placeholder.configure({ placeholder })
    ],
    content: value || '<p></p>',
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: 'textbox',
        'aria-multiline': 'true',
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-[180px] rounded-lg border-2 border-foreground/15 bg-background px-3 py-3 text-sm font-medium text-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:text-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-foreground/45',
        ...(ariaInvalid === true || ariaInvalid === 'true' ? { 'aria-invalid': 'true' as const } : {}),
        ...(ariaDescribedBy ? { 'aria-describedby': ariaDescribedBy } : {})
      }
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    }
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current && !editor.isFocused) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
