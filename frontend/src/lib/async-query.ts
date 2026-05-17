'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Compatible with TanStack-style `as const` query keys. */
export type QueryKey = readonly unknown[];

export type QueryFunctionContext<TQueryKey extends QueryKey = QueryKey> = {
  queryKey: TQueryKey;
};

function serializeKey(key: QueryKey): string {
  try {
    return JSON.stringify(key);
  } catch {
    return String(key);
  }
}

function prefixMatch(filterPrefix: QueryKey, candidateKey: QueryKey): boolean {
  if (filterPrefix.length > candidateKey.length) return false;
  for (let i = 0; i < filterPrefix.length; i++) {
    if (filterPrefix[i] !== candidateKey[i]) return false;
  }
  return true;
}

const dataCache = new Map<string, unknown>();
const exactListeners = new Map<string, Set<() => void>>();

/** Last successful fetch timestamp per serialized key. Drives staleTime. */
const lastFetchedAt = new Map<string, number>();

/** In-flight fetch promise per serialized key. Lets multiple subscribers
 *  share one network call instead of each issuing their own.
 */
const inFlightFetches = new Map<string, Promise<unknown>>();

function notifyExactSerialized(serialized: string) {
  exactListeners.get(serialized)?.forEach((fn) => fn());
}

function subscribeExact(key: QueryKey, listener: () => void) {
  const serialized = serializeKey(key);
  if (!exactListeners.has(serialized)) exactListeners.set(serialized, new Set());
  exactListeners.get(serialized)!.add(listener);
  return () => {
    exactListeners.get(serialized)?.delete(listener);
  };
}

type InvalidateSubscriber = { key: QueryKey; invalidate: () => void };
const invalidateSubs = new Set<InvalidateSubscriber>();

function subscribeInvalidate(key: QueryKey, invalidate: () => void) {
  const sub: InvalidateSubscriber = { key, invalidate };
  invalidateSubs.add(sub);
  return () => {
    invalidateSubs.delete(sub);
  };
}

export function invalidateQueries(opts: { queryKey: QueryKey }) {
  const filter = opts.queryKey;
  // Mark every matching key as stale so the next fetch isn't skipped by the
  // staleTime gate. Iterate the cache directly because a key may have data
  // but no live subscriber yet (e.g. socket pre-warmed it).
  // Snapshot keys: deletion mid-iteration is safe with Map iterators, but
  // doing so explicitly here documents the intent.
  const snapshot = Array.from(lastFetchedAt.keys());
  for (const serialized of snapshot) {
    let parsed: QueryKey | null = null;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      parsed = null;
    }
    if (parsed && Array.isArray(parsed) && prefixMatch(filter, parsed as QueryKey)) {
      lastFetchedAt.delete(serialized);
    }
  }
  for (const sub of invalidateSubs) {
    if (prefixMatch(filter, sub.key)) {
      sub.invalidate();
    }
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
  // Treat directly written data as fresh — socket handlers and optimistic
  // mutations push real data here and shouldn't be re-fetched immediately.
  lastFetchedAt.set(serialized, Date.now());
  notifyExactSerialized(serialized);
}

/**
 * Apply `updater` to every cached query whose key starts with `prefix`
 * (same rule as {@link invalidateQueries}). Notifies each updated subscriber.
 */
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
    lastFetchedAt.set(serialized, Date.now());
    notifyExactSerialized(serialized);
  }
}

