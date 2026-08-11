'use client';

import type { ChannelMember } from '@/lib/discussions/queries/types';

type MentionState = {
  query: string;
  start: number;
  end: number;
  selectedIndex: number;
} | null;

export function buildComposerKeyDown(opts: {
  mention: MentionState;
  mentionCandidates: ChannelMember[];
  setMention: React.Dispatch<React.SetStateAction<MentionState>>;
  insertMention: (member: ChannelMember) => void;
  handleSubmit: () => void;
}): React.KeyboardEventHandler<HTMLTextAreaElement> {
  return (e) => {
    const { mention, mentionCandidates } = opts;
    if (mention && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        opts.setMention((m) =>
          m
            ? {
                ...m,
                selectedIndex: (m.selectedIndex + 1) % mentionCandidates.length
              }
            : m
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        opts.setMention((m) =>
          m
            ? {
                ...m,
                selectedIndex:
                  (m.selectedIndex - 1 + mentionCandidates.length) %
                  mentionCandidates.length
              }
            : m
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const target = mentionCandidates[mention.selectedIndex];
        if (target) opts.insertMention(target);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        opts.setMention(null);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      opts.handleSubmit();
    }
  };
}
