'use client';

import { useState } from 'react';
import { useModules, useResources } from '../../api/resources-queries';
import { useAuthStore } from '@/lib/auth-store';
import { filterResources, visibleModulesForViewer } from './filter-resources';
import type { ResourceTypeFilter } from './constants';
import { ResourcesContent } from './resources-content';
import { ResourcesDialogs } from './resources-dialogs';
import { ResourcesToolbar } from './resources-toolbar';
import { useResourceCrud } from './use-resource-crud';
import { useResourceDialogs } from './use-resource-dialogs';
import { useResourceListOps } from './use-resource-list-ops';

export function CourseResources({
  courseId,
  isStudent = false,
}: {
  courseId: string;
  isStudent?: boolean;
}) {
  const { user } = useAuthStore();
  const teacherId = typeof user?.id === 'number' ? user.id : Number(user?.id ?? 0);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ResourceTypeFilter>('all');

  const { data: resources = [], isLoading, isError, refetch } = useResources(courseId);
  const { data: modules = [] } = useModules(courseId);
  const dialogs = useResourceDialogs();
  const crud = useResourceCrud(courseId, teacherId);
  const listOps = useResourceListOps(courseId);

  const visibleModules = visibleModulesForViewer(modules, isStudent);
  const filtered = filterResources({
    resources,
    modules,
    typeFilter,
    search,
    isStudent,
  });

  return (
    <div className='space-y-6'>
      <ResourcesToolbar
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        isStudent={isStudent}
        onAddModule={dialogs.openCreateModule}
        onAddMaterial={() => dialogs.openCreateResource(null)}
      />

      <ResourcesContent
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        isStudent={isStudent}
        filtered={filtered}
        visibleModules={visibleModules}
        onAddMaterial={() => dialogs.openCreateResource(null)}
        onAddToModule={dialogs.openCreateResource}
        onEditModule={dialogs.openEditModule}
        onDeleteModule={dialogs.setDeleteModuleId}
        onEditResource={dialogs.openEditResource}
        onDeleteResource={dialogs.setDeleteResourceId}
        onAnalytics={isStudent ? undefined : dialogs.setAnalyticsResource}
        onReorderModules={isStudent ? undefined : listOps.handleReorderModules}
        onReorderResources={isStudent ? undefined : listOps.handleReorderResources}
      />

      <ResourcesDialogs
        isStudent={isStudent}
        modules={modules}
        resourceDialogOpen={dialogs.resourceDialogOpen}
        onResourceDialogOpenChange={(open) => {
          dialogs.setResourceDialogOpen(open);
          if (!open) dialogs.setEditingResource(null);
        }}
        editingResource={dialogs.editingResource}
        defaultModuleId={dialogs.defaultModuleId}
        resourcePending={
          crud.createResourceMutation.isPending || crud.updateResourceMutation.isPending
        }
        onResourceSubmit={(payload) =>
          crud.handleResourceSubmit(payload, () => {
            dialogs.setResourceDialogOpen(false);
            dialogs.setEditingResource(null);
          })
        }
        moduleDialogOpen={dialogs.moduleDialogOpen}
        onModuleDialogOpenChange={(open) => {
          dialogs.setModuleDialogOpen(open);
          if (!open) dialogs.setEditingModule(null);
        }}
        editingModule={dialogs.editingModule}
        modulePending={
          crud.createModuleMutation.isPending || crud.updateModuleMutation.isPending
        }
        onModuleSubmit={(payload) =>
          crud.handleModuleSubmit(payload, () => {
            dialogs.setModuleDialogOpen(false);
            dialogs.setEditingModule(null);
          })
        }
        deleteResourceId={dialogs.deleteResourceId}
        onDeleteResourceIdChange={dialogs.setDeleteResourceId}
        onConfirmDeleteResource={(id) => {
          dialogs.setDeleteResourceId(null);
          listOps.handleDeleteResource(id);
        }}
        deleteResourcePending={listOps.deleteResourceMutation.isPending}
        deleteModuleId={dialogs.deleteModuleId}
        onDeleteModuleIdChange={dialogs.setDeleteModuleId}
        onConfirmDeleteModule={(id) => {
          dialogs.setDeleteModuleId(null);
          listOps.handleDeleteModule(id);
        }}
        deleteModulePending={listOps.deleteModuleMutation.isPending}
        analyticsResource={dialogs.analyticsResource}
        onAnalyticsOpenChange={(o) => !o && dialogs.setAnalyticsResource(null)}
      />
    </div>
  );
}
