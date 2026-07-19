/** Compatible with TanStack-style `as const` query keys. */
export type QueryKey = readonly unknown[];

export type QueryFunctionContext<TQueryKey extends QueryKey = QueryKey> = {
  queryKey: TQueryKey;
};

export type MutateCallbacks<TData, TVars> = {
  onSuccess?: (data: TData, vars: TVars) => void;
  onError?: (error: Error, vars: TVars) => void;
  onSettled?: () => void;
};

export function serializeKey(key: QueryKey): string {
  try {
    return JSON.stringify(key);
  } catch {
    return String(key);
  }
}

export function prefixMatch(filterPrefix: QueryKey, candidateKey: QueryKey): boolean {
  if (filterPrefix.length > candidateKey.length) return false;
  for (let i = 0; i < filterPrefix.length; i++) {
    if (filterPrefix[i] !== candidateKey[i]) return false;
  }
  return true;
}
