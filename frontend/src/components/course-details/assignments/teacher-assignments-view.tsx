'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCourseMarkBudget } from '@/lib/course-details/queries/mark-budget-queries';
import { CourseTabHeader } from '../_shared/course-tab-header';
import { CourseTabPage } from '../_shared/course-tab-page';
import { CourseMarkBudgetBanner } from '../_shared/course-mark-budget-banner';
import { isMarkBudgetExhausted } from '@/lib/course-details/services/mark-budget-utils';
import { AssignmentsEmptyState } from './shared';
import { AssignmentBulkBar } from './assignment-bulk-bar';
import { AssignmentListTable } from './assignment-list-table';
import { CreateAssignmentDialog } from './create-assignment-dialog';
import { EditAssignmentDialog } from './edit-assignment-dialog';
import { useTeacherAssignmentList } from './use-teacher-assignment-list';

interface TeacherAssignmentsViewProps {
  list: ReturnType<typeof useTeacherAssignmentList>;
  courseId: string;
}

export function TeacherAssignmentsView({ list, courseId }: TeacherAssignmentsViewProps) {
  const { data: markBudget } = useCourseMarkBudget(courseId);
  const {
    assignments,
    isLoading,
    search,
    setSearch,
    createOpen,
    setCreateOpen,
    pendingFiles,
    fileInputRef,
    editTarget,
    setEditTarget,
    editInitialValues,
    selectedAssignmentIds,
    setSelectedAssignmentIds,
    toggleAssignmentSelect,
    clearAssignmentSelection,
    filteredAssignments,
    handlePickFiles,
    addPendingFiles,
    removePendingFile,
    handleCreate,
    handleEditAssignment,
    togglePublish,
    handleBulkPublishAssignments,
    handleBulkDeleteAssignments,
    handleDelete,
    openSubmissions,
    createPending,
    updatePending
  } = list;

  const showEmpty =
    !isLoading && filteredAssignments.length === 0 && assignments.length === 0;
  const budgetExhausted = markBudget != null && isMarkBudgetExhausted(markBudget);

  return (
    <CourseTabPage>
      <CourseTabHeader
        title='Assignments'
        description='Manage course assignments, submissions, and grading.'
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            size='sm'
            className='gap-1.5 rounded-full'
            disabled={budgetExhausted}
            title={budgetExhausted ? 'All course marks are allocated' : undefined}
          >
            <Plus className='size-4' /> Create assignment
          </Button>
        }
      />

      <CourseMarkBudgetBanner budget={markBudget} />

      {showEmpty ? (
        <AssignmentsEmptyState hasItems={false} onCreate={() => setCreateOpen(true)} />
      ) : (
        <>
          <AssignmentBulkBar
            selectedIds={selectedAssignmentIds}
            filtered={filteredAssignments}
            onClear={clearAssignmentSelection}
            onSelectAll={setSelectedAssignmentIds}
            onPublish={handleBulkPublishAssignments}
            onDelete={handleBulkDeleteAssignments}
          />
          <AssignmentListTable
            assignments={filteredAssignments}
            isLoading={isLoading}
            search={search}
            onSearchChange={setSearch}
            selectedIds={selectedAssignmentIds}
            onToggleSelect={toggleAssignmentSelect}
            onOpenSubmissions={openSubmissions}
            onTogglePublish={togglePublish}
            onEdit={setEditTarget}
            onDelete={handleDelete}
            courseMaxMarks={markBudget?.courseMax}
          />
        </>
      )}

      <CreateAssignmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pendingFiles={pendingFiles}
        fileInputRef={fileInputRef}
        onPickFiles={handlePickFiles}
        onAddFiles={addPendingFiles}
        onRemoveFile={removePendingFile}
        onSubmit={handleCreate}
        pending={createPending}
        markBudget={markBudget}
      />
      <EditAssignmentDialog
        target={editTarget}
        initialValues={editInitialValues}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEditAssignment}
        pending={updatePending}
        markBudget={markBudget}
      />
    </CourseTabPage>
  );
}
