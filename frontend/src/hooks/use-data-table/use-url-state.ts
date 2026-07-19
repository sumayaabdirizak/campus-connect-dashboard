'use client';

import * as React from 'react';
import {
  type PaginationState,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import {
  type UseQueryStateOptions,
  parseAsInteger,
  useQueryState,
} from 'nuqs';
import { getSortingStateParser } from '@/lib/parsers';
import type { ExtendedColumnSort } from '@/types/data-table';
import { PAGE_KEY, PER_PAGE_KEY, SORT_KEY } from './constants';

export function useTableUrlPagination(
  queryStateOptions: Omit<UseQueryStateOptions<string>, 'parse'>,
  defaultPageSize: number
) {
  const [page, setPage] = useQueryState(
    PAGE_KEY,
    parseAsInteger.withOptions(queryStateOptions).withDefault(1)
  );
  const [perPage, setPerPage] = useQueryState(
    PER_PAGE_KEY,
    parseAsInteger.withOptions(queryStateOptions).withDefault(defaultPageSize)
  );

  const pagination: PaginationState = React.useMemo(
    () => ({ pageIndex: page - 1, pageSize: perPage }),
    [page, perPage]
  );

  const onPaginationChange = React.useCallback(
    (updaterOrValue: Updater<PaginationState>) => {
      if (typeof updaterOrValue === 'function') {
        const newPagination = updaterOrValue(pagination);
        void setPage(newPagination.pageIndex + 1);
        void setPerPage(newPagination.pageSize);
      } else {
        void setPage(updaterOrValue.pageIndex + 1);
        void setPerPage(updaterOrValue.pageSize);
      }
    },
    [pagination, setPage, setPerPage]
  );

  return { pagination, onPaginationChange, setPage };
}

export function useTableUrlSorting<TData>(
  queryStateOptions: Omit<UseQueryStateOptions<string>, 'parse'>,
  columnIds: Set<string>,
  defaultSorting: ExtendedColumnSort<TData>[]
) {
  const [sorting, setSorting] = useQueryState(
    SORT_KEY,
    getSortingStateParser<TData>(columnIds)
      .withOptions(queryStateOptions)
      .withDefault(defaultSorting)
  );

  const onSortingChange = React.useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      if (typeof updaterOrValue === 'function') {
        const newSorting = updaterOrValue(sorting);
        setSorting(newSorting as ExtendedColumnSort<TData>[]);
      } else {
        setSorting(updaterOrValue as ExtendedColumnSort<TData>[]);
      }
    },
    [sorting, setSorting]
  );

  return { sorting, onSortingChange };
}
