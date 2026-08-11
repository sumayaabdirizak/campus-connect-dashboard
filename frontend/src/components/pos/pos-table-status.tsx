/** Shared loading/error placeholders for Pos-style admin tables. */
export function PosTableLoading({ tone = 'theme' }: { tone?: 'theme' | 'legacy' }) {
  if (tone === 'legacy') {
    return (
      <div className='flex h-48 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white'>
        <div className='size-8 animate-spin rounded-full border-4 border-[#3B82F6] border-t-transparent' />
      </div>
    );
  }
  return (
    <div className='flex h-48 items-center justify-center rounded-xl border bg-card'>
      <div className='border-primary size-8 animate-spin rounded-full border-4 border-t-transparent' />
    </div>
  );
}

export function PosTableError({
  resource,
  message,
  tone = 'theme'
}: {
  resource: string;
  message: string;
  tone?: 'theme' | 'legacy';
}) {
  if (tone === 'legacy') {
    return (
      <div className='rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700'>
        Failed to load {resource}: {message}
      </div>
    );
  }
  return (
    <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive'>
      Failed to load {resource}: {message}
    </div>
  );
}
