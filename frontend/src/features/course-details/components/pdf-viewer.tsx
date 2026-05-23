'use client';

import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

// pdf.js ships its worker as an ESM file in modern bundles. Pin to the same
// version that's installed so worker and core stay in lockstep.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);

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
        {error ? (
          <p className='text-sm text-destructive p-4'>{error}</p>
        ) : (
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(e) => setError(e.message)}
            loading={<p className='text-sm text-muted-foreground p-4'>Loading PDF…</p>}
            error={<p className='text-sm text-destructive p-4'>Could not load this PDF.</p>}
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
