'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Plus, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Announcement } from '../api/types';
import { AnnouncementCard } from './announcement-card';
import { AnnouncementEmpty } from './empty';
import { AnnouncementError } from './announcement-error';
import { AnnouncementListSkeleton } from './skeleton';
import { isAnnouncementTimelyPinned } from '../utils/announcementPin';

interface AnnouncementFeedProps {
  announcements: Announcement[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  userRole?: string;
  unreadCount: number;
  /** Count of the current user's drafts (managers only); shown on Create. */
  draftCount?: number;
  canManage?: boolean;
  canCreate?: boolean;
  onOpenCreate: () => void;
  onEditAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (announcement: Announcement) => void;
  onTogglePinAnnouncement?: (announcement: Announcement) => void;
  /** Cancel a future-dated scheduled post (moves to DRAFT). */
  onCancelSchedule?: (announcement: Announcement) => void | Promise<void>;
  /** PATCH `publishedAt` for an existing SCHEDULED post (quick reschedule from the card). */
  onReschedulePublishAt?: (announcement: Announcement, publishedAtIso: string) => void | Promise<void>;
  onMarkAsRead?: (id: number) => Promise<unknown>;
  /** Draft tab: fetch full announcement then open composer (GET /announcements/:id). */
  onResumeDraft?: (id: number) => void | Promise<void>;
  /** Dean / super-admin: open analytics side sheet from card menu. */
  onOpenAnalytics?: (announcement: Announcement) => void;
  readTrigger?: 'viewport' | 'click';
  onSnapshotUnreadBeforeRead?: () => void;
  onReadDiagnostic?: (id: number) => void;
  onLightboxDiagnostic?: () => void;
}

const PAGE_SIZE = 10;

type SortMode = 'NEWEST' | 'OLDEST' | 'PRIORITY';

const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 0,
  important: 1,
  normal: 2
};

interface ChipGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

