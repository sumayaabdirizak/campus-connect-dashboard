'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Client-side pagination over an already-filtered row array. Resets to page 1
 * whenever `resetKey` changes (e.g. a search term or filter selection).
 */
export function usePagedRows<T>(rows: T[], resetKey: unknown, initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  return { page, setPage, pageSize, setPageSize, pageRows };
}
