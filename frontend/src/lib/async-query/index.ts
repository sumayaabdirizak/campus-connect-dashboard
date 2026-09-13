'use client';

import { useMemo } from 'react';
import {
  getQueryData,
  invalidateQueries,
  queryOptions,
  setQueryData,
  updateQueriesDataByPrefix,
} from './cache';
import { useMutation } from './use-mutation';
import { useQuery } from './use-query';

export type { QueryKey, QueryFunctionContext, MutateCallbacks } from './types';
export {
  invalidateQueries,
  getQueryData,
  setQueryData,
  updateQueriesDataByPrefix,
  queryOptions,
};
export { useQuery } from './use-query';
export { useMutation } from './use-mutation';

export function useQueryClient() {
  return useMemo(
    () => ({
      invalidateQueries: (o: { queryKey: import('./types').QueryKey }) => invalidateQueries(o),
      cancelQueries: async (_opts?: { queryKey?: import('./types').QueryKey }) => {},
      getQueryData: <T>(key: import('./types').QueryKey) => getQueryData<T>(key),
      setQueryData: <T>(key: import('./types').QueryKey, updater: T | ((old: T | undefined) => T)) =>
        setQueryData(key, updater),
      updateQueriesDataByPrefix: <T>(
        prefix: import('./types').QueryKey,
        updater: (old: T | undefined, key: import('./types').QueryKey) => T
      ) => updateQueriesDataByPrefix(prefix, updater),
    }),
    []
  );
}

export type AsyncQueryClient = ReturnType<typeof useQueryClient>;
