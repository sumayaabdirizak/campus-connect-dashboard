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

/**
 * Lightweight Flesch reading-ease score (0–100, higher = easier to read).
 *   90–100  ≈ 5th grade
 *   60–70   ≈ 8th–9th grade (target for general public)
 *   30–50   ≈ college level
 *   <30     ≈ very difficult
 *
 * Implementation is a small approximation — good enough for an inline hint.
 */
export function computeReadability(text: string): { score: number; grade: string } | null {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  const words = trimmed.split(/\s+/).filter(Boolean);
  const sentences = trimmed.split(/[.!?؟。！？]+/).filter((s) => s.trim().length > 0);
  if (words.length < 5 || sentences.length === 0) return null;

  const countSyllables = (word: string): number => {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 1;
    const m = w.match(/[aeiouy]+/g);
    let n = m ? m.length : 1;
    if (w.endsWith('e') && n > 1) n -= 1;
    return Math.max(1, n);
  };
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = syllables / words.length;
  const score = Math.max(
    0,
    Math.min(100, Math.round(206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord))
  );

  let grade: string;
  if (score >= 80) grade = 'Easy to read';
  else if (score >= 60) grade = 'Plain language';
  else if (score >= 40) grade = 'Moderate';
  else grade = 'Complex — consider simplifying';
  return { score, grade };
}

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
          'prose prose-sm dark:prose-invert max-w-none min-h-[160px] rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
