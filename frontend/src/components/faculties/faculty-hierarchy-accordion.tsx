'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import {
  PosTable,
  PosTableBody,
  PosTableCell,
  PosTableHead,
  PosTableHeaderCell,
  PosTableRow
} from '@/features/pos/components/pos-table';
import { Button } from '@/features/ui/components/button';
import { Badge } from '@/features/ui/components/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@/lib/async-query';
import { facultiesQueryOptions } from '@/lib/faculties/queries';
import { normalizeFacultiesList } from '@/lib/faculties/services';
import { useDepartments } from '@/lib/departments/queries';
import { usePrograms } from '@/lib/programs/queries';
import { useAdminBatches } from '@/lib/batches-admin/queries';
import { BatchOverviewSheet } from './batch-overview-sheet';

function ExpandBtn({
  open,
  onClick,
  label
}: {
  open: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type='button'
      aria-expanded={open}
      aria-label={label}
      onClick={onClick}
      className='inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'
    >
      {open ? <ChevronDown className='size-4' /> : <ChevronRight className='size-4' />}
    </button>
  );
}

function TypeBadge({ children }: { children: ReactNode }) {
  return (
    <Badge variant='outline' className='font-normal'>
      {children}
    </Badge>
  );
}

function toggleId(set: Set<number>, id: number, setter: (s: Set<number>) => void) {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  setter(next);
}

function NestedBatches({
  programId,
  depth,
  onOpenBatch
}: {
  programId: number;
  depth: number;
  onOpenBatch: (id: number, name: string) => void;
}) {
  const { data, isLoading, error } = useAdminBatches({ programId: String(programId) });
  const batches = data?.batches ?? [];

  if (isLoading) {
    return (
      <PosTableRow>
        <PosTableCell colSpan={4}>
          <span
            className='flex items-center gap-2 text-xs text-muted-foreground'
            style={{ paddingLeft: depth * 20 }}
          >
            <Loader2 className='size-3.5 animate-spin' /> Loading batches…
          </span>
        </PosTableCell>
      </PosTableRow>
    );
  }
  if (error) {
    return (
      <PosTableRow>
        <PosTableCell colSpan={4}>
          <span className='text-xs text-destructive' style={{ paddingLeft: depth * 20 }}>
            {(error as Error).message}
          </span>
        </PosTableCell>
      </PosTableRow>
    );
  }
  if (batches.length === 0) {
    return (
      <PosTableRow>
        <PosTableCell colSpan={4}>
          <span className='text-xs text-muted-foreground' style={{ paddingLeft: depth * 20 }}>
            No batches
          </span>
        </PosTableCell>
      </PosTableRow>
    );
  }

  return (
    <>
      {batches.map((b) => (
        <PosTableRow key={`batch-${b.id}`} className='bg-muted/20'>
          <PosTableCell>
            <div className='flex items-center gap-1' style={{ paddingLeft: depth * 20 }}>
              <span className='size-7' aria-hidden />
              <span className='text-sm font-medium'>{b.name}</span>
            </div>
          </PosTableCell>
          <PosTableCell className='text-muted-foreground text-sm'>—</PosTableCell>
          <PosTableCell>
            <TypeBadge>Batch</TypeBadge>
          </PosTableCell>
          <PosTableCell align='right'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8'
              onClick={() => onOpenBatch(b.id, b.name)}
            >
              Students &amp; courses
            </Button>
          </PosTableCell>
        </PosTableRow>
      ))}
    </>
  );
}

