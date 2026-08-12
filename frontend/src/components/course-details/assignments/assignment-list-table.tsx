'use client';

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { Assignment } from '@/lib/course-details/services/assignments-types';
import { AssignmentListRow } from './assignment-list-row';

interface AssignmentListTableProps {
  assignments: Assignment[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onOpenSubmissions: (a: Assignment) => void;
  onTogglePublish: (a: Assignment) => void;
  onEdit: (a: Assignment) => void;
  onDuplicate: (a: Assignment) => void;
  onDelete: (id: number) => void;
}

export function AssignmentListTable({
  assignments,
  selectedIds,
  onToggleSelect,
  onOpenSubmissions,
  onTogglePublish,
  onEdit,
  onDuplicate,
  onDelete
}: AssignmentListTableProps) {
  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='max-h-[65vh] overflow-auto'>
        <Table className='w-full table-fixed min-w-[940px]'>
          <TableHeader className='sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85'>
            <TableRow className='hover:bg-transparent border-b [&>th]:h-9 [&>th]:px-3 [&>th]:text-[10px] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground'>
              <TableHead className='w-9'></TableHead>
              <TableHead className='min-w-0'>Title</TableHead>
              <TableHead className='w-24'>Work</TableHead>
              <TableHead className='w-28'>Grading</TableHead>
              <TableHead className='w-32'>Opens</TableHead>
              <TableHead className='w-32'>Due</TableHead>
              <TableHead className='w-28 text-right'>Submissions</TableHead>
              <TableHead className='w-20'>Status</TableHead>
              <TableHead className='w-28'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => (
              <AssignmentListRow
                key={a.id}
                assignment={a}
                isSelected={selectedIds.has(a.id)}
                anySelected={selectedIds.size > 0}
                onToggleSelect={onToggleSelect}
                onOpenSubmissions={onOpenSubmissions}
                onTogglePublish={onTogglePublish}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
