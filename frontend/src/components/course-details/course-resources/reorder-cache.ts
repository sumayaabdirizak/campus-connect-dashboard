import type { CourseModule, Resource } from '@/lib/course-details/types';

export function patchResourceOrder(
  prev: Resource[] | undefined,
  items: { id: number; moduleId: number | null; position: number }[]
): Resource[] {
  if (!prev) return [];
  const lookup = new Map(items.map((it) => [it.id, it]));
  return prev.map((r) => {
    const it = lookup.get(r.id);
    return it ? { ...r, moduleId: it.moduleId, position: it.position } : r;
  });
}

export function patchModuleOrder(
  prev: CourseModule[] | undefined,
  orderedIds: number[]
): CourseModule[] {
  if (!prev) return [];
  const items = orderedIds.map((id, i) => ({ id, position: i }));
  const posById = new Map(items.map((it) => [it.id, it.position]));
  return [...prev]
    .map((m) => ({ ...m, position: posById.get(m.id) ?? m.position }))
    .toSorted((a, b) => a.position - b.position);
}

export function moduleReorderPayload(orderedIds: number[]) {
  return orderedIds.map((id, i) => ({ id, position: i }));
}