function NestedPrograms({
  departmentId,
  depth,
  openPrograms,
  toggleProgram,
  onOpenBatch
}: {
  departmentId: number;
  depth: number;
  openPrograms: Set<number>;
  toggleProgram: (id: number) => void;
  onOpenBatch: (id: number, name: string) => void;
}) {
  const { data, isLoading, error } = usePrograms({
    departmentId: String(departmentId)
  });
  const programs = data?.programs ?? [];

  if (isLoading) {
    return (
      <PosTableRow>
        <PosTableCell colSpan={4}>
          <span
            className='flex items-center gap-2 text-xs text-muted-foreground'
            style={{ paddingLeft: depth * 20 }}
          >
            <Loader2 className='size-3.5 animate-spin' /> Loading programs…
          </span>
        </PosTableCell>
      </PosTableRow>
    );
  }
  if (error) {
    return (
      <PosTableRow>
        <PosTableCell colSpan={4}>
          <span className='text-xs text-destructive' style={{ paddingLeft: depth * 20 }}>
            {(error as Error).message}
          </span>
        </PosTableCell>
      </PosTableRow>
    );
  }
  if (programs.length === 0) {
    return (
      <PosTableRow>
        <PosTableCell colSpan={4}>
          <span className='text-xs text-muted-foreground' style={{ paddingLeft: depth * 20 }}>
            No programs
          </span>
        </PosTableCell>
      </PosTableRow>
    );
  }

  return (
    <>
      {programs.map((p) => {
        const open = openPrograms.has(p.id);
        return (
          <FragmentRows key={`program-${p.id}`}>
            <PosTableRow className={cn(open && 'bg-muted/10')}>
              <PosTableCell>
                <div className='flex items-center gap-1' style={{ paddingLeft: depth * 20 }}>
                  <ExpandBtn
                    open={open}
                    label={open ? 'Collapse program' : 'Expand program'}
                    onClick={() => toggleProgram(p.id)}
                  />
                  <span className='text-sm font-medium'>{p.name}</span>
                </div>
              </PosTableCell>
              <PosTableCell className='text-muted-foreground text-sm'>{p.code}</PosTableCell>
              <PosTableCell>
                <TypeBadge>Program</TypeBadge>
              </PosTableCell>
              <PosTableCell align='right' />
            </PosTableRow>
            {open ? (
              <NestedBatches
                programId={p.id}
                depth={depth + 1}
                onOpenBatch={onOpenBatch}
              />
            ) : null}
          </FragmentRows>
        );
      })}
    </>
  );
}

function NestedDepartments({
  facultyId,
  depth,
  openDepartments,
  toggleDepartment,
  openPrograms,
  toggleProgram,
  onOpenBatch
}: {
  facultyId: number;
  depth: number;
  openDepartments: Set<number>;
  toggleDepartment: (id: number) => void;
  openPrograms: Set<number>;
  toggleProgram: (id: number) => void;
  onOpenBatch: (id: number, name: string) => void;
}) {
  const { data, isLoading, error } = useDepartments({
    facultyId: String(facultyId)
  });
  const departments = data?.departments ?? [];

  if (isLoading) {
    return (
      <PosTableRow>
        <PosTableCell colSpan={4}>
          <span
            className='flex items-center gap-2 text-xs text-muted-foreground'
            style={{ paddingLeft: depth * 20 }}
          >
            <Loader2 className='size-3.5 animate-spin' /> Loading departments…
          </span>
        </PosTableCell>
      </PosTableRow>
    );
  }
  if (error) {
    return (
      <PosTableRow>
        <PosTableCell colSpan={4}>
          <span className='text-xs text-destructive' style={{ paddingLeft: depth * 20 }}>
            {(error as Error).message}
          </span>
        </PosTableCell>
      </PosTableRow>
    );
  }
  if (departments.length === 0) {
    return (
      <PosTableRow>
        <PosTableCell colSpan={4}>
          <span className='text-xs text-muted-foreground' style={{ paddingLeft: depth * 20 }}>
            No departments
          </span>
        </PosTableCell>
      </PosTableRow>
    );
  }

  return (
    <>
      {departments.map((d) => {
        const open = openDepartments.has(d.id);
        return (
          <FragmentRows key={`dept-${d.id}`}>
            <PosTableRow className={cn(open && 'bg-muted/10')}>
              <PosTableCell>
                <div className='flex items-center gap-1' style={{ paddingLeft: depth * 20 }}>
                  <ExpandBtn
                    open={open}
                    label={open ? 'Collapse department' : 'Expand department'}
                    onClick={() => toggleDepartment(d.id)}
                  />
                  <span className='text-sm font-medium'>{d.name}</span>
                </div>
              </PosTableCell>
              <PosTableCell className='text-muted-foreground text-sm'>{d.code}</PosTableCell>
              <PosTableCell>
                <TypeBadge>Department</TypeBadge>
              </PosTableCell>
              <PosTableCell align='right' />
            </PosTableRow>
            {open ? (
              <NestedPrograms
                departmentId={d.id}
                depth={depth + 1}
                openPrograms={openPrograms}
                toggleProgram={toggleProgram}
                onOpenBatch={onOpenBatch}
              />
            ) : null}
          </FragmentRows>
        );
      })}
    </>
  );
}

