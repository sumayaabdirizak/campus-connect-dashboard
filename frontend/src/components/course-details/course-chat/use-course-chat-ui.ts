'use client';

import { type ChangeEvent, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useChatRoom, useLoadOlderMessages } from '@/lib/course-details/queries/chat-queries';
import { useCourseChat } from '@/lib/course-details/queries/use-chat-socket';
import { useRoster } from '@/lib/course-details/queries/roster-queries';
import { slugifyName } from './chat-utils';
import { useChatComposerDraft } from './use-chat-composer-draft';
import { useChatMessageMutations } from './use-chat-message-mutations';
import { useChatScroll } from './use-chat-scroll';

export function useCourseChatUi(courseId: string) {
  const { user } = useAuthStore();
  const userId = typeof user?.id === 'number' ? user.id : Number(user?.id ?? 0) || null;
  const meSlug = useMemo(
    () =>
      user?.full_name || user?.name
        ? slugifyName(String(user.full_name ?? user.name))
        : null,
    [user]
  );

  const {
    messages: liveMessages,
    sendMessage: sendViaSocket,
    isConnected,
    presence,
    typing,
    emitTyping,
    liveDeletedIds,
    liveUpdated
  } = useCourseChat(courseId);

  // Poll only as a fallback. The socket already pushes new messages, so the
  // 5s poll alongside it was fetching the room twelve times a minute to learn
  // what the socket had usually delivered already. When the socket drops, the
  // poll takes over — which is what it is actually for.
  const { data: chatRoom, isLoading } = useChatRoom(courseId, { live: !isConnected });
  const { data: roster = [] } = useRoster(courseId, { live: true });
  const loadOlder = useLoadOlderMessages(courseId);

  const mentionLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const person of roster) labels.set(slugifyName(person.full_name), person.full_name);
    return labels;
  }, [roster]);

  const allMessages = useMemo(() => {
    const persisted = chatRoom?.messages ?? [];
    const seen = new Set(persisted.map((item) => item.id));
    const liveOnly = liveMessages.filter((item) => !seen.has(item.id));
    return [...persisted, ...liveOnly]
      .map((item) => liveUpdated.get(item.id) ?? item)
      .filter((item) => !liveDeletedIds.has(item.id))
      .sort((a, b) => a.id - b.id);
  }, [chatRoom, liveMessages, liveDeletedIds, liveUpdated]);

  const scroll = useChatScroll(allMessages, userId);
  const mutations = useChatMessageMutations(courseId);
  const draft = useChatComposerDraft({
    user,
    roster,
    isConnected,
    sendViaSocket,
    sendViaHttp: mutations.sendViaHttp,
    emitTyping
  });

  useEffect(() => {
    if (scroll.atBottom && typing.length > 0) {
      scroll.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [typing.length, scroll.atBottom, scroll.messagesEndRef]);

  const pickFiles = (event: ChangeEvent<HTMLInputElement>) => {
    mutations.pickFiles(event, {
      message: draft.message,
      replyToId: draft.replyTo?.id ?? null,
      clearComposer: draft.clearComposer
    });
  };

  return {
    isLoading,
    chatRoom,
    allMessages,
    userId,
    meSlug,
    mentionLabels,
    presence,
    typing,
    isConnected,
    emitTyping,
    loadOlder,
    scroll,
    ...mutations,
    ...draft,
    pickFiles
  };
}
