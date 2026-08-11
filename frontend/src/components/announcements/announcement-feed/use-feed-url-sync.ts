'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DateFilter, FeedTab, ReadFilter, SortMode } from './types';

/** Debounced URL sync for feed filters (role syncs immediately via a separate effect). */
export function useFeedUrlSync(opts: {
  currentFilter: FeedTab;
  searchQuery: string;
  roleFilter: string;
  readFilter: ReadFilter;
  dateFilter: DateFilter;
  sortMode: SortMode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const roleFilterRef = useRef(opts.roleFilter);
  roleFilterRef.current = opts.roleFilter;

  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    if (opts.roleFilter && opts.roleFilter !== 'ALL') params.set('role', opts.roleFilter);
    else params.delete('role');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.roleFilter, pathname, router]);

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
    setOrDelete('tab', opts.currentFilter, 'all');
    setOrDelete('q', opts.searchQuery, '');
    setOrDelete('role', roleFilterRef.current, 'ALL');
    setOrDelete('read', opts.readFilter, 'ALL');
    setOrDelete('date', opts.dateFilter, 'ALL');
    setOrDelete('sort', opts.sortMode, 'NEWEST');
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    const handle = window.setTimeout(() => {
      router.replace(next, { scroll: false });
    }, 250);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    opts.currentFilter,
    opts.searchQuery,
    opts.readFilter,
    opts.dateFilter,
    opts.sortMode
  ]);
}
