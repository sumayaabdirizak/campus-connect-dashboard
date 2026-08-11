'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteInFlightFetch,
  getCachedData,
  getCachedError,
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

  const executeFetch = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return null as T | null;
    }

    const cachedNow = getCachedData<T>(serialized);
    const hasCachedData = cachedNow !== undefined;
    if (hasCachedData) {
      setData(cachedNow);
      setIsLoading(false);
    }

    // Only successful responses honor staleTime. Cached errors always refetch
    // so a transient 403/500 does not stick as an empty UI for the stale window.
    if (staleTime > 0) {
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

    let promise = getInFlightFetch<T>(serialized);
    if (!promise) {
      promise = (async () => {
        try {
          const result = await queryFnRef.current({ queryKey: queryKeyRef.current });
          setFetchSuccess(serialized, result);
          return result;
        } catch (err) {
          setFetchError(serialized, err instanceof Error ? err : new Error(String(err)));
          throw err;
        } finally {
          deleteInFlightFetch(serialized);
        }
      })();
      setInFlightFetch(serialized, promise);
    }

    if (!hasCachedData) setIsLoading(true);
    setIsFetching(true);
    setError(null);
    try {
      const result = await promise;
      setData(result);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      return null;
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [enabled, serialized, staleTime]);

  useEffect(() => {
    void executeFetch();
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
    const id = window.setInterval(() => void executeFetch(), opts.refetchInterval);
    return () => window.clearInterval(id);
  }, [enabled, opts.refetchInterval, executeFetch]);

  const refetch = useCallback(async () => {
    await executeFetch();
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
