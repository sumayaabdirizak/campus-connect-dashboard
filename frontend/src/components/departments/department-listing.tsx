'use client';

import { useState } from 'react';
import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { useQueryClient } from '@/lib/async-query';
import { useAuthStore } from '@/lib/auth-store';
import { AcademicScopeBreadcrumb } from '@/components/academic/academic-scope-breadcrumb';
import { AcademicWorkflowSteps } from '@/components/academic/academic-workflow-steps';
import { useAcademicScope } from '@/lib/academic-scope/use-academic-scope';
import { DepartmentFormSheet } from './DepartmentFormSheet';
import { DepartmentTable } from './department-table';

export default function DepartmentListingPage() {
  const [open, setOpen] = useState(false);
  const role = useAuthStore((state) => state.user?.role);
  const queryClient = useQueryClient();
  const canAdd = role === 'SUPER_ADMIN';
  const { scope } = useAcademicScope();

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title='Departments'
        onAdd={canAdd ? () => setOpen(true) : undefined}
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['departments'] })}
      />
      <AcademicWorkflowSteps scope={scope} active='departments' />
      <AcademicScopeBreadcrumb scope={scope} current='departments' />
      <DepartmentTable facultyId={scope.facultyId || undefined} />
      {canAdd ? <DepartmentFormSheet open={open} onOpenChange={setOpen} /> : null}
    </PageContainer>
  );
}
