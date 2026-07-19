'use client';

import { useSendChannelMessage } from '../../../api/queries';
import {
  hasQaSlashCommand,
  stripQaSlashCommand
} from '../../../discussion-qa';
import type { DiscussionMessage } from '../../../api/types';
import type { PendingAttachment } from './types';

type SendOpts = {
  channelId: number;
  value: string;
  setValue: (v: string) => void;
  attachments: PendingAttachment[];
  setAttachments: React.Dispatch<React.SetStateAction<PendingAttachment[]>>;
  canSend: boolean;
  parentMessageId?: number;
  myUserId?: number | null;
  myDisplayName?: string | null;
  effectiveAskAsQuestion: boolean;
  effectivePostAnonymously: boolean;
  slashActive: boolean;
  setAskAsQuestion: (v: boolean) => void;
  setPostAnonymously: (v: boolean) => void;
  stopTyping: () => void;
  onOptimisticInsert?: (temp: DiscussionMessage) => void;
  onOptimisticReplace?: (tempId: number, real: DiscussionMessage) => void;
  onOptimisticRemove?: (tempId: number) => void;
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
      .filter((id): id is number => typeof id === 'number');

    const messageType: 'QUESTION' | 'MEDIA' | 'TEXT' = opts.effectiveAskAsQuestion
      ? 'QUESTION'
      : trimmed.length === 0 && attachmentIds.length > 0
        ? 'MEDIA'
        : 'TEXT';

    const useOptimism =
      !!opts.onOptimisticInsert &&
      !!opts.onOptimisticReplace &&
      !!opts.onOptimisticRemove;
    const tempId = useOptimism ? -Date.now() : null;
    if (useOptimism && tempId != null) {
      const linkedAttachments = opts.attachments
        .filter((a) => a.result != null)
        .map((a) => ({
          id: a.result!.id,
          fileType: a.result!.fileType,
          mimeType: a.result!.mimeType,
          size: Number(a.result!.size),
          isE2EE: a.result!.isE2EE
        }));
      opts.onOptimisticInsert!({
        id: tempId,
        channelId: opts.channelId,
        groupDmId: null,
        senderId: opts.myUserId ?? null,
        content: trimmed || null,
        messageType,
        createdAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
        parentMessageId: opts.parentMessageId ?? null,
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
    }

    sendMutation.mutate(
      {
        content: trimmed || null,
        attachmentIds,
        messageType,
        postAsQuestion: opts.effectiveAskAsQuestion || undefined,
        isAnonymous: opts.effectivePostAnonymously || undefined,
        ...(opts.parentMessageId ? { parentMessageId: opts.parentMessageId } : {})
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

export function useComposerQa(value: string, parentMessageId?: number) {
  const isThreadReply = parentMessageId != null;
  const slashActive = !isThreadReply && hasQaSlashCommand(value);
  return { isThreadReply, slashActive };
}
