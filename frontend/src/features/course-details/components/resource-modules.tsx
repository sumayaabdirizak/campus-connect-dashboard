'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DraggableSyntheticListeners,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { BarChart3, Edit, GripVertical, Plus, Trash2 } from 'lucide-react';
import type { CourseModule, Resource } from '../api/resources-types';
import {
  ResourceCard,
  VideoRenderer,
  LinkRenderer,
  AudioRenderer,
  isAudio,
  isUploadedVideo,
  isUploadedAudio
} from './resource-renderers';
import { TrackedMediaPlayer } from './tracked-media-player';
import { resourceDownloadUrl } from '../api/resources-service';

// ─── DragHandle context ────────────────────────────────────────────────────
//
// `useSortable` returns the pointer listeners that initiate a drag. We can't
// attach them to the whole sortable wrapper (that would make Accordion
// triggers and action buttons start drags on click); we want them on a
// dedicated GripVertical handle. We forward `listeners`/`attributes` through
// context so the deeply-nested handle can pick them up without prop drilling
// through ResourceCard / VideoRenderer / etc.

interface DragHandleSlotValue {
  attributes: ReturnType<typeof useSortable>['attributes'] | null;
  listeners: DraggableSyntheticListeners;
}

const DragHandleContext = createContext<DragHandleSlotValue>({
  attributes: null,
  listeners: undefined
});

function DragHandle() {
  const { attributes, listeners } = useContext(DragHandleContext);
  // Render nothing if not inside a sortable wrapper (e.g. student mode).
  if (!attributes) return null;
  return (
    <button
      type='button'
      className='cursor-grab active:cursor-grabbing text-muted-foreground/70 hover:text-muted-foreground shrink-0 p-1 -ml-1'
      aria-label='Drag to reorder'
      {...attributes}
      {...listeners}
    >
      <GripVertical className='w-4 h-4' />
    </button>
  );
}

interface ResourceModulesProps {
  modules: CourseModule[];
  resources: Resource[];
  isStudent?: boolean;
  /// "Add material" CTA on a module header (teacher only). The caller opens
  /// the Create dialog pre-set to this module.
  onAddToModule?: (moduleId: number | null) => void;
  onEditModule?: (module: CourseModule) => void;
  onDeleteModule?: (moduleId: number) => void;
  onEditResource?: (resource: Resource) => void;
  onDeleteResource?: (resourceId: number) => void;
  /// Teacher-only: open the watch-analytics panel for an uploaded video/audio
  /// resource. Undefined for students (they never see the Analytics button).
  onAnalytics?: (resource: Resource) => void;
  /// Drag-end handlers. The component owns no mutation logic — it computes
  /// the new order, hands it back, and lets the parent fire the mutation.
  onReorderModules?: (orderedIds: number[]) => void;
  onReorderResources?: (
    items: { id: number; moduleId: number | null; position: number }[]
  ) => void;
}

/**
 * Module-grouped resource list with drag-reorder.
 *
 * Teachers see drag handles on both modules (re-order the buckets) and
 * resources (re-order within a bucket). Cross-bucket drag-drop isn't
 * supported yet — moving a resource into a different module is done via the
 * Edit dialog's Module dropdown, which keeps the DnD surface simpler.
 *
 * Students see a static accordion: no handles, drafts filtered out by the
 * parent. The "Ungrouped" bucket always renders last and hides when it's
 * empty for students (teachers see it so they can drop new resources into
 * it as a staging area).
 */