/** Compact pill-style filter group; accessible as a radiogroup. */
function ChipGroup({ label, value, onChange, options }: ChipGroupProps) {
  return (
    <div
      role='radiogroup'
      aria-label={label}
      className='inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/50 p-0.5 shadow-xs'
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type='button'
            role='radio'
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={[
              'min-h-[44px] min-w-[44px] shrink-0 rounded-full px-3 text-[11px] font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function AnnouncementFeed({
  announcements,
  isLoading,
  error,
  onRetry,
  userRole,
  unreadCount,
  draftCount = 0,
  canManage = false,
  canCreate = false,
  onOpenCreate,
  onEditAnnouncement,
  onDeleteAnnouncement,
  onTogglePinAnnouncement,
  onCancelSchedule,
  onReschedulePublishAt,
  onMarkAsRead,
  onResumeDraft,
  onOpenAnalytics,
  readTrigger = 'viewport',
  onSnapshotUnreadBeforeRead,
  onReadDiagnostic,
  onLightboxDiagnostic
}: AnnouncementFeedProps) {
  // URL <-> state sync. We hydrate from `?tab=&q=&role=&read=&date=&sort=` on first render
  // and write back via shallow router pushes whenever filters change, so back/forward and
  // deep links survive a refresh.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const getParam = useCallback(
    (key: string, fallback: string) => searchParams?.get(key) ?? fallback,
    [searchParams]
  );

  const [currentFilter, setCurrentFilter] = useState<'all' | 'pinned' | 'scheduled' | 'drafts'>(() => {
    const tab = getParam('tab', 'all');
    if (tab === 'pinned') return 'pinned';
    if (tab === 'scheduled' && canManage) return 'scheduled';
    if (tab === 'drafts' && canManage) return 'drafts';
    return 'all';
  });
  const [searchQuery, setSearchQuery] = useState(() => getParam('q', ''));
  const [roleFilter, setRoleFilter] = useState(() => getParam('role', 'ALL'));
  const [readFilter, setReadFilter] = useState<'ALL' | 'READ' | 'UNREAD'>(() => {
    const v = getParam('read', 'ALL');
    return v === 'READ' || v === 'UNREAD' ? v : 'ALL';
  });
  const [dateFilter, setDateFilter] = useState<'ALL' | '7D' | '30D'>(() => {
    const v = getParam('date', 'ALL');
    return v === '7D' || v === '30D' ? v : 'ALL';
  });
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    const v = getParam('sort', 'NEWEST');
    return v === 'OLDEST' || v === 'PRIORITY' ? v : 'NEWEST';
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const roleFilterRef = useRef(roleFilter);
  roleFilterRef.current = roleFilter;
  /** Re-run sort when timed pin windows elapse (server fallback may lag up to one tick). */
  const [pinSortTick, setPinSortTick] = useState(0);
  useEffect(() => {
    if (announcements.length === 0) return;
    const id = window.setInterval(() => setPinSortTick((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, [announcements.length]);

  // `role` drives a server refetch via the parent URL — sync immediately (search stays debounced).
  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    if (roleFilter && roleFilter !== 'ALL') params.set('role', roleFilter);
    else params.delete('role');
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    router.replace(next, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when audience changes; avoids debounce delay for server `?role=`.
  }, [roleFilter, pathname, router]);

  // Push other filter state back to the URL (debounced for search so we don't spam the history).
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    const setOrDelete = (key: string, value: string, defaultValue: string) => {
      if (value && value !== defaultValue) params.set(key, value);
      else params.delete(key);
    };
    setOrDelete('tab', currentFilter, 'all');
    setOrDelete('q', searchQuery, '');
    setOrDelete('role', roleFilterRef.current, 'ALL');
    setOrDelete('read', readFilter, 'ALL');
    setOrDelete('date', dateFilter, 'ALL');
    setOrDelete('sort', sortMode, 'NEWEST');
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    const handle = window.setTimeout(() => {
      router.replace(next, { scroll: false });
    }, 250);
    return () => window.clearTimeout(handle);
    // We intentionally don't depend on `searchParams`/`pathname` to avoid feedback loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilter, searchQuery, readFilter, dateFilter, sortMode]);
  useEffect(() => {
    if (!canManage && (currentFilter === 'scheduled' || currentFilter === 'drafts')) {
      setCurrentFilter('all');
    }
  }, [canManage, currentFilter]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [currentFilter]);

  const locale = useMemo(() => {
    if (typeof window === 'undefined') return 'en';
    return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }, []);

  /** Deduped audience values for the role filter (matches URL `role=` + API `?role=`). */
  const roleFilterOptions = useMemo(() => {
    const merged = [
      ...(userRole ? [String(userRole).toUpperCase()] : []),
      'STUDENT',
      'TEACHER',
      'DEAN',
      'SUPER_ADMIN'
    ];
    return Array.from(new Set(merged));
  }, [userRole]);

  const i18n =
    locale === 'ar'
      ? {
          all: 'الكل',
          pinned: 'نشِط',
          scheduled: 'مجدول',
          drafts: 'مسودات',
          search: 'بحث',
          create: 'إنشاء',
          role: 'الدور',
          readState: 'الحالة',
          date: 'التاريخ',
          read: 'مقروء',
          unread: 'غير مقروء',
          last7d: 'آخر 7 أيام',
          last30d: 'آخر 30 يوم',
          feedLabel: 'الإعلانات',
          showMore: 'عرض المزيد',
          unreadHeading: 'غير مقروء',
          pinnedHeading: 'نشِط',
          unreadAnnounce: (n: number) =>
            n === 0 ? 'لا توجد إعلانات غير مقروءة' : `لديك ${n} إعلان غير مقروء`,
          loadingLabel: 'جارٍ تحميل الإعلانات',
          sort: 'ترتيب',
          newest: 'الأحدث',
          oldest: 'الأقدم',
          priority: 'الأولوية',
          clearAll: 'مسح الكل',
          filtersActive: (n: number) => `${n} مرشّح`,
          newPostsPill: (n: number) => `${n} إعلان جديد · اعرض`,
          createWithDraftsAria: (n: number) =>
            n === 0 ? 'إنشاء إعلان' : `إنشاء إعلان، ${n} مسودة محفوظة`
        }
      : {
          all: 'All',
          pinned: 'Active',
          scheduled: 'Scheduled',
          drafts: 'Drafts',
          search: 'Search',
          create: 'Create',
          role: 'Role',
          readState: 'Read State',
          date: 'Date',
          read: 'Read',
          unread: 'Unread',
          last7d: 'Last 7 days',
          last30d: 'Last 30 days',
          feedLabel: 'Announcements',
          showMore: 'Show more',
          unreadHeading: 'Unread',
          pinnedHeading: 'Active',
          unreadAnnounce: (n: number) =>
            n === 0 ? 'No unread announcements' : `${n} unread announcement${n === 1 ? '' : 's'}`,
          loadingLabel: 'Loading announcements',
          sort: 'Sort',
          newest: 'Newest',
          oldest: 'Oldest',
          priority: 'Priority',
          clearAll: 'Clear all',
          filtersActive: (n: number) => `${n} filter${n === 1 ? '' : 's'}`,
          newPostsPill: (n: number) => `${n} new post${n === 1 ? '' : 's'} · view`,
          createWithDraftsAria: (n: number) =>
            n === 0 ? 'Create announcement' : `Create announcement, ${n} saved draft${n === 1 ? '' : 's'}`
        };
  const previousUnreadRef = useRef(unreadCount);
  const [unreadAnnouncement, setUnreadAnnouncement] = useState('');
  useEffect(() => {
    if (previousUnreadRef.current !== unreadCount) {
      previousUnreadRef.current = unreadCount;
      setUnreadAnnouncement(i18n.unreadAnnounce(unreadCount));
    }
  }, [unreadCount, i18n]);

  const filteredAnnouncements = useMemo(() => {
    const filtered = announcements.filter((announcement) => {
      if (currentFilter === 'pinned' && !isAnnouncementTimelyPinned(announcement)) return false;
      if (currentFilter === 'scheduled') {
        if (String(announcement.status ?? '').toUpperCase() !== 'SCHEDULED') return false;
      }
      if (currentFilter === 'drafts') {
        if (String(announcement.status ?? '').toUpperCase() !== 'DRAFT') return false;
      }
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const textMatch =
          announcement.title?.toLowerCase().includes(q) ||
          announcement.content?.toLowerCase().includes(q);
        if (!textMatch) return false;
      }
      if (readFilter === 'READ' && !announcement.isRead) return false;
      if (readFilter === 'UNREAD' && announcement.isRead) return false;
      if (dateFilter !== 'ALL') {
        const ts = new Date(announcement.publishedAt || announcement.createdAt || 0).getTime();
        const days = dateFilter === '7D' ? 7 : 30;
        if (!Number.isFinite(ts) || Date.now() - ts > days * 24 * 60 * 60 * 1000) return false;
      }
      return true;
    });

    const compareScheduled = (a: Announcement, b: Announcement) =>
      new Date(a.publishedAt || a.createdAt || 0).getTime() -
      new Date(b.publishedAt || b.createdAt || 0).getTime();

    if (currentFilter === 'scheduled') {
      return filtered.sort(compareScheduled);
    }

    // Pinned posts always float to the top regardless of sort. Inside each
    // group (pinned / unpinned) we apply the selected sort.
    const compareNewest = (a: Announcement, b: Announcement) =>
      new Date(b.publishedAt || b.createdAt || 0).getTime() -
      new Date(a.publishedAt || a.createdAt || 0).getTime();
    const compareOldest = (a: Announcement, b: Announcement) => -compareNewest(a, b);
    const comparePriority = (a: Announcement, b: Announcement) => {
      const aw = PRIORITY_WEIGHT[a.priority] ?? 99;
      const bw = PRIORITY_WEIGHT[b.priority] ?? 99;
      if (aw !== bw) return aw - bw;
      return compareNewest(a, b);
    };
    const compare =
      sortMode === 'OLDEST'
        ? compareOldest
        : sortMode === 'PRIORITY'
          ? comparePriority
          : compareNewest;

    const pinned = filtered.filter((a) => isAnnouncementTimelyPinned(a)).sort(compare);
    const rest = filtered.filter((a) => !isAnnouncementTimelyPinned(a)).sort(compare);
    return [...pinned, ...rest];
  }, [
    announcements,
    currentFilter,
    searchQuery,
    readFilter,
    dateFilter,
    sortMode,
    pinSortTick
  ]);

  // Detect "new posts arrived while the user is scrolled away from top" (feed list scroll container).
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const feedTopRef = useRef<HTMLDivElement | null>(null);
  const previousIdsRef = useRef<Set<string | number>>(new Set());
  const [newPostsCount, setNewPostsCount] = useState(0);
  useEffect(() => {
    const currentIds = new Set(announcements.map((a) => a.id));
    if (currentFilter === 'drafts' || currentFilter === 'scheduled') {
      previousIdsRef.current = currentIds;
      return;
    }
    if (previousIdsRef.current.size === 0) {
      previousIdsRef.current = currentIds;
      return;
    }
    let added = 0;
    currentIds.forEach((id) => {
      if (!previousIdsRef.current.has(id)) added += 1;
    });
    previousIdsRef.current = currentIds;
    if (added > 0) {
      const el = feedScrollRef.current;
      const scrollTop = el?.scrollTop ?? (typeof window !== 'undefined' ? window.scrollY : 0);
      const isScrolled = scrollTop > 160;
      if (isScrolled) setNewPostsCount((prev) => prev + added);
    }
  }, [announcements, currentFilter]);
  const handleScrollToTop = useCallback(() => {
    setNewPostsCount(0);
    const scroller = feedScrollRef.current;
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (feedTopRef.current) {
      feedTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Filter count — used by the "Clear all" pill in the header (includes feed tab).
  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (roleFilter !== 'ALL' ? 1 : 0) +
    (readFilter !== 'ALL' ? 1 : 0) +
    (dateFilter !== 'ALL' ? 1 : 0) +
    (currentFilter !== 'all' ? 1 : 0) +
    (sortMode !== 'NEWEST' ? 1 : 0);

  /** Search / chips / sort only — excludes All | Active | Scheduled tab (for empty-state copy). */
  const contentFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (roleFilter !== 'ALL' ? 1 : 0) +
    (readFilter !== 'ALL' ? 1 : 0) +
    (dateFilter !== 'ALL' ? 1 : 0) +
    (sortMode !== 'NEWEST' ? 1 : 0);

  const handleClearAllFilters = useCallback(() => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setReadFilter('ALL');
    setDateFilter('ALL');
    setCurrentFilter('all');
    setSortMode('NEWEST');
  }, []);

  const visibleAnnouncements = useMemo(
    () => filteredAnnouncements.slice(0, visibleCount),
    [filteredAnnouncements, visibleCount]
  );

  const pinnedCount = useMemo(
    () => announcements.filter((announcement) => isAnnouncementTimelyPinned(announcement)).length,
    [announcements, pinSortTick]
  );

  const tabClass = (active: boolean) =>
    [
      'relative flex-1 min-h-[44px] py-3 text-center text-sm font-medium transition-colors duration-200 ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
      active
        ? 'text-neutral-950 dark:text-white'
        : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-500 dark:hover:text-neutral-300'
    ].join(' ');

  return (
    <div className='mx-auto flex h-full min-h-0 w-full max-w-[100vw] min-w-0 flex-1 flex-col gap-6 overflow-x-hidden px-0 sm:px-4 lg:flex-row lg:items-stretch lg:gap-8'>
      <div className='mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden rounded-3xl border border-border/60 bg-background/90 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]'>
        <header className='shrink-0 border-b border-border/60 bg-background/95 px-4 backdrop-blur-2xl'>
          {canCreate && (
            <div className='flex items-center justify-between gap-2 py-3'>
              <h1 className='text-base font-semibold tracking-tight'>{i18n.feedLabel}</h1>
              <Button
                type='button'
                onClick={onOpenCreate}
                className='relative h-9 rounded-full px-4 text-sm shadow-sm'
                aria-label={i18n.createWithDraftsAria(draftCount)}
              >
                <Plus className='me-1 h-4 w-4' aria-hidden />
                {i18n.create}
                {draftCount > 0 ? (
                  <Badge
                    className='absolute -end-1.5 -top-1.5 min-h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[10px] font-semibold tabular-nums'
                    variant='default'
                    aria-hidden
                  >
                    {draftCount > 99 ? '99+' : draftCount}
                  </Badge>
                ) : null}
              </Button>
            </div>
          )}
          <div
            role='tablist'
            aria-label={i18n.feedLabel}
            className='flex h-[52px] items-center border-b border-neutral-100 dark:border-neutral-800/80'
          >
            <button
              type='button'
              role='tab'
              aria-selected={currentFilter === 'all'}
              className={tabClass(currentFilter === 'all')}
              onClick={() => setCurrentFilter('all')}
            >
              {i18n.all}
              {currentFilter === 'all' && (
                <span aria-hidden className='absolute bottom-0 left-1/2 h-0.5 w-14 -translate-x-1/2 rounded-full bg-neutral-900 dark:bg-white' />
              )}
            </button>
            <button
              type='button'
              role='tab'
              aria-selected={currentFilter === 'pinned'}
              className={tabClass(currentFilter === 'pinned')}
              onClick={() => setCurrentFilter('pinned')}
            >
              {i18n.pinned}
              {currentFilter === 'pinned' && (
                <span aria-hidden className='absolute bottom-0 left-1/2 h-0.5 w-14 -translate-x-1/2 rounded-full bg-neutral-900 dark:bg-white' />
              )}
            </button>
            {canManage && (
              <button
                type='button'
                role='tab'
                aria-selected={currentFilter === 'scheduled'}
                className={tabClass(currentFilter === 'scheduled')}
                onClick={() => setCurrentFilter('scheduled')}
              >
                {i18n.scheduled}
                {currentFilter === 'scheduled' && (
                  <span aria-hidden className='absolute bottom-0 left-1/2 h-0.5 w-14 -translate-x-1/2 rounded-full bg-neutral-900 dark:bg-white' />
                )}
              </button>
            )}
            {canManage && (
              <button
                type='button'
                role='tab'
                aria-selected={currentFilter === 'drafts'}
                className={tabClass(currentFilter === 'drafts')}
                onClick={() => setCurrentFilter('drafts')}
              >
                {i18n.drafts}
                {currentFilter === 'drafts' && (
                  <span aria-hidden className='absolute bottom-0 left-1/2 h-0.5 w-14 -translate-x-1/2 rounded-full bg-neutral-900 dark:bg-white' />
                )}
              </button>
            )}
          </div>
          <div className='space-y-2 py-3'>
            <div className='relative'>
              <Search
                aria-hidden
                className='pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500'
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-10 border-neutral-200/80 bg-neutral-50/80 ps-10 text-sm transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-neutral-400 focus-visible:border-neutral-300 focus-visible:ring-neutral-200/60 dark:border-neutral-800 dark:bg-neutral-900/50 dark:focus-visible:border-neutral-600 dark:focus-visible:ring-neutral-700/40'
                placeholder={i18n.search}
                aria-label={i18n.search}
              />
            </div>
            {canManage && (
              <div className='-mx-1 flex max-w-full flex-wrap items-center gap-2 overflow-x-auto px-1 pb-1 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                <ChipGroup
                  label={i18n.readState}
                  value={readFilter}
                  onChange={(v) => setReadFilter(v as 'ALL' | 'READ' | 'UNREAD')}
                  options={[
                    { value: 'ALL', label: i18n.all },
                    { value: 'UNREAD', label: i18n.unread },
                    { value: 'READ', label: i18n.read }
                  ]}
                />
                <ChipGroup
                  label={i18n.date}
                  value={dateFilter}
                  onChange={(v) => setDateFilter(v as 'ALL' | '7D' | '30D')}
                  options={[
                    { value: 'ALL', label: i18n.all },
                    { value: '7D', label: i18n.last7d },
                    { value: '30D', label: i18n.last30d }
                  ]}
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className='h-8 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground shadow-xs hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  aria-label={i18n.role}
                >
                  <option value='ALL'>
                    {i18n.role}: {i18n.all}
                  </option>
                  {roleFilterOptions.map((r) => (
                    <option key={r} value={r}>
                      {r === 'TEACHER' ? 'LECTURER' : r}
                    </option>
                  ))}
                </select>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className='h-8 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground shadow-xs hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  aria-label={i18n.sort}
                >
                  <option value='NEWEST'>
                    {i18n.sort}: {i18n.newest}
                  </option>
                  <option value='OLDEST'>
                    {i18n.sort}: {i18n.oldest}
                  </option>
                  <option value='PRIORITY'>
                    {i18n.sort}: {i18n.priority}
                  </option>
                </select>
                {activeFilterCount > 0 && (
                  <button
                    type='button'
                    onClick={handleClearAllFilters}
                    className='inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  >
                    <X className='h-3 w-3' aria-hidden />
                    {i18n.filtersActive(activeFilterCount)} · {i18n.clearAll}
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        <div
          ref={feedScrollRef}
          className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain'
        >
          {error ? (
            <div className='p-4'>
              <AnnouncementError error={error} onRetry={onRetry} />
            </div>
          ) : isLoading ? (
            <div
              className='p-4'
              role='status'
              aria-live='polite'
              aria-label={i18n.loadingLabel}
            >
              <AnnouncementListSkeleton />
            </div>
          ) : visibleAnnouncements.length > 0 ? (
            <>
              <div ref={feedTopRef} aria-hidden />
              {newPostsCount > 0 && (
                <div className='sticky top-2 z-20 flex justify-center px-2 pt-2'>
                  <button
                    type='button'
                    onClick={handleScrollToTop}
                    className='inline-flex items-center gap-1.5 rounded-full bg-foreground/95 px-4 py-1.5 text-xs font-medium text-background shadow-lg backdrop-blur transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    aria-live='polite'
                  >
                    <ArrowUp className='h-3.5 w-3.5' aria-hidden />
                    {i18n.newPostsPill(newPostsCount)}
                  </button>
                </div>
              )}
              <div
                role='feed'
                aria-busy={isLoading}
                aria-label={i18n.feedLabel}
                className='space-y-2 px-2 py-2 sm:px-3'
              >
                {visibleAnnouncements.map((announcement, index) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    canManage={canManage}
                    onEdit={onEditAnnouncement}
                    onDelete={onDeleteAnnouncement}
                    onTogglePin={onTogglePinAnnouncement}
                    onCancelSchedule={onCancelSchedule}
                    onReschedulePublishAt={onReschedulePublishAt}
                    onResumeDraft={onResumeDraft}
                    onOpenAnalytics={onOpenAnalytics}
                    onMarkAsRead={onMarkAsRead}
                    readTrigger={readTrigger}
                    onSnapshotUnreadBeforeRead={onSnapshotUnreadBeforeRead}
                    onReadDiagnostic={onReadDiagnostic}
                    onLightboxDiagnostic={onLightboxDiagnostic}
                    posInSet={index + 1}
                    setSize={visibleAnnouncements.length}
                  />
                ))}
              </div>
              {visibleAnnouncements.length < filteredAnnouncements.length && (
                <div className='border-t border-neutral-100 px-4 py-3 dark:border-neutral-800/80'>
                  <button
                    type='button'
                    className='min-h-[44px] w-full rounded-full py-2.5 text-sm font-medium text-neutral-600 transition-colors duration-200 ease-out hover:bg-neutral-100/90 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100'
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  >
                    {i18n.showMore}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className='p-4'>
              <AnnouncementEmpty
                hasFilters={contentFilterCount > 0}
                scheduledTabEmpty={currentFilter === 'scheduled' && contentFilterCount === 0}
                draftsTabEmpty={currentFilter === 'drafts' && contentFilterCount === 0}
                onClearFilters={handleClearAllFilters}
              />
            </div>
          )}
        </div>
        {/* AT-only live region: announces unread-count deltas without affecting layout. */}
        <div role='status' aria-live='polite' aria-atomic='true' className='sr-only'>
          {unreadAnnouncement}
        </div>
      </div>

      <aside
        aria-label={`${i18n.unreadHeading} & ${i18n.pinnedHeading}`}
        className='mx-auto hidden w-full max-w-xs shrink-0 lg:mx-0 lg:block lg:max-w-[260px] lg:self-start'
      >
        <div className='space-y-3 lg:sticky lg:top-4'>
          <section
            aria-labelledby='announcements-unread-heading'
            className='relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/8 via-background to-background p-5 shadow-sm backdrop-blur'
          >
            <span aria-hidden className='pointer-events-none absolute -end-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl' />
            <h2
              id='announcements-unread-heading'
              className='text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground'
            >
              {i18n.unreadHeading}
            </h2>
            <p
              className='mt-1 text-4xl font-semibold tabular-nums tracking-tight text-foreground'
              aria-label={i18n.unreadAnnounce(unreadCount)}
            >
              {unreadCount}
            </p>
            <p className='mt-1 text-xs text-muted-foreground'>
              {unreadCount === 0 ? "You're all caught up." : 'announcement' + (unreadCount === 1 ? '' : 's') + ' to read'}
            </p>
          </section>
          <section
            aria-labelledby='announcements-pinned-heading'
            className='rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm backdrop-blur'
          >
            <h2
              id='announcements-pinned-heading'
              className='text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground'
            >
              {i18n.pinnedHeading}
            </h2>
            <p className='mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground'>
              {pinnedCount}
            </p>
            <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>
              {pinnedCount === 0
                ? 'No pinned posts right now.'
                : `pinned announcement${pinnedCount === 1 ? '' : 's'} at the top`}
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}
