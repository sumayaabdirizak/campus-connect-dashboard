'use client';

import { useState } from 'react';
import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { useQueryClient } from '@/lib/async-query';
import { useAuthStore } from '@/lib/auth-store';
import { AcademicScopeBreadcrumb } from '@/components/academic/academic-scope-breadcrumb';
import { AcademicWorkflowSteps } from '@/components/academic/academic-workflow-steps';
import { useAcademicScope } from '@/lib/academic-scope/use-academic-scope';
import { ProgramFormSheet } from './program-form-sheet';
import { ProgramsTable } from './programs-table';

export default function ProgramsListingPage() {
  const [open, setOpen] = useState(false);
  const role = useAuthStore((state) => state.user?.role);
  const queryClient = useQueryClient();
  const canAdd = role === 'SUPER_ADMIN';
  const { scope } = useAcademicScope();

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title='Programs'
        onAdd={canAdd ? () => setOpen(true) : undefined}
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['programs'] })}
      />
      <AcademicWorkflowSteps scope={scope} active='programs' />
      <AcademicScopeBreadcrumb scope={scope} current='programs' />
      <ProgramsTable
        facultyId={scope.facultyId || undefined}
        departmentId={scope.departmentId || undefined}
      />
      {canAdd ? <ProgramFormSheet open={open} onOpenChange={setOpen} /> : null}
    </PageContainer>
  );
}
