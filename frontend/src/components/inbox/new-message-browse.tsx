'use client';

import { Icons } from '@/components/icons';
import type { GroupDmCandidate } from '@/lib/discussions/queries/types';
import { DmHierarchyNavList } from '@/components/discussions/dms/dm-create/dm-hierarchy-nav-list';
import { useDmCandidateBrowse } from '@/components/discussions/dms/dm-create/use-dm-candidate-browse';
import { NewMessagePersonRow } from './new-message-person-row';

/**
 * Department → batch → section → pick one person for a 1:1 DM.
 */
export function NewMessageBrowse({
  candidates,
  isLoading,
  pendingId,
  onPick
}: {
  candidates: GroupDmCandidate[];
  isLoading: boolean;
  pendingId: number | null;
  onPick: (userId: number) => void;
}) {
  const {
    step,
    departments,
    batches,
    sections,
    people,
    goBack,
    pickDepartment,
    pickBatch,
    pickSection,
    crumb
  } = useDmCandidateBrowse(candidates);

  return (
    <div className='space-y-1.5'>
      <div className='flex items-center gap-1'>
        {step !== 'department' ? (
          <button
            type='button'
            onClick={goBack}
            className='inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'
            aria-label='Back'
          >
            <Icons.chevronLeft className='size-4' />
          </button>
        ) : null}
        <span className='min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground'>
          {crumb.replace('Pick people', 'Pick person')}
        </span>
      </div>

      {step === 'department' ? (
        <DmHierarchyNavList
          nodes={departments}
          emptyLabel={
            isLoading ? 'Loading departments…' : 'No people found in your faculty yet.'
          }
          onPick={pickDepartment}
        />
      ) : null}

      {step === 'batch' ? (
        <DmHierarchyNavList
          nodes={batches}
          emptyLabel='No batches in this department.'
          onPick={pickBatch}
        />
      ) : null}

      {step === 'section' ? (
        <DmHierarchyNavList
          nodes={sections}
          emptyLabel='No sections in this batch.'
          onPick={pickSection}
        />
      ) : null}

      {step === 'people' ? (
        <div className='max-h-64 space-y-0.5 overflow-y-auto rounded-lg border p-1'>
          {people.length === 0 ? (
            <p className='px-2 py-8 text-center text-xs text-muted-foreground'>
              No people here.
            </p>
          ) : (
            people.map((c) => (
              <NewMessagePersonRow
                key={c.id}
                candidate={c}
                pending={pendingId === c.id}
                disabled={pendingId != null}
                onPick={onPick}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
