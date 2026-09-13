'use client';

import type { FeedI18n } from './feed-i18n';
import { FEED_TOOLBAR_SELECT_CLASS } from './feed-toolbar-select';
import type { FeedTab } from './types';

interface FeedTabsProps {
  i18n: FeedI18n;
  currentFilter: FeedTab;
  setCurrentFilter: (tab: FeedTab) => void;
  canManage: boolean;
}

export function FeedTabs({
  i18n,
  currentFilter,
  setCurrentFilter,
  canManage
}: FeedTabsProps) {
  return (
    <select
      value={currentFilter}
      onChange={(e) => setCurrentFilter(e.target.value as FeedTab)}
      className={FEED_TOOLBAR_SELECT_CLASS}
      aria-label={i18n.feedLabel}
    >
      <option value='all'>
        {i18n.view}: {i18n.all}
      </option>
      <option value='pinned'>
        {i18n.view}: {i18n.pinned}
      </option>
      <option value='saved'>
        {i18n.view}: {i18n.saved}
      </option>
      {canManage ? (
        <option value='drafts'>
          {i18n.view}: {i18n.drafts}
        </option>
      ) : null}
    </select>
  );
}
