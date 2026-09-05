import { prefixMatch, serializeKey, type QueryKey } from './types';

const dataCache = new Map<string, unknown>();
const exactListeners = new Map<string, Set<() => void>>();
const lastFetchedAt = new Map<string, number>();
const errorCache = new Map<string, Error>();
const inFlightFetches = new Map<string, Promise<unknown>>();
/** Bumped on invalidate / force so abandoned in-flight responses cannot commit. */
const fetchGeneration = new Map<string, number>();

type InvalidateSubscriber = { key: QueryKey; invalidate: () => void };
const invalidateSubs = new Set<InvalidateSubscriber>();

function notifyExactSerialized(serialized: string) {
  exactListeners.get(serialized)?.forEach((fn) => fn());
}

function bumpGeneration(serialized: string): number {
  const next = (fetchGeneration.get(serialized) ?? 0) + 1;
  fetchGeneration.set(serialized, next);
  return next;
}

export function getFetchGeneration(serialized: string): number {
  return fetchGeneration.get(serialized) ?? 0;
}

export function bumpFetchGeneration(serialized: string): number {
  return bumpGeneration(serialized);
}

export function subscribeExact(key: QueryKey, listener: () => void) {
  const serialized = serializeKey(key);
  if (!exactListeners.has(serialized)) exactListeners.set(serialized, new Set());
  exactListeners.get(serialized)!.add(listener);
  return () => {
    exactListeners.get(serialized)?.delete(listener);
  };
}

export function subscribeInvalidate(key: QueryKey, invalidate: () => void) {
  const sub: InvalidateSubscriber = { key, invalidate };
  invalidateSubs.add(sub);
  return () => {
    invalidateSubs.delete(sub);
  };
}

export function invalidateQueries(opts: { queryKey: QueryKey }) {
  const filter = opts.queryKey;
  const touch = (serialized: string) => {
    lastFetchedAt.delete(serialized);
    errorCache.delete(serialized);
    inFlightFetches.delete(serialized);
    bumpGeneration(serialized);
  };
  const snapshot = Array.from(
    new Set([...lastFetchedAt.keys(), ...dataCache.keys(), ...inFlightFetches.keys()])
  );
  for (const serialized of snapshot) {
    let parsed: QueryKey | null = null;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      parsed = null;
    }
    if (parsed && Array.isArray(parsed) && prefixMatch(filter, parsed as QueryKey)) {
      touch(serialized);
    }
  }
  for (const sub of invalidateSubs) {
    if (prefixMatch(filter, sub.key)) sub.invalidate();
  }
}

export function getQueryData<T>(key: QueryKey): T | undefined {
  return dataCache.get(serializeKey(key)) as T | undefined;
}

export function setQueryData<T>(key: QueryKey, updater: T | ((old: T | undefined) => T)): void {
  const serialized = serializeKey(key);
  const prev = dataCache.get(serialized) as T | undefined;
  const next =
    typeof updater === 'function' ? (updater as (old: T | undefined) => T)(prev) : updater;
  dataCache.set(serialized, next);
  errorCache.delete(serialized);
  lastFetchedAt.set(serialized, Date.now());
  notifyExactSerialized(serialized);
}

export function updateQueriesDataByPrefix<T>(
  prefix: QueryKey,
  updater: (old: T | undefined, key: QueryKey) => T
): void {
  for (const serialized of Array.from(dataCache.keys())) {
    let key: QueryKey;
    try {
      key = JSON.parse(serialized) as QueryKey;
    } catch {
      continue;
    }
    if (!Array.isArray(key) || !prefixMatch(prefix, key)) continue;
    const prev = dataCache.get(serialized) as T | undefined;
    const next = updater(prev, key);
    dataCache.set(serialized, next);
    errorCache.delete(serialized);
    lastFetchedAt.set(serialized, Date.now());
    notifyExactSerialized(serialized);
  }
}

export function getCachedData<T>(serialized: string): T | undefined {
  return dataCache.get(serialized) as T | undefined;
}

export function getCachedError(serialized: string): Error | undefined {
  return errorCache.get(serialized);
}

export function hasCachedError(serialized: string): boolean {
  return errorCache.has(serialized);
}

export function getLastFetchedAt(serialized: string): number | undefined {
  return lastFetchedAt.get(serialized);
}

export function setFetchSuccess(serialized: string, result: unknown) {
  dataCache.set(serialized, result);
  errorCache.delete(serialized);
  lastFetchedAt.set(serialized, Date.now());
  notifyExactSerialized(serialized);
}

export function setFetchError(serialized: string, err: Error) {
  errorCache.set(serialized, err);
  // Do not delete successful data — a failed refresh should not erase the
  // last good report from the cache (UI can keep showing it).
  lastFetchedAt.set(serialized, Date.now());
}

export function getInFlightFetch<T>(serialized: string): Promise<T> | undefined {
  return inFlightFetches.get(serialized) as Promise<T> | undefined;
}

export function setInFlightFetch(serialized: string, promise: Promise<unknown>) {
  inFlightFetches.set(serialized, promise);
}

export function deleteInFlightFetch(serialized: string) {
  inFlightFetches.delete(serialized);
}

export function queryOptions<T>(opts: {
  queryKey: QueryKey;
  queryFn: (ctx: import('./types').QueryFunctionContext) => Promise<T>;
}) {
  return opts;
}