function FragmentRows({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function FacultyHierarchyAccordion() {
  const [search, setSearch] = useState('');
  const [openFaculties, setOpenFaculties] = useState<Set<number>>(() => new Set());
  const [openDepartments, setOpenDepartments] = useState<Set<number>>(() => new Set());
  const [openPrograms, setOpenPrograms] = useState<Set<number>>(() => new Set());
  const [sheetBatch, setSheetBatch] = useState<{ id: number; name: string } | null>(null);

  const { data, isLoading, error } = useQuery(facultiesQueryOptions({ limit: 200 }));
  const faculties = normalizeFacultiesList(data);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return faculties;
    return faculties.filter((f) => [f.name, f.code].join(' ').toLowerCase().includes(q));
  }, [faculties, search]);

  if (isLoading) {
    return (
      <div className='flex h-48 items-center justify-center rounded-xl border bg-card'>
        <div className='size-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive'>
        Failed to load faculties: {(error as Error).message}
      </div>
    );
  }

  return (
    <>
      <PosTableCard search={search} onSearchChange={setSearch}>
        {filtered.length === 0 ? (
          <div className='p-10 text-center text-sm text-muted-foreground'>No faculties found.</div>
        ) : (
          <PosTable>
            <PosTableHead>
              <tr>
                <PosTableHeaderCell>Name</PosTableHeaderCell>
                <PosTableHeaderCell>Code</PosTableHeaderCell>
                <PosTableHeaderCell>Type</PosTableHeaderCell>
                <PosTableHeaderCell align='right'>Action</PosTableHeaderCell>
              </tr>
            </PosTableHead>
            <PosTableBody>
              {filtered.map((f) => {
                const open = openFaculties.has(f.id);
                return (
                  <FragmentRows key={`faculty-${f.id}`}>
                    <PosTableRow className={cn(open && 'bg-muted/10')}>
                      <PosTableCell>
                        <div className='flex items-center gap-1'>
                          <ExpandBtn
                            open={open}
                            label={open ? 'Collapse faculty' : 'Expand faculty'}
                            onClick={() =>
                              toggleId(openFaculties, f.id, setOpenFaculties)
                            }
                          />
                          <span className='text-sm font-semibold'>{f.name}</span>
                        </div>
                      </PosTableCell>
                      <PosTableCell className='text-muted-foreground text-sm'>
                        {f.code}
                      </PosTableCell>
                      <PosTableCell>
                        <TypeBadge>Faculty</TypeBadge>
                      </PosTableCell>
                      <PosTableCell align='right' />
                    </PosTableRow>
                    {open ? (
                      <NestedDepartments
                        facultyId={f.id}
                        depth={1}
                        openDepartments={openDepartments}
                        toggleDepartment={(id) =>
                          toggleId(openDepartments, id, setOpenDepartments)
                        }
                        openPrograms={openPrograms}
                        toggleProgram={(id) => toggleId(openPrograms, id, setOpenPrograms)}
                        onOpenBatch={(id, name) => setSheetBatch({ id, name })}
                      />
                    ) : null}
                  </FragmentRows>
                );
              })}
            </PosTableBody>
          </PosTable>
        )}
      </PosTableCard>

      <BatchOverviewSheet
        batchId={sheetBatch?.id ?? null}
        batchName={sheetBatch?.name}
        open={sheetBatch != null}
        onOpenChange={(openSheet) => {
          if (!openSheet) setSheetBatch(null);
        }}
      />
    </>
  );
}
