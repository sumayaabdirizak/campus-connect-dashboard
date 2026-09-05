'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  bumpFetchGeneration,
  deleteInFlightFetch,
  getCachedData,
  getCachedError,
  getFetchGeneration,
  getInFlightFetch,
  getLastFetchedAt,
  hasCachedError,
  setFetchError,
  setFetchSuccess,
  setInFlightFetch,
  subscribeExact,
  subscribeInvalidate,
} from './cache';
import { serializeKey, type QueryFunctionContext, type QueryKey } from './types';

type UseQueryOptions<T> = {
  queryKey: QueryKey;
  queryFn: (ctx: QueryFunctionContext) => T | Promise<T>;
  enabled?: boolean;
  refetchInterval?: number | false;
  staleTime?: number;
  /** Refetch when the tab regains focus or becomes visible (if data is stale). */
  refetchOnWindowFocus?: boolean;
};

type ExecuteFetchOptions = {
  /**
   * Bypass staleTime, drop any in-flight fetch and start a fresh one.
   * For deliberate user actions — a Refresh button, or invalidate() after a
   * mutation — where the response in flight may already be out of date.
   */
  force?: boolean;
  /**
   * Bypass staleTime but *join* a fetch already in flight rather than
   * replacing it. Poll ticks used `force`, which deleted the in-flight entry
   * on every tick — so any component asking for the same key at that moment
   * could no longer deduplicate against it and issued a second identical
   * request. A tick only wants fresh data; it has no reason to discard a
   * response that is already on its way.
   */
  poll?: boolean;
};

export function useQuery<T>(opts: UseQueryOptions<T>) {
  const queryKey = opts.queryKey;
  const serialized = serializeKey(queryKey);
  const enabled = opts.enabled !== false;

  const [data, setData] = useState<T | undefined>(() => getCachedData<T>(serialized));
  const [isLoading, setIsLoading] = useState(
    () => enabled && getCachedData(serialized) === undefined && !hasCachedError(serialized)
  );
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(() => getCachedError(serialized) ?? null);
  const [fetchVersion, setFetchVersion] = useState(0);

  const queryFnRef = useRef(opts.queryFn);
  queryFnRef.current = opts.queryFn;
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;
  const staleTime = opts.staleTime ?? 30_000;
  const refetchOnWindowFocus = opts.refetchOnWindowFocus ?? false;

  // When the query key changes, re-bind React state to that key's cache entry
  // so a previous subject's data/error cannot leak into the new view.
  useEffect(() => {
    const cached = getCachedData<T>(serialized);
    setData(cached);
    // Prefer cached data over a stale refresh error for this key.
    setError(cached !== undefined ? null : (getCachedError(serialized) ?? null));
    setIsLoading(
      enabled && cached === undefined && !hasCachedError(serialized)
    );
    setIsFetching(false);
  }, [serialized, enabled]);

  const isQueryStale = useCallback(() => {
    const cachedAt = getLastFetchedAt(serialized);
    if (cachedAt == null) return true;
    if (staleTime === 0) return true;
    return Date.now() - cachedAt >= staleTime;
  }, [serialized, staleTime]);

  const executeFetch = useCallback(
    async (fetchOpts?: ExecuteFetchOptions) => {
      if (!enabled) {
        setIsLoading(false);
        return null as T | null;
      }

      const force = fetchOpts?.force === true;
      const poll = fetchOpts?.poll === true;
      const cachedNow = getCachedData<T>(serialized);
      const hasCachedData = cachedNow !== undefined;
      if (hasCachedData) {
        setData(cachedNow);
        setIsLoading(false);
      }

      // Only successful responses honor staleTime. Cached errors always refetch
      // so a transient 403/500 does not stick as an empty UI for the stale window.
      // Forced refetches (Refresh / poll ticks) always go to the network.
      if (!force && !poll && staleTime > 0) {
        const cachedAt = getLastFetchedAt(serialized);
        if (cachedAt != null && Date.now() - cachedAt < staleTime) {
          const cached = getCachedData<T>(serialized);
          if (cached !== undefined) {
            setData(cached);
            setError(null);
            setIsLoading(false);
            return cached;
          }
        }
      }

      // Force/invalidate must not reuse or be overwritten by an older in-flight.
      if (force) {
        deleteInFlightFetch(serialized);
        bumpFetchGeneration(serialized);
      }

      const gen = getFetchGeneration(serialized);

      let promise = getInFlightFetch<T>(serialized);
      if (!promise) {
        const created = (async () => {
          try {
            const result = await queryFnRef.current({ queryKey: queryKeyRef.current });
            // Abandoned: a newer invalidate/force bumped generation.
            if (getFetchGeneration(serialized) !== gen) return result;
            setFetchSuccess(serialized, result);
            return result;
          } catch (err) {
            if (getFetchGeneration(serialized) === gen) {
              setFetchError(serialized, err instanceof Error ? err : new Error(String(err)));
            }
            throw err;
          } finally {
            if (getInFlightFetch(serialized) === created) {
              deleteInFlightFetch(serialized);
            }
          }
        })();
        promise = created;
        setInFlightFetch(serialized, created);
      }

      if (!hasCachedData) setIsLoading(true);
      setIsFetching(true);
      setError(null);
      try {
        const result = await promise;
        // Stale completion after a newer fetch — keep current UI/cache.
        if (getFetchGeneration(serialized) !== gen) {
          return getCachedData<T>(serialized) ?? null;
        }
        setData(result);
        return result;
      } catch (e) {
        if (getFetchGeneration(serialized) !== gen) {
          return getCachedData<T>(serialized) ?? null;
        }
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        return null;
      } finally {
        if (getFetchGeneration(serialized) === gen) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    },
    [enabled, serialized, staleTime]
  );

  useEffect(() => {
    // fetchVersion > 0 means invalidate() ran — always bypass staleTime.
    void executeFetch(fetchVersion > 0 ? { force: true } : undefined);
  }, [executeFetch, fetchVersion]);

  const invalidate = useCallback(() => setFetchVersion((v) => v + 1), []);

  useEffect(() => {
    if (!enabled) return;
    return subscribeInvalidate(queryKey, invalidate);
  }, [enabled, serialized, invalidate, queryKey]);

  useEffect(() => {
    return subscribeExact(queryKey, () => setData(getCachedData<T>(serialized)));
  }, [serialized, queryKey]);

  useEffect(() => {
    if (!enabled || !opts.refetchInterval) return;

    // A hidden tab has nobody looking at it, so a tick there buys nothing and
    // costs a request. Left running, a tab open overnight polls all night —
    // and with ~11 pollers on a course page that is a lot of traffic for a
    // screen nobody is reading.
    const tick = () => {
      if (document.hidden) return;
      void executeFetch({ poll: true });
    };
    const id = window.setInterval(tick, opts.refetchInterval);

    // Coming back to the tab should catch up immediately rather than waiting
    // out the remainder of an interval that was skipped while hidden.
    const onVisible = () => {
      if (!document.hidden) void executeFetch({ poll: true });
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, opts.refetchInterval, executeFetch]);

  useEffect(() => {
    if (!enabled || !refetchOnWindowFocus) return;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (isQueryStale()) invalidate();
    };

    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, refetchOnWindowFocus, invalidate, isQueryStale]);

  const refetch = useCallback(async () => {
    await executeFetch({ force: true });
    return { data: getCachedData<T>(serialized) };
  }, [executeFetch, serialized]);

  return {
    data,
    isLoading,
    isFetching,
    isPending: isLoading,
    error,
    isSuccess: !isLoading && !error && data !== undefined,
    isError: error != null,
    refetch,
  };
}
