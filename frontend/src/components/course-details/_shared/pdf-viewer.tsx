'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { PdfScrollPages } from './pdf-scroll-pages';

// Serve the worker from public/ so there is no CDN dependency and no version
// mismatch. The file is copied from node_modules/pdfjs-dist/build/ by the
// `postinstall` script in package.json — keep both in sync.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * All PDFs — same-origin backend files AND external URLs — are routed through
 * the server-side proxy at /api/pdf so the browser never makes a cross-origin
 * request.  This prevents:
 *   1. The CORS "Failed to fetch" TypeError for external servers that have no
 *      Access-Control-Allow-Origin header.
 *   2. The React "UnknownErrorException" warning PDF.js emits when its internal
 *      XHR fails before onLoadError can suppress it.
 *
 * The proxy (/api/pdf/route.ts) handles auth by forwarding cookies for
 * same-origin backend URLs and skips cookies for external ones.
 */
function usePdfBlob(url: string) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const controller = new AbortController();

    setBlobUrl(null);
    setLoading(true);
    setFetchError(null);

    // Convert relative paths to absolute so the proxy can validate the scheme.
    const absUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;

    fetch(`/api/pdf?url=${encodeURIComponent(absUrl)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load PDF (HTTP ${res.status})`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch((e: Error) => {
        if (cancelled || e.name === 'AbortError') return;
        setFetchError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      // Defer revoke until after react-pdf's Document destroy runs in the
      // same unmount tick — revoking synchronously races page teardown.
      if (objectUrl) {
        const toRevoke = objectUrl;
        queueMicrotask(() => URL.revokeObjectURL(toRevoke));
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { blobUrl, loading, fetchError };
}

interface PdfViewerProps {
  url: string;
  /// Lets the page area grow to fill a full-screen parent instead of being
  /// capped at 70vh — a long document is unreadable in a short box.
  fillHeight?: boolean;
  /**
   * When false, drop the Document (file=null path) before the host unmounts
   * the viewer — avoids pdf.js teardown races that crash the Resources tab.
   */
  active?: boolean;
}

export function PdfViewer({ url, fillHeight, active = true }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  // Continuous scroll for full-screen readers; page-at-a-time in short embeds.
  const scrollMode = !!fillHeight;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { blobUrl, loading: blobLoading, fetchError } = usePdfBlob(url);
  const showDocument = active && !!blobUrl;

  useEffect(() => {
    setPageNumber(1);
    setError(null);
  }, [url]);

  /// In scroll mode the page box is a scroll position, not a mount target.
  const goToPage = useCallback(
    (n: number) => {
      setPageNumber(n);
      if (!scrollMode) return;
      const root = scrollRef.current;
      const slot = root?.querySelector<HTMLElement>(`[data-page="${n}"]`);
      if (slot && root) {
        root.scrollTo({ top: slot.offsetTop - root.offsetTop, behavior: 'smooth' });
      }
    },
    [scrollMode]
  );

  return (
    <div className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-2' : 'space-y-2'}>
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-1'>
          <Button
            size='icon'
            variant='outline'
            className='h-8 w-8'
            disabled={pageNumber <= 1}
            onClick={() => goToPage(Math.max(1, pageNumber - 1))}
          >
            <ChevronLeft className='w-4 h-4' />
          </Button>
          {/* Typeable page number — stepping through a 70-page document one
              click at a time is not navigation. */}
          <span className='flex items-center gap-1 px-2 text-xs text-muted-foreground'>
            Page
            <input
              type='number'
              min={1}
              max={numPages ?? 1}
              value={pageNumber}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n) || !numPages) return;
                goToPage(Math.min(numPages, Math.max(1, n)));
              }}
              aria-label='Page number'
              className='h-7 w-14 rounded-md border bg-background px-1.5 text-center text-xs tabular-nums'
            />
            / {numPages ?? '—'}
          </span>
          <Button
            size='icon'
            variant='outline'
            className='h-8 w-8'
            disabled={!numPages || pageNumber >= numPages}
            onClick={() => numPages && goToPage(Math.min(numPages, pageNumber + 1))}
          >
            <ChevronRight className='w-4 h-4' />
          </Button>
        </div>
        <div className='flex items-center gap-1'>
          <Button
            size='icon'
            variant='outline'
            className='h-8 w-8'
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
          >
            <ZoomOut className='w-4 h-4' />
          </Button>
          <span className='text-xs px-2 text-muted-foreground'>{Math.round(scale * 100)}%</span>
          <Button
            size='icon'
            variant='outline'
            className='h-8 w-8'
            onClick={() => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))}
          >
            <ZoomIn className='w-4 h-4' />
          </Button>
          <a
            href={blobUrl ?? undefined}
            target='_blank'
            rel='noreferrer'
            aria-disabled={!blobUrl}
            onClick={(e) => {
              if (!blobUrl) {
                e.preventDefault();
                return;
              }
            }}
            className={`text-xs underline ml-2 ${
              blobUrl
                ? 'text-muted-foreground'
                : 'pointer-events-none text-muted-foreground/50 no-underline'
            }`}
          >
            Open in new tab
          </a>
        </div>
      </div>
      <div
        ref={scrollRef}
        className={`flex justify-center overflow-auto rounded-lg border bg-muted/20 ${
          fillHeight ? 'min-h-0 flex-1 p-4' : 'max-h-[70vh]'
        }`}
      >
        {fetchError || error ? (
          <p className='text-sm text-destructive p-4'>{fetchError ?? error}</p>
        ) : blobLoading || !active ? (
          <p className='text-sm text-muted-foreground p-4 flex items-center gap-2'>
            {active ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' /> Loading PDF…
              </>
            ) : (
              'Closing…'
            )}
          </p>
        ) : showDocument ? (
          <Document
            file={blobUrl}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setError(null); }}
            onLoadError={(e) => setError(e.message)}
            loading={<p className='text-sm text-muted-foreground p-4'>Rendering…</p>}
            error={<p className='text-sm text-destructive p-4'>Could not render this PDF.</p>}
          >
            {scrollMode && numPages ? (
              <PdfScrollPages
                numPages={numPages}
                scale={scale}
                scrollRef={scrollRef}
                activePage={pageNumber}
                onVisiblePageChange={setPageNumber}
              />
            ) : (
              <Page pageNumber={pageNumber} scale={scale} />
            )}
          </Document>
        ) : null}
      </div>
    </div>
  );
}
