'use client';

import { FolderOpen } from 'lucide-react';
import { EmptyState } from '../_shared/empty-state';
import { ListSkeleton } from '../_shared/list-skeleton';
import { QueryErrorState } from '@/components/query-error-state';
import { ResourceModules } from '../resource-modules';
import type { CourseModule, Resource } from '../../api/resources-types';

export function ResourcesContent({
  isLoading,
  isError,
  onRetry,
  isStudent,
  filtered,
  visibleModules,
  onAddMaterial,
  onAddToModule,
  onEditModule,
  onDeleteModule,
  onEditResource,
  onDeleteResource,
  onAnalytics,
  onReorderModules,
  onReorderResources,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  isStudent: boolean;
  filtered: Resource[];
  visibleModules: CourseModule[];
  onAddMaterial: () => void;
  onAddToModule: (moduleId: number | null) => void;
  onEditModule: (m: CourseModule) => void;
  onDeleteModule: (id: number) => void;
  onEditResource: (r: Resource) => void;
  onDeleteResource: (id: number) => void;
  onAnalytics?: (r: Resource) => void;
  onReorderModules?: (orderedIds: number[]) => void;
  onReorderResources?: (
    items: { id: number; moduleId: number | null; position: number }[]
  ) => void;
}) {
  if (isLoading) return <ListSkeleton variant='card' count={3} />;

  if (isError) {
    return (
      <QueryErrorState title='Could not load resources' onRetry={onRetry} />
    );
  }

  if (filtered.length === 0 && visibleModules.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title='No materials yet'
        description={
          isStudent
            ? 'Your teacher hasn’t shared any books, slides, or links for this course yet.'
            : 'Upload a syllabus PDF, slide deck, or paste a YouTube link to get started.'
        }
        actionLabel={isStudent ? undefined : 'Add material'}
        onAction={isStudent ? undefined : onAddMaterial}
      />
    );
  }

  return (
    <ResourceModules
      modules={visibleModules}
      resources={filtered}
      isStudent={isStudent}
      onAddToModule={onAddToModule}
      onEditModule={onEditModule}
      onDeleteModule={onDeleteModule}
      onEditResource={onEditResource}
      onDeleteResource={onDeleteResource}
      onAnalytics={onAnalytics}
      onReorderModules={onReorderModules}
      onReorderResources={onReorderResources}
    />
  );
}