export function ResourceModules({
  modules,
  resources,
  isStudent,
  onAddToModule,
  onEditModule,
  onDeleteModule,
  onEditResource,
  onDeleteResource,
  onAnalytics,
  onReorderModules,
  onReorderResources
}: ResourceModulesProps) {
  const byModule = useMemo(() => {
    const groups = new Map<number | 'none', Resource[]>();
    for (const r of resources) {
      const key: number | 'none' = r.moduleId ?? 'none';
      const list = groups.get(key) ?? [];
      list.push(r);
      groups.set(key, list);
    }
    // Each bucket is independently sorted by position; the server returns
    // them ordered, but we re-sort here in case an optimistic patch put
    // a row in the wrong slot.
    for (const list of groups.values()) {
      list.sort((a, b) => a.position - b.position);
    }
    return groups;
  }, [resources]);

  const ungrouped = byModule.get('none') ?? [];
  const showUngrouped = !isStudent || ungrouped.length > 0;

  return (
    <div className='space-y-4'>
      <ModuleList
        modules={modules}
        isStudent={isStudent}
        onReorder={onReorderModules}
        renderModule={(mod) => (
          <ModuleBucket
            key={mod.id}
            module={mod}
            resources={byModule.get(mod.id) ?? []}
            isStudent={isStudent}
            onAdd={() => onAddToModule?.(mod.id)}
            onEdit={() => onEditModule?.(mod)}
            onDelete={() => onDeleteModule?.(mod.id)}
            onEditResource={onEditResource}
            onDeleteResource={onDeleteResource}
            onAnalytics={onAnalytics}
            onReorderResources={onReorderResources}
          />
        )}
      />

      {showUngrouped && (
        <UngroupedBucket
          resources={ungrouped}
          isStudent={isStudent}
          onAdd={() => onAddToModule?.(null)}
          onEditResource={onEditResource}
          onDeleteResource={onDeleteResource}
          onAnalytics={onAnalytics}
          onReorderResources={onReorderResources}
        />
      )}
    </div>
  );
}

// ─── Module list (vertical DnD over modules) ───────────────────────────────

function ModuleList({
  modules,
  isStudent,
  onReorder,
  renderModule
}: {
  modules: CourseModule[];
  isStudent?: boolean;
  onReorder?: (orderedIds: number[]) => void;
  renderModule: (mod: CourseModule) => React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [localOrder, setLocalOrder] = useState<number[] | null>(null);
  const orderedIds = localOrder ?? modules.map((m) => m.id);
  const ordered = orderedIds
    .map((id) => modules.find((m) => m.id === id))
    .filter((m): m is CourseModule => !!m);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(Number(active.id));
    const newIndex = orderedIds.indexOf(Number(over.id));
    const next = arrayMove(orderedIds, oldIndex, newIndex);
    setLocalOrder(next);
    onReorder?.(next);
  };

  if (isStudent || !onReorder) {
    return <div className='space-y-3'>{modules.map(renderModule)}</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
        <div className='space-y-3'>
          {ordered.map((mod) => (
            <SortableWrapper key={mod.id} id={mod.id}>
              {renderModule(mod)}
            </SortableWrapper>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/// Generic sortable wrapper. Provides the `setNodeRef` + transform on the
/// outer element, and exposes the drag listeners via context so a nested
/// `<DragHandle />` picks them up.
function SortableWrapper({ id, children }: { id: number; children: React.ReactNode }) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id
  });
  return (
    <DragHandleContext.Provider value={{ attributes, listeners }}>
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.6 : 1
        }}
      >
        {children}
      </div>
    </DragHandleContext.Provider>
  );
}

// ─── Single module bucket ──────────────────────────────────────────────────

