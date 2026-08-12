'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AssignmentsEmptyState,
  AssignmentsLoadingState
} from './shared';
import { AssignmentBulkBar } from './assignment-bulk-bar';
import { AssignmentListFilters } from './assignment-list-filters';
import { AssignmentListTable } from './assignment-list-table';
import { CreateAssignmentDialog } from './create-assignment-dialog';
import { EditAssignmentDialog } from './edit-assignment-dialog';
import { useTeacherAssignmentList } from './use-teacher-assignment-list';

interface TeacherAssignmentsViewProps {
  list: ReturnType<typeof useTeacherAssignmentList>;
}

export function TeacherAssignmentsView({ list }: TeacherAssignmentsViewProps) {
  const {
    assignments,
    isLoading,
    search,
    setSearch,
    assignmentListFilter,
    setAssignmentListFilter,
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
    listStats,
    handlePickFiles,
    removePendingFile,
    handleCreate,
    handleEditAssignment,
    togglePublish,
    handleDuplicate,
    handleBulkPublishAssignments,
    handleBulkDeleteAssignments,
    handleDelete,
    openSubmissions,
    createPending,
    updatePending
  } = list;

  return (
    <div className='space-y-5'>
      <div className='overflow-hidden rounded-xl border bg-card shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6'>
          <h2 className='text-lg font-semibold tracking-tight'>Assignments</h2>
          <Button onClick={() => setCreateOpen(true)} size='sm' className='gap-1.5'>
            <Plus className='w-4 h-4' /> Create assignment
          </Button>
        </div>
        <div className='space-y-4 p-4 sm:p-6'>
          <AssignmentListFilters
            filter={assignmentListFilter}
            onFilterChange={setAssignmentListFilter}
            search={search}
            onSearchChange={setSearch}
            stats={listStats}
          />
          {isLoading ? <AssignmentsLoadingState /> : null}
          {!isLoading && filteredAssignments.length === 0 ? (
            <AssignmentsEmptyState
              hasItems={assignments.length > 0}
              onCreate={assignments.length === 0 ? () => setCreateOpen(true) : undefined}
            />
          ) : null}
          <AssignmentBulkBar
            selectedIds={selectedAssignmentIds}
            filtered={filteredAssignments}
            onClear={clearAssignmentSelection}
            onSelectAll={setSelectedAssignmentIds}
            onPublish={handleBulkPublishAssignments}
            onDelete={handleBulkDeleteAssignments}
          />
          {filteredAssignments.length > 0 ? (
            <AssignmentListTable
              assignments={filteredAssignments}
              selectedIds={selectedAssignmentIds}
              onToggleSelect={toggleAssignmentSelect}
              onOpenSubmissions={openSubmissions}
              onTogglePublish={togglePublish}
              onEdit={setEditTarget}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ) : null}
        </div>
      </div>
      <CreateAssignmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pendingFiles={pendingFiles}
        fileInputRef={fileInputRef}
        onPickFiles={handlePickFiles}
        onRemoveFile={removePendingFile}
        onSubmit={handleCreate}
        pending={createPending}
      />
      <EditAssignmentDialog
        target={editTarget}
        initialValues={editInitialValues}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEditAssignment}
        pending={updatePending}
      />
    </div>
  );
}
