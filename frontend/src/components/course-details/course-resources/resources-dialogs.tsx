'use client';

import { ResourceFormDialog } from '../resource-form';
import { ModuleFormDialog } from '../module-form';
import { ResourceAnalyticsPanel } from '../resource-analytics-panel';
import type { CourseModule, Resource } from '@/lib/course-details/types';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';
import type { ModuleSubmitPayload, ResourceSubmitPayload } from './submit-types';

export function ResourcesDialogs({
  isStudent,
  modules,
  resourceDialogOpen,
  onResourceDialogOpenChange,
  editingResource,
  defaultModuleId,
  resourcePending,
  onResourceSubmit,
  moduleDialogOpen,
  onModuleDialogOpenChange,
  editingModule,
  modulePending,
  onModuleSubmit,
  deleteResourceId,
  onDeleteResourceIdChange,
  onConfirmDeleteResource,
  deleteResourcePending,
  deleteModuleId,
  onDeleteModuleIdChange,
  onConfirmDeleteModule,
  deleteModulePending,
  analyticsResource,
  onAnalyticsOpenChange
}: {
  isStudent: boolean;
  modules: CourseModule[];
  resourceDialogOpen: boolean;
  onResourceDialogOpenChange: (open: boolean) => void;
  editingResource: Resource | null;
  defaultModuleId: number | null;
  resourcePending: boolean;
  onResourceSubmit: (payload: ResourceSubmitPayload) => void;
  moduleDialogOpen: boolean;
  onModuleDialogOpenChange: (open: boolean) => void;
  editingModule: CourseModule | null;
  modulePending: boolean;
  onModuleSubmit: (payload: ModuleSubmitPayload) => void;
  deleteResourceId: number | null;
  onDeleteResourceIdChange: (id: number | null) => void;
  onConfirmDeleteResource: (id: number) => void;
  deleteResourcePending: boolean;
  deleteModuleId: number | null;
  onDeleteModuleIdChange: (id: number | null) => void;
  onConfirmDeleteModule: (id: number) => void;
  deleteModulePending: boolean;
  analyticsResource: Resource | null;
  onAnalyticsOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      <ResourceFormDialog
        open={resourceDialogOpen}
        onOpenChange={onResourceDialogOpenChange}
        editing={editingResource}
        modules={modules}
        defaultModuleId={defaultModuleId}
        pending={resourcePending}
        onSubmit={onResourceSubmit}
      />

      <ModuleFormDialog
        open={moduleDialogOpen}
        onOpenChange={onModuleDialogOpenChange}
        editing={editingModule}
        pending={modulePending}
        onSubmit={onModuleSubmit}
      />

      <ConfirmDeleteDialog
        open={deleteResourceId !== null}
        title='Delete material?'
        description='The item will move to a 5-second undo banner before it’s permanently removed.'
        pending={deleteResourcePending}
        onClose={() => onDeleteResourceIdChange(null)}
        onConfirm={() =>
          deleteResourceId != null && onConfirmDeleteResource(deleteResourceId)
        }
      />

      <ConfirmDeleteDialog
        open={deleteModuleId !== null}
        title='Delete module?'
        description='Resources inside the module won’t be deleted — they’ll move to “Ungrouped”.'
        pending={deleteModulePending}
        onClose={() => onDeleteModuleIdChange(null)}
        onConfirm={() =>
          deleteModuleId != null && onConfirmDeleteModule(deleteModuleId)
        }
      />

      {!isStudent ? (
        <ResourceAnalyticsPanel
          resource={analyticsResource}
          open={!!analyticsResource}
          onOpenChange={onAnalyticsOpenChange}
        />
      ) : null}
    </>
  );
}
