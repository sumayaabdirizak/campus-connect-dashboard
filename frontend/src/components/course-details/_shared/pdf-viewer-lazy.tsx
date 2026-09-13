'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

/**
 * The PDF engine, fetched only when a PDF is actually shown.
 *
 * react-pdf plus pdfjs is the largest dependency on the course page, and it
 * was imported statically by both the grading drawer and the resource dialog
 * — so every visitor downloaded a document renderer whether or not they ever
 * opened a document. It is behind a dialog in both cases, which makes it a
 * natural split point: by the time the chunk is needed, the user has clicked.
 *
 * `ssr: false` because pdfjs reaches for browser APIs (canvas, workers) that
 * do not exist while rendering on the server.
 */
export const PdfViewer = dynamic(
  () => import('./pdf-viewer').then((m) => m.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className='flex min-h-[12rem] items-center justify-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='size-4 animate-spin' aria-hidden />
        Loading document viewer…
      </div>
    )
  }
);