export function queryOptions<T>(opts: {
  queryKey: QueryKey;
  queryFn: (ctx: QueryFunctionContext) => Promise<T>;
}) {
  return opts;
}

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

  const [data, setData] = useState<T | undefined>(() => dataCache.get(serialized) as T | undefined);
  const [isLoading, setIsLoading] = useState(
    () => enabled && dataCache.get(serialized) === undefined
  );
  const [error, setError] = useState<Error | null>(null);
  const [fetchVersion, setFetchVersion] = useState(0);

  const queryFnRef = useRef(opts.queryFn);
  queryFnRef.current = opts.queryFn;
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  const staleTime = opts.staleTime ?? 0;

  const executeFetch = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return null as T | null;
    }

    // Honor staleTime — skip the network call if we have a recent successful
    // fetch. This is the primary fix for the "every component remounts =
    // every component refetches" stampede that hit us with channel rows.
    if (staleTime > 0) {
      const cachedAt = lastFetchedAt.get(serialized);
      const cached = dataCache.get(serialized) as T | undefined;
      if (cachedAt != null && cached !== undefined && Date.now() - cachedAt < staleTime) {
        setData(cached);
        setIsLoading(false);
        return cached;
      }
    }

    // Coalesce concurrent fetches for the same key. The first subscriber
    // owns the network call; everyone else awaits the same promise.
    let promise = inFlightFetches.get(serialized) as Promise<T> | undefined;
    if (!promise) {
      promise = (async () => {
        try {
          const result = await queryFnRef.current({
            queryKey: queryKeyRef.current
          });
          dataCache.set(serialized, result);
          lastFetchedAt.set(serialized, Date.now());
          notifyExactSerialized(serialized);
          return result;
        } finally {
          inFlightFetches.delete(serialized);
        }
      })();
      inFlightFetches.set(serialized, promise);
    }

    setIsLoading(true);
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
    }
  }, [enabled, serialized, staleTime]);

  useEffect(() => {
    void executeFetch();
  }, [executeFetch, fetchVersion]);

  const invalidate = useCallback(() => {
    setFetchVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    return subscribeInvalidate(queryKey, invalidate);
  }, [enabled, serialized, invalidate, queryKey]);

  useEffect(() => {
    return subscribeExact(queryKey, () => {
      setData(dataCache.get(serialized) as T | undefined);
    });
  }, [serialized, queryKey]);

  useEffect(() => {
    if (!enabled || !opts.refetchInterval) return;
    const id = window.setInterval(() => void executeFetch(), opts.refetchInterval);
    return () => window.clearInterval(id);
  }, [enabled, opts.refetchInterval, executeFetch]);

  const refetch = useCallback(async () => {
    await executeFetch();
    return { data: dataCache.get(serialized) as T | undefined };
  }, [executeFetch, serialized]);

  const isSuccess = !isLoading && !error && data !== undefined;
  const isError = error != null;

  return {
    data,
    isLoading,
    isFetching: isLoading,
    isPending: isLoading,
    error,
    isSuccess,
    isError,
    refetch
  };
}

type MutationOptions<TData, TVars> = {
  mutationFn: (vars: TVars) => Promise<TData>;
  onSuccess?: (data: TData, vars: TVars, context: unknown) => void;
  onError?: (error: Error, vars: TVars, context: unknown) => void;
  onMutate?: (vars: TVars) => unknown | Promise<unknown>;
  onSettled?: (data: TData | undefined, error: Error | null, vars: TVars, context: unknown) => void;
};

export type MutateCallbacks<TData, TVars> = {
  onSuccess?: (data: TData, vars: TVars) => void;
  onError?: (error: Error, vars: TVars) => void;
  onSettled?: () => void;
};

export function useMutation<TData = unknown, TVars = void>(opts: MutationOptions<TData, TVars>) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const [isPending, setIsPending] = useState(false);

  const run = useCallback(async (vars: TVars, call?: MutateCallbacks<TData, TVars>) => {
    const o = optsRef.current;
    let context: unknown;
    let result: TData | undefined;
    let err: Error | null = null;
    setIsPending(true);
    try {
      if (o.onMutate) {
        context = await o.onMutate(vars);
      }
      result = await o.mutationFn(vars);
      o.onSuccess?.(result, vars, context);
      call?.onSuccess?.(result, vars);
      return result;
    } catch (e) {
      err = e instanceof Error ? e : new Error(String(e));
      o.onError?.(err, vars, context);
      call?.onError?.(err, vars);
      throw err;
    } finally {
      optsRef.current.onSettled?.(result, err, vars, context);
      call?.onSettled?.();
      setIsPending(false);
    }
  }, []);

  const mutate = useCallback(
    (vars: TVars, call?: MutateCallbacks<TData, TVars>) => {
      // Fire-and-forget: errors are surfaced via the mutation's onError /
      // call.onError callbacks. Swallow the rejection here so it doesn't
      // become an unhandled promise rejection (which Next.js dev mode
      // surfaces as a runtime error overlay).
      run(vars, call).catch(() => {});
    },
    [run]
  );

  const mutateAsync = useCallback(
    (vars: TVars, call?: MutateCallbacks<TData, TVars>) => run(vars, call),
    [run]
  );

  return { mutate, mutateAsync, isPending };
}

export function useQueryClient() {
  return useMemo(
    () => ({
      invalidateQueries: (o: { queryKey: QueryKey }) => invalidateQueries(o),
      cancelQueries: async (_opts?: { queryKey?: QueryKey }) => {},
      getQueryData: <T>(key: QueryKey) => getQueryData<T>(key),
      setQueryData: <T>(key: QueryKey, updater: T | ((old: T | undefined) => T)) =>
        setQueryData(key, updater),
      updateQueriesDataByPrefix: <T>(prefix: QueryKey, updater: (old: T | undefined, key: QueryKey) => T) =>
        updateQueriesDataByPrefix(prefix, updater)
    }),
    []
  );
}
