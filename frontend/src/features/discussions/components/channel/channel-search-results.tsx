import { Icons } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { DiscussionMessage } from '../../api/types';
import { SearchResultRow } from './channel-search-result-row';

export function ChannelSearchResults({
  query,
  textForApi,
  hasFilters,
  canRunSearch,
  isLoading,
  results,
  scope,
  hasMore,
  onSelect,
}: {
  query: string;
  textForApi: string;
  hasFilters: boolean;
  canRunSearch: boolean;
  isLoading: boolean;
  results: DiscussionMessage[];
  scope: 'channel' | 'server';
  hasMore?: boolean;
  onSelect: (message: DiscussionMessage) => void;
}) {
  return (
    <ScrollArea className='max-h-[420px]'>
      {!query && !hasFilters && (
        <div className='space-y-1 px-6 py-8 text-center text-xs text-muted-foreground'>
          <p>Find messages by content.</p>
          <p>
            Try filters:{' '}
            <code className='rounded bg-muted px-1 font-mono'>from:alice</code>
            {' '}
            <code className='rounded bg-muted px-1 font-mono'>has:image</code>
          </p>
        </div>
      )}
      {canRunSearch && isLoading && results.length === 0 && (
        <div className='flex items-center justify-center gap-1 py-8 text-xs text-muted-foreground'>
          <Icons.spinner className='h-3 w-3 animate-spin' />
          Searching…
        </div>
      )}
      {canRunSearch && !isLoading && results.length === 0 && (
        <div className='px-6 py-8 text-center text-xs text-muted-foreground'>
          No matches
          {textForApi ? (
            <>
              {' '}
              for <span className='font-medium text-foreground'>“{textForApi}”</span>
            </>
          ) : null}
          .
        </div>
      )}
      {results.length > 0 && (
        <div className='divide-y'>
          {results.map((m) => (
            <SearchResultRow
              key={m.id}
              message={m}
              query={query}
              showChannel={scope === 'server'}
              onSelect={() => onSelect(m)}
            />
          ))}
        </div>
      )}
      {hasMore && (
        <div
          className={cn(
            'border-t bg-muted/30 px-3 py-1.5 text-center text-[10px] text-muted-foreground'
          )}
        >
          Refine the query to see more results.
        </div>
      )}
    </ScrollArea>
  );
}
