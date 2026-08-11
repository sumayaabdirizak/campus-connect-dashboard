'use client';

import React, { useMemo } from 'react';
import type { Components } from 'react-markdown';
import { cn } from '@/lib/utils';

export function useAnnouncementMarkdownComponents() {
  return useMemo(
    () =>
      ({
        p: ({ children }: { children?: React.ReactNode }) => (
          <p className='mb-2 text-[15px] leading-relaxed text-muted-foreground last:mb-0'>{children}</p>
        ),
        h1: ({ children }: { children?: React.ReactNode }) => (
          <h1 className='mb-2 text-lg font-semibold text-foreground'>{children}</h1>
        ),
        h2: ({ children }: { children?: React.ReactNode }) => (
          <h2 className='mb-2 text-base font-semibold text-foreground'>{children}</h2>
        ),
        h3: ({ children }: { children?: React.ReactNode }) => (
          <h3 className='mb-1.5 text-[15px] font-semibold text-foreground'>{children}</h3>
        ),
        h4: ({ children }: { children?: React.ReactNode }) => (
          <h4 className='mb-1.5 text-sm font-semibold text-foreground'>{children}</h4>
        ),
        ul: ({ children }: { children?: React.ReactNode }) => (
          <ul className='mb-2 list-inside list-disc space-y-1 text-[15px] text-muted-foreground'>{children}</ul>
        ),
        ol: ({ children }: { children?: React.ReactNode }) => (
          <ol className='mb-2 list-inside list-decimal space-y-1 text-[15px] text-muted-foreground'>{children}</ol>
        ),
        li: ({ children }: { children?: React.ReactNode }) => <li className='leading-relaxed'>{children}</li>,
        a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
          <a
            href={href}
            className='font-medium text-primary underline-offset-4 hover:underline'
            target='_blank'
            rel='noreferrer noopener'
          >
            {children}
          </a>
        ),
        blockquote: ({ children }: { children?: React.ReactNode }) => (
          <blockquote className='mb-2 border-s-2 border-primary/40 ps-3 text-sm italic text-muted-foreground'>
            {children}
          </blockquote>
        ),
        code: ({
          className,
          children,
          inline,
        }: {
          className?: string;
          children?: React.ReactNode;
          inline?: boolean;
        }) =>
          inline ? (
            <code className='rounded bg-muted px-1 py-0.5 font-mono text-[13px] text-foreground'>{children}</code>
          ) : (
            <code
              className={cn(
                'block overflow-x-auto rounded-md border border-border bg-muted/80 p-3 font-mono text-xs text-foreground',
                className
              )}
            >
              {children}
            </code>
          ),
        pre: ({ children }: { children?: React.ReactNode }) => (
          <pre className='mb-2 overflow-x-auto rounded-md border border-border bg-muted/80 p-3 text-xs'>{children}</pre>
        ),
        table: ({ children }: { children?: React.ReactNode }) => (
          <div className='mb-2 w-full overflow-x-auto'>
            <table className='w-full border-collapse border border-border text-left text-sm text-muted-foreground'>
              {children}
            </table>
          </div>
        ),
        th: ({ children }: { children?: React.ReactNode }) => (
          <th className='border border-border bg-muted/50 px-2 py-1.5 font-medium text-foreground'>{children}</th>
        ),
        td: ({ children }: { children?: React.ReactNode }) => (
          <td className='border border-border px-2 py-1.5'>{children}</td>
        ),
      }) satisfies Partial<Components>,
    []
  );
}
