import { prisma } from '../../db/prisma.js';

/** Default catalog. Inactive codes stay for legacy Resource rows. */
export const DEFAULT_RESOURCE_TYPE_OPTIONS = [
  { code: 'LECTURE_NOTE', label: 'Lecture Note', sortOrder: 10, isActive: true },
  { code: 'VIDEO', label: 'Video', sortOrder: 20, isActive: true },
  { code: 'AUDIO', label: 'Audio', sortOrder: 30, isActive: true },
  { code: 'EXTERNAL_LINK', label: 'External Link', sortOrder: 40, isActive: true },
  { code: 'OTHER', label: 'Other', sortOrder: 50, isActive: true },
  { code: 'SYLLABUS', label: 'Syllabus', sortOrder: 60, isActive: false },
  { code: 'ASSIGNMENT', label: 'Assignment', sortOrder: 70, isActive: false },
];

/** Idempotent upsert so GET /types works even if seed was skipped. */
export async function ensureResourceTypeOptions() {
  for (const row of DEFAULT_RESOURCE_TYPE_OPTIONS) {
    await prisma.resourceTypeOption.upsert({
      where: { code: row.code },
      create: row,
      update: {
        sortOrder: row.sortOrder,
        ...(row.code === 'EXTERNAL_LINK' ? { isActive: true } : {}),
      },
    });
  }
}

export async function listResourceTypeOptions({ activeOnly = true } = {}) {
  await ensureResourceTypeOptions();
  return prisma.resourceTypeOption.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    select: {
      code: true,
      label: true,
      sortOrder: true,
      isActive: true,
    },
  });
}

/** @returns {Promise<{ ok: true } | { ok: false, message: string }>} */
export async function assertActiveResourceType(code) {
  if (!code || typeof code !== 'string') {
    return { ok: false, message: 'Resource type is required' };
  }
  await ensureResourceTypeOptions();
  const row = await prisma.resourceTypeOption.findUnique({
    where: { code },
    select: { isActive: true, label: true },
  });
  if (!row) {
    return { ok: false, message: `Unknown resource type: ${code}` };
  }
  if (!row.isActive) {
    return { ok: false, message: `Resource type "${row.label}" is not available` };
  }
  return { ok: true };
}
