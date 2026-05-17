'use client'

import { useInterestTags } from '../../api/queries'
import { Icons } from '@/components/icons'

export function InterestChipFilter({
  selected,
  onSelect
}: {
  selected: string | null
  onSelect: (slug: string | null) => void
}) {
  const { data } = useInterestTags()
  const tags = data?.tags ?? []

  if (tags.length === 0) return null

  return (
    <div className='flex flex-wrap gap-1.5'>
      <button
        type='button'
        onClick={() => onSelect(null)}
        className={`
          inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition-all
          ${!selected
            ? 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300'
            : 'border-border text-muted-foreground hover:border-violet-300 hover:text-foreground'}
        `}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag.slug}
          type='button'
          onClick={() => onSelect(selected === tag.slug ? null : tag.slug)}
          className={`
            inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition-all
            ${selected === tag.slug
              ? 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300'
              : 'border-border text-muted-foreground hover:border-violet-300 hover:text-foreground'}
          `}
        >
          {tag.label}
        </button>
      ))}
    </div>
  )
}
