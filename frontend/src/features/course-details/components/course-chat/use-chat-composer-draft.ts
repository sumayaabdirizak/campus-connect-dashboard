'use client';

import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react';
import { slugifyName } from './chat-utils';
import type { ChatMessage } from '../../api/chat-types';

type RosterPerson = { id: number; full_name: string };

export function useChatComposerDraft(opts: {
  user: { id?: number | string } | null | undefined;
  roster: RosterPerson[];
  isConnected: boolean;
  sendViaSocket: (text: string, replyToId: number | null) => void;
  sendViaHttp: {
    mutate: (input: { content: string; replyToId: number | null }) => void;
  };
  emitTyping: (kind: 'start' | 'stop') => void;
}) {
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [mentionPicker, setMentionPicker] = useState<{
    open: boolean;
    candidates: { id: number; full_name: string; slug: string }[];
  }>({ open: false, candidates: [] });
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const clearComposer = () => {
    setMessage('');
    setReplyTo(null);
    setMentionPicker({ open: false, candidates: [] });
    opts.emitTyping('stop');
  };

  const handleInputChange = (value: string) => {
    setMessage(value);
    opts.emitTyping(value.trim() ? 'start' : 'stop');
    const match = /@([a-z0-9.\-]*)$/i.exec(value);
    if (!match) {
      setMentionPicker({ open: false, candidates: [] });
      return;
    }
    const query = match[1].toLowerCase();
    const candidates = opts.roster
      .map((person) => ({
        id: person.id,
        full_name: person.full_name,
        slug: slugifyName(person.full_name)
      }))
      .filter((person) => person.slug.startsWith(query))
      .slice(0, 50);
    setMentionPicker({ open: candidates.length > 0, candidates });
  };

  const insertMention = (slug: string) => {
    setMessage((current) => current.replace(/@([a-z0-9.\-]*)$/i, `@${slug} `));
    setMentionPicker({ open: false, candidates: [] });
    composerRef.current?.focus();
  };

  const handleSend = (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !opts.user) return;
    if (opts.isConnected) opts.sendViaSocket(trimmed, replyTo?.id ?? null);
    else opts.sendViaHttp.mutate({ content: trimmed, replyToId: replyTo?.id ?? null });
    clearComposer();
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return {
    message,
    replyTo,
    setReplyTo,
    mentionPicker,
    composerRef,
    clearComposer,
    handleInputChange,
    insertMention,
    handleSend,
    handleComposerKeyDown
  };
}
