'use client'

import { Icons } from '@/components/icons'
import { ScrollArea } from '@/features/ui/components/scroll-area'
import type { HierarchyNode } from './candidate-hierarchy'

export function DmHierarchyNavList({
  nodes,
  emptyLabel,
  onPick,
}: {
  nodes: HierarchyNode[]
  emptyLabel: string
  onPick: (node: HierarchyNode) => void
}) {
  return (
    <ScrollArea className='h-64 rounded-lg border'>
      {nodes.length === 0 ? (
        <div className='px-4 py-12 text-center text-xs text-muted-foreground'>
          {emptyLabel}
        </div>
      ) : (
        <ul className='py-1'>
          {nodes.map((n, i) => (
            <li key={n.key}>
              <button
                type='button'
                onClick={() => onPick(n)}
                className='flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50'
              >
                <span className='flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-bold tabular-nums text-muted-foreground'>
                  {i + 1}
                </span>
                <span className='min-w-0 flex-1 truncate text-xs font-semibold text-[#101828]'>
                  {n.label}
                </span>
                <span className='shrink-0 text-[11px] tabular-nums text-muted-foreground'>
                  {n.count}
                </span>
                <Icons.chevronRight className='size-4 shrink-0 text-muted-foreground' />
              </button>
            </li>
          ))}
        </ul>
      )}
    </ScrollArea>
  )
}
