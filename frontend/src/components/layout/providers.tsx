'use client';
import { useTheme } from 'next-themes';
import React, { useEffect } from 'react';
import { ActiveThemeProvider } from '../themes/active-theme';
import QueryProvider from './query-provider';

function DevChunkErrorProbe() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const logChunkIssue = (source: string, detail: unknown) => {
      const message =
        detail instanceof Error
          ? detail.message
          : typeof detail === 'string'
            ? detail
            : JSON.stringify(detail);
      const isChunk =
        message.includes('ChunkLoadError') ||
        message.includes('Loading chunk') ||
        message.includes('Failed to fetch dynamically imported module');

      if (!isChunk) return;

      // #region agent log
      fetch('http://127.0.0.1:7768/ingest/31870779-47f0-4312-b278-1c6da891de23', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '240e4e' },
        body: JSON.stringify({
          sessionId: '240e4e',
          location: 'providers.tsx:DevChunkErrorProbe',
          message: 'chunk load failure detected',
          data: {
            source,
            error: message,
            href: window.location.href,
            port: window.location.port
          },
          timestamp: Date.now(),
          hypothesisId: 'H-A',
          runId: 'chunk-debug'
        })
      }).catch(() => {});
      // #endregion
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      logChunkIssue('unhandledrejection', event.reason);
    };

    const onError = (event: ErrorEvent) => {
      logChunkIssue('error', event.message);
    };

    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('error', onError);
    };
  }, []);

  return null;
}

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <DevChunkErrorProbe />
      <ActiveThemeProvider initialTheme={activeThemeValue}>
        <QueryProvider>{children}</QueryProvider>
      </ActiveThemeProvider>
    </>
  );
}
