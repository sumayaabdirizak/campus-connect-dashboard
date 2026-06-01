'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  FolderOpen,
  Calendar,
  FolderPlus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';
import { useDeleteWithUndo } from './_shared/use-delete-with-undo';
import { useQueryClient } from '@/lib/async-query';
import { deleteResource as deleteResourceCall } from '../api/resources-service';
import {
  resourceKeys,
  useCreateModule,
  useCreateResource,
  useDeleteModule,
  useDeleteResource,
  useModules,
  useReorderModules,
  useReorderResources,
  useResources,
  useUpdateModule,
  useUpdateResource
} from '../api/resources-queries';
import { useAuthStore } from '@/lib/auth-store';
import { useSessions } from '../api/attendance-queries';
import { resourceDownloadUrl } from '../api/resources-service';
import type {
  CourseModule,
  Resource,
  ResourceType
} from '../api/resources-types';
import { PdfViewer } from './pdf-viewer';
import { ResourceFormDialog } from './resource-form';
import { ModuleFormDialog } from './module-form';
import { ResourceModules } from './resource-modules';
import { ResourceAnalyticsPanel } from './resource-analytics-panel';
import { humanizeType } from './resource-renderers';

interface CourseResourcesProps {
  courseId: string;
  isStudent?: boolean;
}

