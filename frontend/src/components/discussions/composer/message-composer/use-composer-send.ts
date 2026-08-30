'use client';

import { useSendChannelMessage } from '@/lib/discussions/queries/queries';
import {
  hasQaSlashCommand,
  stripQaSlashCommand
} from '@/lib/discussions/services/discussion-qa';
import type { DiscussionMessage } from '@/lib/discussions/queries/types';
import { serverNowIso } from '@/lib/format-time';
import type { PendingAttachment } from './types';

type SendOpts = {
  channelId: string;
  value: string;
  setValue: (v: string) => void;
  attachments: PendingAttachment[];
  setAttachments: React.Dispatch<React.SetStateAction<PendingAttachment[]>>;
  canSend: boolean;
  parentMessageId?: string;
  replyTo?: DiscussionMessage | null;
  onClearReply?: () => void;
  myUserId?: number | null;
  myDisplayName?: string | null;
  effectiveAskAsQuestion: boolean;
  effectivePostAnonymously: boolean;
  slashActive: boolean;
  setAskAsQuestion: (v: boolean) => void;
  setPostAnonymously: (v: boolean) => void;
  stopTyping: () => void;
  onOptimisticInsert?: (temp: DiscussionMessage) => void;
  onOptimisticReplace?: (tempId: string, real: DiscussionMessage) => void;
  onOptimisticRemove?: (tempId: string) => void;
};

export function useComposerSend(opts: SendOpts) {
  const sendMutation = useSendChannelMessage(opts.channelId);

  const handleSubmit = () => {
    if (!opts.canSend || sendMutation.isPending) return;
    opts.stopTyping();
    const stripped = opts.slashActive ? stripQaSlashCommand(opts.value) : opts.value;
    const trimmed = stripped.trim();
    const attachmentIds = opts.attachments
      .map((a) => a.result?.id)
      .filter((id): id is string => typeof id === 'string');

    const messageType: 'QUESTION' | 'MEDIA' | 'TEXT' = opts.effectiveAskAsQuestion
      ? 'QUESTION'
      : trimmed.length === 0 && attachmentIds.length > 0
        ? 'MEDIA'
        : 'TEXT';

    const useOptimism =
      !!opts.onOptimisticInsert &&
      !!opts.onOptimisticReplace &&
      !!opts.onOptimisticRemove;
    const tempId = useOptimism ? `temp-${Date.now()}` : null;
    if (useOptimism && tempId != null) {
      const linkedAttachments = opts.attachments
        .filter((a) => a.result != null)
        .map((a) => ({
          id: a.result!.id,
          fileType: a.result!.fileType,
          mimeType: a.result!.mimeType,
          size: Number(a.result!.size),
          url: a.result!.url,
          accessUrl: a.result!.accessUrl,
          isE2EE: a.result!.isE2EE
        }));
      opts.onOptimisticInsert!({
        id: tempId,
        channelId: opts.channelId,
        groupDmId: null,
        senderId: opts.myUserId ?? null,
        content: trimmed || null,
        messageType,
        createdAt: serverNowIso(),
        editedAt: null,
        deletedAt: null,
        parentMessageId: opts.parentMessageId ?? null,
        replyToMessageId: opts.replyTo?.id ?? null,
        replyTo: opts.replyTo
          ? {
              id: opts.replyTo.id,
              content: opts.replyTo.content,
              deletedAt: opts.replyTo.deletedAt,
              sender: opts.replyTo.sender ?? null,
            }
          : null,
        isAnonymous: opts.effectivePostAnonymously,
        sender: opts.myUserId
          ? { id: opts.myUserId, full_name: opts.myDisplayName ?? '' }
          : null,
        attachments: linkedAttachments,
        reactions: []
      });
    }

    const wasUsingOptimism = useOptimism;
    const draftValue = opts.value;
    if (wasUsingOptimism) {
      opts.setValue('');
      opts.setAttachments([]);
      opts.setAskAsQuestion(false);
      opts.setPostAnonymously(false);
      opts.onClearReply?.();
    }

    sendMutation.mutate(
      {
        content: trimmed || null,
        attachmentIds,
        messageType,
        postAsQuestion: opts.effectiveAskAsQuestion || undefined,
        isAnonymous: opts.effectivePostAnonymously || undefined,
        ...(opts.parentMessageId ? { parentMessageId: opts.parentMessageId } : {}),
        ...(opts.replyTo?.id ? { replyToMessageId: opts.replyTo.id } : {}),
      },
      {
        onSuccess: (result) => {
          if (wasUsingOptimism && tempId != null) {
            const realMessage =
              (result as { message?: DiscussionMessage })?.message ?? null;
            if (realMessage) opts.onOptimisticReplace!(tempId, realMessage);
            else opts.onOptimisticRemove!(tempId);
          } else {
            opts.setValue('');
            opts.setAttachments([]);
            opts.setAskAsQuestion(false);
            opts.setPostAnonymously(false);
            opts.onClearReply?.();
          }
        },
        onError: () => {
          if (wasUsingOptimism && tempId != null) {
            opts.onOptimisticRemove!(tempId);
            opts.setValue(draftValue);
          }
        }
      }
    );
  };

  return { handleSubmit, sendPending: sendMutation.isPending };
}

export function useComposerQa(value: string, parentMessageId?: string) {
  const isThreadReply = parentMessageId != null;
  const slashActive = !isThreadReply && hasQaSlashCommand(value);
  return { isThreadReply, slashActive };
}
