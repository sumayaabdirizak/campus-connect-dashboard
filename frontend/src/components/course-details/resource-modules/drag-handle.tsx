'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface DragHandleSlotValue {
  attributes: ReturnType<typeof useSortable>['attributes'] | null;
  listeners: DraggableSyntheticListeners;
}

const DragHandleContext = createContext<DragHandleSlotValue>({
  attributes: null,
  listeners: undefined
});

export function DragHandle() {
  const { attributes, listeners } = useContext(DragHandleContext);
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

export function SortableWrapper({
  id,
  children
}: {
  id: number;
  children: ReactNode;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } =
    useSortable({ id });
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
