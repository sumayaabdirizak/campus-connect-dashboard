import type { DiscussionChannel, DiscussionChannelKind } from '@/lib/discussions/queries';
import { NAME_MAX, UNCATEGORIZED } from './constants';

export function buildChannelUpdateBody(opts: {
  channel: DiscussionChannel;
  trimmedName: string;
  trimmedTopic: string;
  categoryValue: string;
  kind: DiscussionChannelKind;
  nameChanged: boolean;
  topicChanged: boolean;
  categoryChanged: boolean;
  kindChanged: boolean;
}) {
  const body: {
    name?: string;
    topic?: string | null;
    categoryId?: string | null;
    kind?: DiscussionChannelKind;
  } = {};
  if (opts.nameChanged) body.name = opts.trimmedName;
  if (opts.topicChanged)
    body.topic = opts.trimmedTopic.length === 0 ? null : opts.trimmedTopic;
  if (opts.categoryChanged) {
    body.categoryId = opts.categoryValue === UNCATEGORIZED ? null : opts.categoryValue;
  }
  if (opts.kindChanged) body.kind = opts.kind;
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
}) {
  const trimmedName = opts.name.trim();
  const trimmedTopic = opts.topic.trim();
  const nameChanged = trimmedName !== (opts.channel.name ?? '').trim();
  const topicChanged = trimmedTopic !== (opts.channel.topic ?? '').trim();
  const categoryChanged = opts.categoryValue !== opts.initialCategoryValue;
  const kindChanged = opts.kind !== opts.initialKind;
  const dirty =
    nameChanged || topicChanged || categoryChanged || kindChanged;
  const nameValid = trimmedName.length > 0 && trimmedName.length <= NAME_MAX;
  return {
    trimmedName,
    trimmedTopic,
    nameChanged,
    topicChanged,
    categoryChanged,
    kindChanged,
    dirty,
    nameValid
  };
}
