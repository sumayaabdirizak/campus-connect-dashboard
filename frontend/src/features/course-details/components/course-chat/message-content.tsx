'use client';

import { cn } from '@/lib/utils';

interface MessageContentProps {
  content: string;
  mentionLabels: Map<string, string>;
  meSlug: string | null;
  isOwn: boolean;
}

export function MessageContent({
  content,
  mentionLabels,
  meSlug,
  isOwn
}: MessageContentProps) {
  const parts = content.split(/(@[a-z0-9][\w.\-]{0,40})/gi);

  return (
    <>
      {parts.map((part, index) => {
        if (!part.startsWith('@')) return <span key={`${part}-${index}`}>{part}</span>;

        const token = part.slice(1).toLowerCase();
        const label = mentionLabels.get(token);
        const mine = meSlug === token;

        return (
          <span
            key={`${part}-${index}`}
            className={cn(
              'rounded px-1 font-medium',
              isOwn
                ? 'bg-white/25 text-primary-foreground'
                : mine
                  ? 'bg-primary/25 text-primary'
                  : 'bg-primary/10 text-primary'
            )}
          >
            @{label ?? part.slice(1)}
          </span>
        );
      })}
    </>
  );
}
