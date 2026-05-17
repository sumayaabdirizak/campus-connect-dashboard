'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { useMemo, type ReactNode } from 'react';
import { ClubLinkCard, extractClubInviteToken } from '@/features/clubs/components/club-link-card';

/** @user / @role tokens and #group-style channel tags */
const MENTION_SPLIT = /(@\w+|#\w+)/g;

/** Turn chat plaintext into GFM-friendly source (line breaks, • bullets). */
function chatPlainToMarkdownSource(text: string): string {
  let s = text.replace(/\r\n/g, '\n');
  s = s.replace(/^(\u2022)\s+/gm, '- ');
  const lines = s.split('\n');
  return lines.map((line) => `${line}  `).join('\n');
}

type Tone = 'hybrid' | 'legacy';

function mdComponents(tone: Tone, invertOnAccent: boolean): Partial<Components> {
  const body =
    invertOnAccent && tone === 'legacy'
      ? 'text-white'
      : tone === 'hybrid'
        ? 'text-foreground'
        : 'text-zinc-100';
  const muted =
    invertOnAccent && tone === 'legacy'
      ? 'text-white/85'
      : tone === 'hybrid'
        ? 'text-muted-foreground'
        : 'text-zinc-400';
  const quoteBorder =
    invertOnAccent && tone === 'legacy'
      ? 'border-white/50 text-white/95'
      : tone === 'hybrid'
        ? 'border-violet-500/75 text-foreground/90'
        : 'border-violet-400/70 text-zinc-200/90';
  const codeInline =
    invertOnAccent && tone === 'legacy'
      ? 'rounded bg-black/25 px-1 py-0.5 font-mono text-[0.9em] text-white'
      : tone === 'hybrid'
        ? 'rounded bg-muted/80 px-1 py-0.5 font-mono text-[0.9em] text-foreground'
        : 'rounded bg-zinc-800 px-1 py-0.5 font-mono text-[0.9em] text-zinc-100';
  const preBg =
    invertOnAccent && tone === 'legacy'
      ? 'my-1 overflow-x-auto rounded-lg bg-black/25 p-2 text-xs text-white'
      : tone === 'hybrid'
        ? 'my-1 overflow-x-auto rounded-lg bg-muted/50 p-2 text-xs'
        : 'my-1 overflow-x-auto rounded-lg bg-zinc-900 p-2 text-xs';

  return {
    p: ({ children }) => (
      <p className={`my-0.5 whitespace-pre-wrap break-words first:mt-0 last:mb-0 ${body}`}>{children}</p>
    ),
    strong: ({ children }) => <strong className={`font-semibold ${body}`}>{children}</strong>,
    em: ({ children }) => <em className={`italic ${body}`}>{children}</em>,
    del: ({ children }) => <del className={`opacity-80 ${body}`}>{children}</del>,
    code: ({ className, children, ...props }) => {
      const isFenced = Boolean(className?.startsWith('language-'));
      const fenceTone =
        isFenced && invertOnAccent && tone === 'legacy' ? ' text-white' : '';
      return (
        <code
          className={
            isFenced ? `${className ?? ''} block whitespace-pre font-mono text-[0.9em]${fenceTone}` : codeInline
          }
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => <pre className={preBg}>{children}</pre>,
    blockquote: ({ children }) => (
      <blockquote className={`my-1 border-l-4 pl-3 ${quoteBorder} ${muted}`}>{children}</blockquote>
    ),
    ul: ({ children }) => (
      <ul
        className={`my-1 list-disc pl-4 ${
          invertOnAccent && tone === 'legacy'
            ? 'marker:text-white/70'
            : tone === 'hybrid'
              ? 'marker:text-foreground/70'
              : 'marker:text-zinc-400'
        }`}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol
        className={`my-1 list-decimal pl-4 ${
          invertOnAccent && tone === 'legacy'
            ? 'marker:text-white/70'
            : tone === 'hybrid'
              ? 'marker:text-foreground/70'
              : 'marker:text-zinc-400'
        }`}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => <li className={`my-0.5 ${body}`}>{children}</li>,
    a: ({ href, children }) => {
      // Detect club invite links and render a rich card instead
      const inviteToken = href ? extractClubInviteToken(href) : null;
      if (inviteToken) {
        return <ClubLinkCard token={inviteToken} />;
      }
      return (
        <a
          href={href}
          className={
            invertOnAccent && tone === 'legacy'
              ? 'text-violet-100 underline underline-offset-2 hover:text-white'
              : 'text-sky-400 underline underline-offset-2 hover:text-sky-300'
          }
          target='_blank'
          rel='noreferrer noopener'
        >
          {children}
        </a>
      );
    },
    h1: ({ children }) => <span className='block text-base font-bold'>{children}</span>,
    h2: ({ children }) => <span className='block text-sm font-bold'>{children}</span>,
    h3: ({ children }) => <span className='block text-sm font-semibold'>{children}</span>
  };
}

function MarkdownChunk({ source, tone, invertOnAccent }: { source: string; tone: Tone; invertOnAccent: boolean }) {
  const md = useMemo(() => chatPlainToMarkdownSource(source), [source]);
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents(tone, invertOnAccent)}>
      {md}
    </ReactMarkdown>
  );
}

/**
 * Renders discussion message body: lightweight markdown (bold, italic, code, quotes, lists, strikethrough)
 * plus @mention highlighting.
 */
export function DiscussionMessageMarkdown({
  text,
  tone,
  invertOnAccent = false
}: {
  text: string;
  tone: Tone;
  /** Legacy “own message” purple bubble — keep markdown readable on accent fill. */
  invertOnAccent?: boolean;
}) {
  if (!text) return null;
  const parts = text.split(MENTION_SPLIT);
  const mentionClass = 'font-medium text-[#534AB7]';
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          return (
            <span key={i} className={mentionClass}>
              {part}
            </span>
          );
        }
        return <MarkdownChunk key={i} source={part} tone={tone} invertOnAccent={invertOnAccent} />;
      })}
    </>
  );
}
