import type { CourseGroup } from '../../api/groups-types';

export function filterGroupsByName(groups: CourseGroup[], search: string): CourseGroup[] {
  const q = search.trim().toLowerCase();
  if (!q) return groups;
  return groups.filter((g) => g.name.toLowerCase().includes(q));
}

export function assignedMemberIds(groups: CourseGroup[]): Set<number> {
  return new Set(groups.flatMap((g) => g.members.map((m) => m.memberId)));
}

export function groupAssignmentStats(groups: CourseGroup[], rosterSize: number) {
  const assignedCount = assignedMemberIds(groups).size;
  return {
    assignedCount,
    unassignedCount: rosterSize - assignedCount,
  };
}