const RESOURCE_TYPES: ResourceType[] = [
  'SYLLABUS',
  'ASSIGNMENT',
  'LECTURE_NOTE',
  'VIDEO',
  'EXTERNAL_LINK',
  'OTHER'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ScheduleItem {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string;
  topic: string | null;
  is_lab: boolean;
}

function ScheduleSection({ items }: { items: ScheduleItem[] }) {
  if (!items.length) return null;
  return (
    <section className='space-y-2'>
      <div className='flex items-center gap-2'>
        <Calendar className='w-4 h-4 text-muted-foreground' />
        <h3 className='font-medium'>Schedule</h3>
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'>
        {items.map((s) => (
          <div key={s.id} className='border rounded-lg p-3'>
            <p className='font-medium text-sm'>
              {DAY_NAMES[s.day_of_week] ?? '?'} · {s.start_time} – {s.end_time}
            </p>
            <p className='text-xs text-muted-foreground'>{s.location}</p>
            {s.topic && <p className='text-xs mt-1'>{s.topic}</p>}
            {s.is_lab && (
              <Badge variant='outline' className='mt-1 text-[10px]'>
                Lab
              </Badge>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Top-level page for the Resources tab.
 *
 * Owns the filter state (search + type) and the dialog state; delegates the
 * actual rendering of the module-grouped list (with drag-reorder) to
 * `ResourceModules`. Forms live in `ResourceFormDialog` / `ModuleFormDialog`
 * — we used to inline two near-identical create/edit dialogs here and they
 * drifted constantly.
 */
export function CourseResources({ courseId, isStudent }: CourseResourcesProps) {
  const { user } = useAuthStore();
  const teacherId = typeof user?.id === 'number' ? user.id : Number(user?.id ?? 0);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ResourceType>('all');

  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [defaultModuleId, setDefaultModuleId] = useState<number | null>(null);

  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);

  const [deleteResourceId, setDeleteResourceId] = useState<number | null>(null);
  const [deleteModuleId, setDeleteModuleId] = useState<number | null>(null);

  const [previewing, setPreviewing] = useState<Resource | null>(null);
  const [analyticsResource, setAnalyticsResource] = useState<Resource | null>(null);

  const { data: resources = [], isLoading, isError } = useResources(courseId);
  const { data: modules = [] } = useModules(courseId);
  const { data: sessions = [] } = useSessions(courseId);

  const createResourceMutation = useCreateResource(courseId);
  const updateResourceMutation = useUpdateResource(courseId);
  const deleteResourceMutation = useDeleteResource(courseId);
  const reorderResourcesMutation = useReorderResources(courseId);

  const createModuleMutation = useCreateModule(courseId);
  const updateModuleMutation = useUpdateModule(courseId);
  const deleteModuleMutation = useDeleteModule(courseId);
  const reorderModulesMutation = useReorderModules(courseId);

  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  const visibleModules = useMemo(
    () => (isStudent ? modules.filter((m) => !!m.publishedAt) : modules),
    [modules, isStudent]
  );

  // Filter then thread through the module list. Students never see drafts.
  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (isStudent && (r.is_draft || r.status !== 'APPROVED')) return false;
      // If a student is viewing and the resource belongs to a draft module,
      // hide it — we don't want a published resource to leak through a
      // hidden bucket.
      if (isStudent && r.moduleId != null) {
        const mod = modules.find((m) => m.id === r.moduleId);
        if (mod && !mod.publishedAt) return false;
      }
      return true;
    });
  }, [resources, typeFilter, search, isStudent, modules]);

  const handleResourceSubmit: React.ComponentProps<
    typeof ResourceFormDialog
  >['onSubmit'] = (payload) => {
    if (payload.mode === 'create') {
      if (!teacherId) {
        toast.error('You must be signed in to add materials');
        return;
      }
      createResourceMutation.mutate(
        { ...payload.data, teacherId },
        {
          onSuccess: () => {
            setResourceDialogOpen(false);
            toast.success('Material added');
          },
          onError: (err: Error) => toast.error(err.message)
        }
      );
    } else {
      updateResourceMutation.mutate(
        { resourceId: payload.resourceId, data: payload.data },
        {
          onSuccess: () => {
            setResourceDialogOpen(false);
            setEditingResource(null);
            toast.success('Material updated');
          },
          onError: (err: Error) => toast.error(err.message)
        }
      );
    }
  };

  const handleModuleSubmit: React.ComponentProps<typeof ModuleFormDialog>['onSubmit'] = (
    payload
  ) => {
    if (payload.mode === 'create') {
      createModuleMutation.mutate(payload.data, {
        onSuccess: () => {
          setModuleDialogOpen(false);
          toast.success('Module added');
        },
        onError: (err: Error) => toast.error(err.message)
      });
    } else {
      updateModuleMutation.mutate(
        { moduleId: payload.moduleId, data: payload.data },
        {
          onSuccess: () => {
            setModuleDialogOpen(false);
            setEditingModule(null);
            toast.success('Module updated');
          },
          onError: (err: Error) => toast.error(err.message)
        }
      );
    }
  };

  const handleDeleteResource = (id: number) => {
    setDeleteResourceId(null);
    const key = resourceKeys.list(courseId);
    const snapshot = queryClient.getQueryData<Resource[]>(key);
    if (!snapshot) return;
    const removed = snapshot.find((r) => r.id === id);
    if (!removed) return;
    runDelete({
      label: `Material deleted · "${removed.title}"`,
      optimisticallyRemove: () => {
        queryClient.setQueryData<Resource[]>(key, (prev) =>
          (prev ?? []).filter((r) => r.id !== id)
        );
      },
      restore: () => queryClient.setQueryData<Resource[]>(key, () => snapshot),
      commit: () => deleteResourceCall(String(id))
    });
  };

  const handleDeleteModule = (id: number) => {
    setDeleteModuleId(null);
    deleteModuleMutation.mutate(id, {
      onSuccess: () => toast.success('Module deleted'),
      onError: (err: Error) => toast.error(err.message)
    });
  };

  /// Drag-reorder commits without optimistic update — the server response is
  /// the source of truth, but we do patch the cache eagerly so the list
  /// doesn't snap back to its old order while the request is in flight.
  const handleReorderResources = (
    items: { id: number; moduleId: number | null; position: number }[]
  ) => {
    const key = resourceKeys.list(courseId);
    queryClient.setQueryData<Resource[]>(key, (prev) => {
      if (!prev) return [];
      const lookup = new Map(items.map((it) => [it.id, it]));
      return prev.map((r) => {
        const it = lookup.get(r.id);
        return it ? { ...r, moduleId: it.moduleId, position: it.position } : r;
      });
    });
    reorderResourcesMutation.mutate(items, {
      onError: (err: Error) => toast.error(err.message)
    });
  };

  const handleReorderModules = (orderedIds: number[]) => {
    const items = orderedIds.map((id, i) => ({ id, position: i }));
    const key = resourceKeys.modules(courseId);
    queryClient.setQueryData<CourseModule[]>(key, (prev) => {
      if (!prev) return [];
      const posById = new Map(items.map((it) => [it.id, it.position]));
      return [...prev]
        .map((m) => ({ ...m, position: posById.get(m.id) ?? m.position }))
        .sort((a, b) => a.position - b.position);
    });
    reorderModulesMutation.mutate(items, {
      onError: (err: Error) => toast.error(err.message)
    });
  };

  const openCreateResource = (moduleId: number | null) => {
    setEditingResource(null);
    setDefaultModuleId(moduleId);
    setResourceDialogOpen(true);
  };

  const openEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setDefaultModuleId(null);
    setResourceDialogOpen(true);
  };

  return (
    <div className='space-y-6'>
      <ScheduleSection items={sessions as ScheduleItem[]} />

      {/* Filter toolbar. On mobile the controls wrap; the action buttons
          collapse to icon-only via `sm:` text. */}
      <div className='flex flex-wrap gap-2'>
        <div className='relative flex-1 min-w-[10rem] max-w-xs'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            placeholder='Search...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='pl-10'
            aria-label='Search materials'
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as 'all' | ResourceType)}
        >
          <SelectTrigger className='w-36 sm:w-44'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All types</SelectItem>
            {RESOURCE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {humanizeType(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isStudent && (
          <>
            <Button
              variant='outline'
              onClick={() => {
                setEditingModule(null);
                setModuleDialogOpen(true);
              }}
              className='gap-1'
            >
              <FolderPlus className='w-4 h-4' />
              <span className='hidden sm:inline'>Add module</span>
            </Button>
            <Button onClick={() => openCreateResource(null)} className='gap-1'>
              <Plus className='w-4 h-4' />
              <span className='hidden sm:inline'>Add material</span>
            </Button>
          </>
        )}
      </div>

      {isLoading && <ListSkeleton variant='card' count={3} />}
      {isError && <p className='text-sm text-destructive'>Failed to load resources.</p>}
      {!isLoading && !isError && filtered.length === 0 && visibleModules.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title='No materials yet'
          description={
            isStudent
              ? 'Your teacher hasn’t shared any books, slides, or links for this course yet.'
              : 'Upload a syllabus PDF, slide deck, or paste a YouTube link to get started.'
          }
          actionLabel={isStudent ? undefined : 'Add material'}
          onAction={isStudent ? undefined : () => openCreateResource(null)}
        />
      )}

      {(filtered.length > 0 || visibleModules.length > 0) && (
        <ResourceModules
          modules={visibleModules}
          resources={filtered}
          isStudent={isStudent}
          onAddToModule={openCreateResource}
          onEditModule={(m) => {
            setEditingModule(m);
            setModuleDialogOpen(true);
          }}
          onDeleteModule={(id) => setDeleteModuleId(id)}
          onEditResource={openEditResource}
          onDeleteResource={(id) => setDeleteResourceId(id)}
          onPreviewResource={setPreviewing}
          onAnalytics={isStudent ? undefined : setAnalyticsResource}
          onReorderModules={isStudent ? undefined : handleReorderModules}
          onReorderResources={isStudent ? undefined : handleReorderResources}
        />
      )}

      <ResourceFormDialog
        open={resourceDialogOpen}
        onOpenChange={(open) => {
          setResourceDialogOpen(open);
          if (!open) setEditingResource(null);
        }}
        editing={editingResource}
        modules={modules}
        defaultModuleId={defaultModuleId}
        pending={createResourceMutation.isPending || updateResourceMutation.isPending}
        onSubmit={handleResourceSubmit}
      />

      <ModuleFormDialog
        open={moduleDialogOpen}
        onOpenChange={(open) => {
          setModuleDialogOpen(open);
          if (!open) setEditingModule(null);
        }}
        editing={editingModule}
        pending={createModuleMutation.isPending || updateModuleMutation.isPending}
        onSubmit={handleModuleSubmit}
      />

      <Dialog
        open={deleteResourceId !== null}
        onOpenChange={(o) => !o && setDeleteResourceId(null)}
      >
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Delete material?</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            The item will move to a 5-second undo banner before it’s permanently removed.
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteResourceId(null)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => deleteResourceId && handleDeleteResource(deleteResourceId)}
              disabled={deleteResourceMutation.isPending}
            >
              {deleteResourceMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModuleId !== null} onOpenChange={(o) => !o && setDeleteModuleId(null)}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Delete module?</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            Resources inside the module won’t be deleted — they’ll move to “Ungrouped”.
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteModuleId(null)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => deleteModuleId && handleDeleteModule(deleteModuleId)}
              disabled={deleteModuleMutation.isPending}
            >
              {deleteModuleMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <SheetContent className='w-full sm:max-w-3xl overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>{previewing?.title ?? 'Preview'}</SheetTitle>
          </SheetHeader>
          {previewing && (
            <div className='space-y-3 py-4'>
              {previewing.description && (
                <p className='text-sm text-muted-foreground'>{previewing.description}</p>
              )}
              <PdfViewer
                url={
                  previewing.originalName
                    ? resourceDownloadUrl(previewing.id)
                    : previewing.url
                }
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {!isStudent && (
        <ResourceAnalyticsPanel
          resource={analyticsResource}
          open={!!analyticsResource}
          onOpenChange={(o) => !o && setAnalyticsResource(null)}
        />
      )}
    </div>
  );
}
