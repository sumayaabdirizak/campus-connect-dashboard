'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { isDiscussionQaStyleChannel } from '@/lib/discussions/services/discussion-qa';
import { buildComposerKeyDown } from './composer-keydown';
import type { MessageComposerProps } from './types';
import { MAX_LINES } from './types';
import { useComposerAttachments } from './use-composer-attachments';
import { useComposerMentions } from './use-composer-mentions';
import { useComposerQa, useComposerSend } from './use-composer-send';
import { useComposerTyping } from './use-composer-typing';

export function useMessageComposer(props: MessageComposerProps) {
  const {
    channelId,
    channelName,
    channelSlug,
    serverName,
    perms,
    e2eeEnabled,
    e2eeKeyVersion,
    parentMessageId,
    replyTo,
    onClearReply,
    placeholder,
    myUserId,
    myDisplayName,
    onOptimisticInsert,
    onOptimisticReplace,
    onOptimisticRemove
  } = props;

  const [value, setValue] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [askAsQuestion, setAskAsQuestion] = useState(false);
  const [postAnonymously, setPostAnonymously] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { noteTypingActivity, stopTyping } = useComposerTyping({
    channelId,
    parentMessageId
  });
  const mentions = useComposerMentions({
    channelId,
    value,
    setValue,
    myUserId,
    textareaRef
  });
  const files = useComposerAttachments({
    channelId,
    canAttachFiles: perms.canAttachFiles,
    e2eeEnabled,
    e2eeKeyVersion
  });

  const isQaChannel = useMemo(
    () =>
      isDiscussionQaStyleChannel(serverName ?? '', channelName ?? '', channelSlug),
    [serverName, channelName, channelSlug]
  );
  const { isThreadReply, slashActive } = useComposerQa(value, parentMessageId);
  const effectiveAskAsQuestion = !isThreadReply && (askAsQuestion || slashActive);
  const effectivePostAnonymously =
    effectiveAskAsQuestion && isQaChannel && postAnonymously;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight || '20');
    el.style.height = `${Math.min(el.scrollHeight, lineHeight * MAX_LINES)}px`;
  }, [value]);

  const canSend =
    perms.canSend &&
    (value.trim().length > 0 || files.hasReadyAttachments) &&
    files.allAttachmentsReady;

  const { handleSubmit, sendPending } = useComposerSend({
    channelId,
    value,
    setValue,
    attachments: files.attachments,
    setAttachments: files.setAttachments,
    canSend,
    parentMessageId,
    replyTo: replyTo ?? null,
    onClearReply,
    myUserId,
    myDisplayName,
    effectiveAskAsQuestion,
    effectivePostAnonymously,
    slashActive,
    setAskAsQuestion,
    setPostAnonymously,
    stopTyping,
    onOptimisticInsert,
    onOptimisticReplace,
    onOptimisticRemove
  });

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo?.id]);

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? value.length;
    const next = `${value.slice(0, caret)}${emoji}${value.slice(caret)}`;
    setValue(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret + emoji.length, caret + emoji.length);
    });
  };

  const handleKeyDown = buildComposerKeyDown({
    mention: mentions.mention,
    mentionCandidates: mentions.mentionCandidates,
    setMention: mentions.setMention,
    insertMention: mentions.insertMention,
    handleSubmit
  });

  const composerPlaceholder =
    placeholder ??
    (effectiveAskAsQuestion
      ? effectivePostAnonymously
        ? 'Ask a question anonymously…'
        : 'Ask a question…'
      : isQaChannel
        ? 'Ask a question (or share an update)…'
        : channelName
          ? `Message #${channelName}`
          : 'Send a message');

  return {
    perms,
    value,
    setValue,
    emojiOpen,
    setEmojiOpen,
    askAsQuestion,
    setAskAsQuestion,
    postAnonymously,
    setPostAnonymously,
    textareaRef,
    fileInputRef,
    noteTypingActivity,
    stopTyping,
    mentions,
    files,
    isQaChannel,
    isThreadReply,
    slashActive,
    effectiveAskAsQuestion,
    effectivePostAnonymously,
    canSend,
    handleSubmit,
    sendPending,
    insertEmoji,
    handleKeyDown,
    composerPlaceholder,
    replyTo: replyTo ?? null,
    onClearReply,
  };
}
