'use client';

import type { RefObject } from 'react';
import { Textarea } from '@/features/ui/components/textarea';
import type { ChannelMember } from '@/lib/discussions/queries/types';
import { MentionPopover } from '@/components/discussions/composer/mention-popover';

interface ComposerInputProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  setValue: (v: string) => void;
  placeholder: string;
  mention: {
    query: string;
    start: number;
    end: number;
    selectedIndex: number;
  } | null;
  setMention: React.Dispatch<
    React.SetStateAction<{
      query: string;
      start: number;
      end: number;
      selectedIndex: number;
    } | null>
  >;
  mentionCandidates: ChannelMember[];
  refreshMentionState: (nextValue: string, caret: number) => void;
  insertMention: (member: ChannelMember) => void;
  onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement>;
  noteTypingActivity: () => void;
  stopTyping: () => void;
}

export function ComposerInput({
  textareaRef,
  value,
  setValue,
  placeholder,
  mention,
  setMention,
  mentionCandidates,
  refreshMentionState,
  insertMention,
  onKeyDown,
  noteTypingActivity,
  stopTyping
}: ComposerInputProps) {
  return (
    <div className='relative min-w-0 flex-1'>
      {mention && mentionCandidates.length > 0 ? (
        <MentionPopover
          members={mentionCandidates}
          query={mention.query}
          selectedIndex={Math.min(
            mention.selectedIndex,
            mentionCandidates.length - 1
          )}
          onHover={(index) =>
            setMention((m) => (m ? { ...m, selectedIndex: index } : m))
          }
          onSelect={insertMention}
        />
      ) : null}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          refreshMentionState(next, e.target.selectionStart ?? next.length);
          if (next.trim().length > 0) noteTypingActivity();
          else stopTyping();
        }}
        onSelect={(e) => {
          const t = e.currentTarget;
          refreshMentionState(t.value, t.selectionStart ?? t.value.length);
        }}
        onBlur={() => {
          window.setTimeout(() => setMention(null), 100);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={1}
        className='min-h-[36px] resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0'
      />
    </div>
  );
}
