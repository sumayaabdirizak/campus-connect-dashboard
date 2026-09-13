'use client';

import {
  DndContext,
  type DragEndEvent,
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
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import type { Resource } from '@/lib/course-details/types';
import { SortableWrapper } from './drag-handle';
import { ResourceListItem } from './resource-list-item';
import type { ReorderResourcesFn } from './types';

interface ResourceListProps {
  resources: Resource[];
  moduleId: number | null;
  isStudent?: boolean;
  onEditResource?: (resource: Resource) => void;
  onDeleteResource?: (resourceId: number) => void;
  onAnalytics?: (resource: Resource) => void;
  onReorderResources?: ReorderResourcesFn;
}

export function ResourceList({
  resources,
  moduleId,
  isStudent,
  onEditResource,
  onDeleteResource,
  onAnalytics,
  onReorderResources
}: ResourceListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const showDragHandle = !isStudent && !!onReorderResources;

  const renderItem = (r: Resource) => (
    <ResourceListItem
      resource={r}
      isStudent={isStudent}
      showDragHandle={showDragHandle}
      onEditResource={onEditResource}
      onDeleteResource={onDeleteResource}
      onAnalytics={onAnalytics}
    />
  );

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
      <SortableContext
        items={resources.map((r) => r.id)}
        strategy={verticalListSortingStrategy}
      >
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
