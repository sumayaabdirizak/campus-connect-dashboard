import { AlertTriangle, Download } from 'lucide-react';

export function MediaPlayerFallback({
  kind,
  title,
  url
}: {
  kind: 'video' | 'audio';
  title: string;
  url: string;
}) {
  return (
    <div className='border rounded-lg p-4 flex items-center justify-between gap-3'>
      <div className='flex items-center gap-2 min-w-0 text-sm text-muted-foreground'>
        <AlertTriangle className='w-4 h-4 text-amber-500 shrink-0' />
        <span className='truncate'>This {kind} couldn’t be played.</span>
      </div>
      <a
        href={url}
        className='inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-muted/30 shrink-0'
        aria-label={`Download ${title}`}
      >
        <Download className='w-4 h-4' />
        <span className='hidden sm:inline'>Download</span>
      </a>
    </div>
  );
}
