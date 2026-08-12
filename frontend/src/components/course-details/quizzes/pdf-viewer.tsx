'use client';

import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Loader2 } from 'lucide-react';

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
    let revoked = false;
    let objectUrl: string | null = null;

    setBlobUrl(null);
    setLoading(true);
    setFetchError(null);

    // Convert relative paths to absolute so the proxy can validate the scheme.
    const absUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;

    fetch(`/api/pdf?url=${encodeURIComponent(absUrl)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load PDF (HTTP ${res.status})`);
        return res.blob();
      })
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch((e: Error) => {
        if (!revoked) setFetchError(e.message);
      })
      .finally(() => {
        if (!revoked) setLoading(false);
      });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { blobUrl, loading, fetchError };
}

interface PdfViewerProps {
  url: string;
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const { blobUrl, loading: blobLoading, fetchError } = usePdfBlob(url);

  useEffect(() => {
    setPageNumber(1);
    setError(null);
  }, [url]);

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-1'>
          <Button
            size='icon'
            variant='outline'
            className='h-8 w-8'
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className='w-4 h-4' />
          </Button>
          <span className='text-xs px-2 text-muted-foreground'>
            Page {pageNumber} / {numPages ?? '—'}
          </span>
          <Button
            size='icon'
            variant='outline'
            className='h-8 w-8'
            disabled={!numPages || pageNumber >= numPages}
            onClick={() => setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p))}
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
            href={url}
            target='_blank'
            rel='noreferrer'
            className='text-xs underline text-muted-foreground ml-2'
          >
            Open in new tab
          </a>
        </div>
      </div>
      <div className='border rounded-lg overflow-auto bg-muted/20 max-h-[70vh] flex justify-center'>
        {fetchError || error ? (
          <p className='text-sm text-destructive p-4'>{fetchError ?? error}</p>
        ) : blobLoading ? (
          <p className='text-sm text-muted-foreground p-4 flex items-center gap-2'>
            <Loader2 className='w-4 h-4 animate-spin' /> Loading PDF…
          </p>
        ) : (
          <Document
            file={blobUrl}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setError(null); }}
            onLoadError={(e) => setError(e.message)}
            loading={<p className='text-sm text-muted-foreground p-4'>Rendering…</p>}
            error={<p className='text-sm text-destructive p-4'>Could not render this PDF.</p>}
          >
            <Page pageNumber={pageNumber} scale={scale} />
          </Document>
        )}
      </div>
    </div>
  );
}

export function isPdfUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url, 'http://x');
    return u.pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return /\.pdf(\?|#|$)/i.test(url);
  }
}