function ModuleBucket({
  module: mod,
  resources,
  isStudent,
  onAdd,
  onEdit,
  onDelete,
  onEditResource,
  onDeleteResource,
  onAnalytics,
  onReorderResources
}: {
  module: CourseModule;
  resources: Resource[];
  isStudent?: boolean;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onEditResource?: (resource: Resource) => void;
  onDeleteResource?: (resourceId: number) => void;
  onAnalytics?: (resource: Resource) => void;
  onReorderResources?: (
    items: { id: number; moduleId: number | null; position: number }[]
  ) => void;
}) {
  const isDraft = !mod.publishedAt;
  // Students never see draft modules — the parent should filter them, but
  // we belt-and-braces it here too.
  if (isStudent && isDraft) return null;

  return (
    <Accordion
      type='single'
      collapsible
      defaultValue={`module-${mod.id}`}
      className='border rounded-lg'
    >
      <AccordionItem value={`module-${mod.id}`} className='border-0'>
        <div className='flex items-center gap-2 px-3'>
          {!isStudent && <DragHandle />}
          <AccordionTrigger className='flex-1 hover:no-underline py-3'>
            <div className='flex items-center gap-2 min-w-0'>
              <p className='font-medium text-left truncate'>{mod.title}</p>
              {isDraft && (
                <Badge variant='outline' className='text-[10px]'>
                  Draft
                </Badge>
              )}
              <span className='text-xs text-muted-foreground shrink-0'>
                {resources.length} {resources.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </AccordionTrigger>
          {!isStudent && (
            <div className='flex items-center gap-1 shrink-0'>
              {onAdd && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7'
                  onClick={onAdd}
                  aria-label={`Add material to ${mod.title}`}
                >
                  <Plus className='w-3.5 h-3.5' />
                </Button>
              )}
              {onEdit && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7'
                  onClick={onEdit}
                  aria-label={`Rename ${mod.title}`}
                >
                  <Edit className='w-3.5 h-3.5' />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 text-destructive'
                  onClick={onDelete}
                  aria-label={`Delete ${mod.title}`}
                >
                  <Trash2 className='w-3.5 h-3.5' />
                </Button>
              )}
            </div>
          )}
        </div>
        <AccordionContent className='px-3 pb-3'>
          {mod.description && (
            <p className='text-xs text-muted-foreground mb-3'>{mod.description}</p>
          )}
          <ResourceList
            resources={resources}
            moduleId={mod.id}
            isStudent={isStudent}
            onEditResource={onEditResource}
            onDeleteResource={onDeleteResource}
            onAnalytics={onAnalytics}
            onReorderResources={onReorderResources}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function UngroupedBucket({
  resources,
  isStudent,
  onAdd,
  onEditResource,
  onDeleteResource,
  onAnalytics,
  onReorderResources
}: {
  resources: Resource[];
  isStudent?: boolean;
  onAdd?: () => void;
  onEditResource?: (resource: Resource) => void;
  onDeleteResource?: (resourceId: number) => void;
  onAnalytics?: (resource: Resource) => void;
  onReorderResources?: (
    items: { id: number; moduleId: number | null; position: number }[]
  ) => void;
}) {
  return (
    <Accordion
      type='single'
      collapsible
      defaultValue='ungrouped'
      className='border rounded-lg border-dashed'
    >
      <AccordionItem value='ungrouped' className='border-0'>
        <div className='flex items-center gap-2 px-3'>
          <AccordionTrigger className='flex-1 hover:no-underline py-3'>
            <div className='flex items-center gap-2 min-w-0'>
              <p className='font-medium text-left truncate'>Ungrouped</p>
              <span className='text-xs text-muted-foreground shrink-0'>
                {resources.length} {resources.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </AccordionTrigger>
          {!isStudent && onAdd && (
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7'
              onClick={onAdd}
              aria-label='Add ungrouped material'
            >
              <Plus className='w-3.5 h-3.5' />
            </Button>
          )}
        </div>
        <AccordionContent className='px-3 pb-3'>
          {resources.length === 0 ? (
            <p className='text-xs text-muted-foreground italic'>
              {isStudent
                ? 'Nothing here yet.'
                : 'Materials added without a module land here. Edit a resource and pick a module to organize.'}
            </p>
          ) : (
            <ResourceList
              resources={resources}
              moduleId={null}
              isStudent={isStudent}
              onEditResource={onEditResource}
              onDeleteResource={onDeleteResource}
              onAnalytics={onAnalytics}
              onReorderResources={onReorderResources}
            />
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

// ─── Resource list (vertical DnD within a single bucket) ───────────────────

function ResourceList({
  resources,
  moduleId,
  isStudent,
  onEditResource,
  onDeleteResource,
  onAnalytics,
  onReorderResources
}: {
  resources: Resource[];
  moduleId: number | null;
  isStudent?: boolean;
  onEditResource?: (resource: Resource) => void;
  onDeleteResource?: (resourceId: number) => void;
  onAnalytics?: (resource: Resource) => void;
  onReorderResources?: (
    items: { id: number; moduleId: number | null; position: number }[]
  ) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Special-case videos + links so they keep their rich renderers when they
  // appear inside a module bucket. The drag handle still shows up.
  const renderItem = (r: Resource) => {
    const dragHandle = !isStudent && onReorderResources ? <DragHandle /> : null;

    // Teacher-only action cluster shared by the rich media headers (video /
    // audio). Analytics shows only for uploaded media we can actually track.
    const trackable = isUploadedVideo(r) || isUploadedAudio(r);
    const mediaActions = !isStudent ? (
      <>
        {onAnalytics && trackable && (
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            onClick={() => onAnalytics(r)}
            aria-label={`Watch analytics for ${r.title}`}
          >
            <BarChart3 className='w-3.5 h-3.5' />
          </Button>
        )}
        {onEditResource && (
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            onClick={() => onEditResource(r)}
            aria-label={`Edit ${r.title}`}
          >
            <Edit className='w-3.5 h-3.5' />
          </Button>
        )}
        {onDeleteResource && (
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => onDeleteResource(r.id)}
            aria-label={`Delete ${r.title}`}
          >
            <Trash2 className='w-3.5 h-3.5' />
          </Button>
        )}
      </>
    ) : null;

    if (r.type === 'VIDEO') {
      return (
        <div className='space-y-2 border rounded-lg p-3'>
          <div className='flex items-center gap-2'>
            {dragHandle}
            <p className='font-medium text-sm flex-1 truncate'>{r.title}</p>
            {mediaActions}
          </div>
          {/* Uploaded video files get the tracked player (reports watch
              progress to analytics); YouTube / external links keep the plain
              renderer since we can't measure watch time through an iframe. */}
          {isUploadedVideo(r) ? (
            <TrackedMediaPlayer
              resourceId={r.id}
              url={resourceDownloadUrl(r.id)}
              title={r.title}
              kind='video'
              track={!!isStudent}
            />
          ) : (
            <VideoRenderer url={r.url} title={r.title} />
          )}
        </div>
      );
    }
    if (r.type === 'EXTERNAL_LINK') {
      return (
        <div className='flex items-center gap-2'>
          {dragHandle}
          <div className='flex-1'>
            <LinkRenderer url={r.url} title={r.title} />
          </div>
        </div>
      );
    }
    if (isAudio(r)) {
      return (
        <div className='space-y-1 border rounded-lg p-3'>
          <div className='flex items-center gap-2'>
            {dragHandle}
            <p className='font-medium text-sm flex-1 truncate'>{r.title}</p>
            {mediaActions}
          </div>
          {isUploadedAudio(r) ? (
            <TrackedMediaPlayer
              resourceId={r.id}
              url={resourceDownloadUrl(r.id)}
              title={r.title}
              kind='audio'
              track={!!isStudent}
              showTitle={false}
            />
          ) : (
            <AudioRenderer url={r.url} title={r.title} />
          )}
        </div>
      );
    }
    return (
      <ResourceCard
        resource={r}
        isStudent={isStudent}
        onEdit={onEditResource}
        onDelete={onDeleteResource}
        dragHandle={dragHandle}
      />
    );
  };

  if (isStudent || !onReorderResources) {
    return (
      <div className='space-y-2'>
        {resources.map((r) => (
          <div key={r.id}>{renderItem(r)}</div>
        ))}
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = resources.map((r) => r.id);
    const oldIndex = ids.indexOf(Number(active.id));
    const newIndex = ids.indexOf(Number(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(resources, oldIndex, newIndex);
    onReorderResources(next.map((r, i) => ({ id: r.id, moduleId, position: i })));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={resources.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <div className='space-y-2'>
          {resources.map((r) => (
            <SortableWrapper key={r.id} id={r.id}>
              {renderItem(r)}
            </SortableWrapper>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
