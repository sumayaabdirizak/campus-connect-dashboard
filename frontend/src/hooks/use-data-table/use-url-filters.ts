'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type Updater,
} from '@tanstack/react-table';
import {
  type Parser,
  type UseQueryStateOptions,
  parseAsArrayOf,
  parseAsString,
  useQueryStates,
} from 'nuqs';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { ARRAY_SEPARATOR, DEBOUNCE_MS } from './constants';

export function useTableUrlFilters<TData>(
  columns: ColumnDef<TData, unknown>[],
  queryStateOptions: Omit<UseQueryStateOptions<string>, 'parse'>,
  enableAdvancedFilter: boolean,
  debounceMs: number,
  setPage: (page: number) => void
) {
  const filterableColumns = React.useMemo(() => {
    if (enableAdvancedFilter) return [];
    return columns.filter((column) => column.enableColumnFilter);
  }, [columns, enableAdvancedFilter]);

  const filterParsers = React.useMemo(() => {
    if (enableAdvancedFilter) return {};

    return filterableColumns.reduce<Record<string, Parser<string> | Parser<string[]>>>(
      (acc, column) => {
        if (column.meta?.options) {
          acc[column.id ?? ''] = parseAsArrayOf(parseAsString, ARRAY_SEPARATOR).withOptions(
            queryStateOptions
          );
        } else {
          acc[column.id ?? ''] = parseAsString.withOptions(queryStateOptions);
        }
        return acc;
      },
      {}
    );
  }, [filterableColumns, queryStateOptions, enableAdvancedFilter]);

  const [filterValues, setFilterValues] = useQueryStates(filterParsers);

  const debouncedSetFilterValues = useDebouncedCallback((values: typeof filterValues) => {
    void setPage(1);
    void setFilterValues(values);
  }, debounceMs);

  const initialColumnFilters: ColumnFiltersState = React.useMemo(() => {
    if (enableAdvancedFilter) return [];

    return Object.entries(filterValues).reduce<ColumnFiltersState>((filters, [key, value]) => {
      if (value !== null) {
        const processedValue = Array.isArray(value)
          ? value
          : typeof value === 'string' && /[^a-zA-Z0-9]/.test(value)
            ? value.split(/[^a-zA-Z0-9]+/).filter(Boolean)
            : [value];

        filters.push({ id: key, value: processedValue });
      }
      return filters;
    }, []);
  }, [filterValues, enableAdvancedFilter]);

  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>(initialColumnFilters);

  const onColumnFiltersChange = React.useCallback(
    (updaterOrValue: Updater<ColumnFiltersState>) => {
      if (enableAdvancedFilter) return;

      setColumnFilters((prev) => {
        const next = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue;

        const filterUpdates = next.reduce<Record<string, string | string[] | null>>(
          (acc, filter) => {
            if (filterableColumns.find((column) => column.id === filter.id)) {
              acc[filter.id] = filter.value as string | string[];
            }
            return acc;
          },
          {}
        );

        for (const prevFilter of prev) {
          if (!next.some((filter) => filter.id === prevFilter.id)) {
            filterUpdates[prevFilter.id] = null;
          }
        }

        debouncedSetFilterValues(filterUpdates);
        return next;
      });
    },
    [debouncedSetFilterValues, filterableColumns, enableAdvancedFilter]
  );

  return { columnFilters, onColumnFiltersChange };
}

export { DEBOUNCE_MS };
