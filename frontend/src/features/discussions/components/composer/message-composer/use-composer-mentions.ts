'use client';

import { useMemo, useState, type RefObject } from 'react';
import { useChannelMembers } from '../../../api/queries';
import type { ChannelMember } from '../../../api/types';
import {
  filterMentionCandidates,
  firstNameHandle
} from '../mention-popover';
import { detectMentionAtCaret } from './detect-mention';

export function useComposerMentions(opts: {
  channelId: number;
  value: string;
  setValue: (v: string) => void;
  myUserId?: number | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [mention, setMention] = useState<{
    query: string;
    start: number;
    end: number;
    selectedIndex: number;
  } | null>(null);

  const { data: membersData } = useChannelMembers(opts.channelId);
  const members = useMemo(() => membersData?.results ?? [], [membersData]);
  const mentionCandidates = useMemo(
    () =>
      mention
        ? filterMentionCandidates(members, mention.query, opts.myUserId ?? null)
        : [],
    [members, mention, opts.myUserId]
  );

  const refreshMentionState = (nextValue: string, caret: number) => {
    const detected = detectMentionAtCaret(nextValue, caret);
    if (!detected) {
      setMention(null);
      return;
    }
    setMention((prev) => ({
      query: detected.query,
      start: detected.start,
      end: detected.end,
      selectedIndex: prev?.query === detected.query ? prev.selectedIndex : 0
    }));
  };

  const insertMention = (member: ChannelMember) => {
    if (!mention) return;
    const handle =
      firstNameHandle(member.user?.full_name) ||
      member.user?.number ||
      String(member.userId);
    const insertion = `@${handle} `;
    const before = opts.value.slice(0, mention.start);
    const after = opts.value.slice(mention.end);
    const next = `${before}${insertion}${after}`;
    opts.setValue(next);
    setMention(null);
    requestAnimationFrame(() => {
      const el = opts.textareaRef.current;
      if (!el) return;
      const newCaret = before.length + insertion.length;
      el.focus();
      el.setSelectionRange(newCaret, newCaret);
    });
  };

  return {
    mention,
    setMention,
    mentionCandidates,
    refreshMentionState,
    insertMention
  };
}
