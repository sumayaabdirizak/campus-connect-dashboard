import type { GroupDmCandidate } from '@/lib/discussions/queries/types'

export type HierarchyNode = {
  key: string
  id: number | null
  label: string
  count: number
}

export type HierarchyStep = 'department' | 'batch' | 'section' | 'people'

/** Short name without “(Section …, BATCH)” seed suffix. */
export function candidateDisplayName(c: GroupDmCandidate): string {
  const raw = String(c.full_name || '').trim()
  const cut = raw.replace(/\s*\([^)]*\)\s*$/, '').trim()
  return cut || raw
}

export function roleLabel(role?: string | null): string | null {
  const r = String(role || '').toUpperCase()
  if (r === 'STUDENT') return 'Student'
  if (r === 'TEACHER' || r === 'LECTURER') return 'Teacher'
  if (r === 'DEAN') return 'Dean'
  return r || null
}

export type RoleFilterKey = 'STUDENT' | 'TEACHER'

export const DEFAULT_ROLE_FILTERS: RoleFilterKey[] = ['STUDENT', 'TEACHER']

/** Dean faculty group picker — teachers and students. */
export const DEAN_GROUP_ROLE_FILTERS: RoleFilterKey[] = ['STUDENT', 'TEACHER']

export function normalizeCandidateRole(role?: string | null): RoleFilterKey | null {
  const r = String(role || '').toUpperCase()
  if (r === 'STUDENT') return 'STUDENT'
  if (r === 'TEACHER' || r === 'LECTURER') return 'TEACHER'
  return null
}

export function filterByRoles(
  candidates: GroupDmCandidate[],
  roles: RoleFilterKey[]
): GroupDmCandidate[] {
  if (roles.length === 0) return []
  const set = new Set(roles)
  return candidates.filter((c) => {
    const key = normalizeCandidateRole(c.role)
    return key != null && set.has(key)
  })
}

function deptKey(c: GroupDmCandidate): string {
  if (c.departmentId) return `d:${c.departmentId}`
  if (c.departmentName) return `n:${c.departmentName}`
  return 'other'
}

function deptLabel(c: GroupDmCandidate): string {
  return c.departmentName?.trim() || c.departmentCode?.trim() || 'Other'
}

export function listDepartments(candidates: GroupDmCandidate[]): HierarchyNode[] {
  const map = new Map<string, HierarchyNode>()
  for (const c of candidates) {
    const key = deptKey(c)
    const existing = map.get(key)
    if (existing) existing.count += 1
    else
      map.set(key, {
        key,
        id: c.departmentId ?? null,
        label: deptLabel(c),
        count: 1,
      })
  }
  return [...map.values()].toSorted((a, b) => {
    if (a.key === 'other') return 1
    if (b.key === 'other') return -1
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  })
}

export function filterByDepartment(
  candidates: GroupDmCandidate[],
  dept: HierarchyNode
): GroupDmCandidate[] {
  return candidates.filter((c) => deptKey(c) === dept.key)
}

const STAFF_BATCH_KEY = 'staff'

export function listBatches(candidates: GroupDmCandidate[]): HierarchyNode[] {
  const map = new Map<string, HierarchyNode>()
  let staffCount = 0
  for (const c of candidates) {
    if (!c.batchId) {
      staffCount += 1
      continue
    }
    const key = `b:${c.batchId}`
    const existing = map.get(key)
    if (existing) existing.count += 1
    else
      map.set(key, {
        key,
        id: c.batchId,
        label: c.batchName?.trim() || `Batch ${c.batchId}`,
        count: 1,
      })
  }
  const batches = [...map.values()].toSorted((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  )
  if (staffCount > 0) {
    batches.push({
      key: STAFF_BATCH_KEY,
      id: null,
      label: 'Teachers & staff',
      count: staffCount,
    })
  }
  return batches
}

export function filterByBatch(
  candidates: GroupDmCandidate[],
  batch: HierarchyNode
): GroupDmCandidate[] {
  if (batch.key === STAFF_BATCH_KEY) {
    return candidates.filter((c) => !c.batchId)
  }
  return candidates.filter((c) => c.batchId === batch.id)
}

export function listSections(candidates: GroupDmCandidate[]): HierarchyNode[] {
  const map = new Map<string, HierarchyNode>()
  for (const c of candidates) {
    if (!c.sectionId) continue
    const key = `s:${c.sectionId}`
    const existing = map.get(key)
    if (existing) existing.count += 1
    else
      map.set(key, {
        key,
        id: c.sectionId,
        label: c.sectionName?.trim() || `Section ${c.sectionId}`,
        count: 1,
      })
  }
  return [...map.values()].toSorted((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  )
}

export function filterBySection(
  candidates: GroupDmCandidate[],
  section: HierarchyNode
): GroupDmCandidate[] {
  return candidates.filter((c) => c.sectionId === section.id)
}

export function isStaffBatch(node: HierarchyNode): boolean {
  return node.key === STAFF_BATCH_KEY
}
