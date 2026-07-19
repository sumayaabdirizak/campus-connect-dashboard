import { Input } from '@/components/ui/input'
import { Icons } from '@/components/icons'
import { cn } from '@/lib/utils'

export type SortMode = 'popular' | 'new' | 'active'
export type TabMode = 'all' | 'mine'

type Props = {
  tab: TabMode
  sort: SortMode
  search: string
  myClubCount: number
  onTabChange: (tab: TabMode) => void
  onSortChange: (sort: SortMode) => void
  onSearchChange: (value: string) => void
}

export function DiscoveryToolbar({
  tab,
  sort,
  search,
  myClubCount,
  onTabChange,
  onSortChange,
  onSearchChange,
}: Props) {
  return (
    <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex items-center gap-1 rounded-lg border bg-muted/50 p-1'>
        <button
          type='button'
          onClick={() => onTabChange('all')}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            tab === 'all'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          All Clubs
        </button>
        <button
          type='button'
          onClick={() => onTabChange('mine')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            tab === 'mine'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          My Clubs
          {myClubCount > 0 ? (
            <span className='flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground'>
              {myClubCount}
            </span>
          ) : null}
        </button>
      </div>

      <div className='flex items-center gap-2'>
        <div className='relative'>
          <Icons.search className='absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search...'
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className='h-8 w-48 pl-8 text-xs'
          />
        </div>
        <div className='flex gap-0.5 rounded-lg border p-0.5'>
          {(['popular', 'new', 'active'] as SortMode[]).map((s) => (
            <button
              key={s}
              type='button'
              onClick={() => onSortChange(s)}
              className={cn(
                'rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors',
                sort === s
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
