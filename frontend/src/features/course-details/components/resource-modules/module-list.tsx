'use client';

import { useState, type ReactNode } from 'react';
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
import type { CourseModule } from '../../api/resources-types';
import { SortableWrapper } from './drag-handle';

export function ModuleList({
  modules,
  isStudent,
  onReorder,
  renderModule
}: {
  modules: CourseModule[];
  isStudent?: boolean;
  onReorder?: (orderedIds: number[]) => void;
  renderModule: (mod: CourseModule) => ReactNode;
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
