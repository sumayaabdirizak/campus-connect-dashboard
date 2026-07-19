import type { DiscussionChannel, DiscussionChannelKind } from '../../../../api/types';
import { NAME_MAX, UNCATEGORIZED } from './constants';

export function buildChannelUpdateBody(opts: {
  channel: DiscussionChannel;
  trimmedName: string;
  trimmedTopic: string;
  categoryValue: string;
  kind: DiscussionChannelKind;
  isPrivate: boolean;
  nameChanged: boolean;
  topicChanged: boolean;
  categoryChanged: boolean;
  kindChanged: boolean;
  isPrivateChanged: boolean;
}) {
  const body: {
    name?: string;
    topic?: string | null;
    categoryId?: number | null;
    kind?: DiscussionChannelKind;
    isPrivate?: boolean;
  } = {};
  if (opts.nameChanged) body.name = opts.trimmedName;
  if (opts.topicChanged)
    body.topic = opts.trimmedTopic.length === 0 ? null : opts.trimmedTopic;
  if (opts.categoryChanged) {
    if (opts.categoryValue === UNCATEGORIZED) body.categoryId = null;
    else {
      const n = Number(opts.categoryValue);
      if (Number.isFinite(n) && n > 0) body.categoryId = n;
    }
  }
  if (opts.kindChanged) body.kind = opts.kind;
  if (opts.isPrivateChanged) body.isPrivate = opts.isPrivate;
  return body;
}

export function computeOverviewDirty(opts: {
  channel: DiscussionChannel;
  name: string;
  topic: string;
  categoryValue: string;
  initialCategoryValue: string;
  kind: DiscussionChannelKind;
  initialKind: DiscussionChannelKind;
  isPrivate: boolean;
}) {
  const trimmedName = opts.name.trim();
  const trimmedTopic = opts.topic.trim();
  const nameChanged = trimmedName !== (opts.channel.name ?? '').trim();
  const topicChanged = trimmedTopic !== (opts.channel.topic ?? '').trim();
  const categoryChanged = opts.categoryValue !== opts.initialCategoryValue;
  const kindChanged = opts.kind !== opts.initialKind;
  const isPrivateChanged = opts.isPrivate !== !!opts.channel.isPrivate;
  const blockedByDefault = opts.isPrivate && !!opts.channel.isDefault;
  const dirty =
    nameChanged ||
    topicChanged ||
    categoryChanged ||
    kindChanged ||
    isPrivateChanged;
  const nameValid = trimmedName.length > 0 && trimmedName.length <= NAME_MAX;
  return {
    trimmedName,
    trimmedTopic,
    nameChanged,
    topicChanged,
    categoryChanged,
    kindChanged,
    isPrivateChanged,
    blockedByDefault,
    dirty,
    nameValid
  };
}
