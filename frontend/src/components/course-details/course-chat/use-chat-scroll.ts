'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/lib/course-details/types';

export function useChatScroll(allMessages: ChatMessage[], userId: number | null) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const prevLenRef = useRef(0);
  const [atBottom, setAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [firstUnreadId, setFirstUnreadId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setNewCount(0);
    setFirstUnreadId(null);
    setAtBottom(true);
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setAtBottom(bottom);
    if (bottom) {
      setNewCount(0);
      setFirstUnreadId(null);
    }
  };

  const jumpToMessage = (id: number) => {
    const node = messageRefs.current.get(id);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(id);
    window.setTimeout(
      () => setFlashId((current) => (current === id ? null : current)),
      1600
    );
  };

  const registerMessageRef = (id: number, node: HTMLDivElement | null) => {
    if (node) messageRefs.current.set(id, node);
    else messageRefs.current.delete(id);
  };

  useEffect(() => {
    const prevLen = prevLenRef.current;
    const nextLen = allMessages.length;
    prevLenRef.current = nextLen;
    if (nextLen === 0) return;
    const added = nextLen - prevLen;
    const last = allMessages[nextLen - 1];
    const lastIsMine = last?.senderId === userId;
    if (prevLen === 0) {
      scrollToBottom('auto');
      return;
    }
    if (added > 0 && (atBottom || lastIsMine)) {
      scrollToBottom('smooth');
    } else if (added > 0) {
      setNewCount((count) => count + added);
      setFirstUnreadId(
        (current) => current ?? allMessages[Math.max(0, prevLen)]?.id ?? null
      );
    }
  }, [allMessages, userId, atBottom]);

  return {
    messagesEndRef,
    scrollRef,
    atBottom,
    newCount,
    firstUnreadId,
    flashId,
    scrollToBottom,
    handleScroll,
    jumpToMessage,
    registerMessageRef
  };
}
