/**
 * Case-insensitive title uniqueness within a course offering.
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 * @param {{ courseOfferingId: number, title: unknown, excludeId?: number }} opts
 * @returns {Promise<{ ok: true, title: string } | { ok: false, message: string }>}
 */
export async function assertUniqueAssignmentTitle(db, { courseOfferingId, title, excludeId }) {
  const trimmed = String(title ?? '').trim();
  if (!trimmed) {
    return { ok: false, message: 'Title is required' };
  }

  const clash = await db.assignment.findFirst({
    where: {
      courseOfferingId,
      title: { equals: trimmed, mode: 'insensitive' },
      ...(excludeId != null ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false,
      message: 'An assignment with this title already exists in this course',
    };
  }
  return { ok: true, title: trimmed };
}

/**
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 * @param {{ courseOfferingId: number, title: unknown, excludeId?: number }} opts
 * @returns {Promise<{ ok: true, title: string } | { ok: false, message: string }>}
 */
export async function assertUniqueQuizTitle(db, { courseOfferingId, title, excludeId }) {
  const trimmed = String(title ?? '').trim();
  if (!trimmed) {
    return { ok: false, message: 'Title is required' };
  }

  const clash = await db.quiz.findFirst({
    where: {
      courseOfferingId,
      title: { equals: trimmed, mode: 'insensitive' },
      ...(excludeId != null ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false,
      message: 'A quiz with this title already exists in this course',
    };
  }
  return { ok: true, title: trimmed };
}

/**
 * Build a unique "Copy of …" title for duplicate actions.
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 * @param {'assignment' | 'quiz'} kind
 * @param {number} courseOfferingId
 * @param {string} sourceTitle
 */
export async function nextCopyTitle(db, kind, courseOfferingId, sourceTitle) {
  const base = `Copy of ${String(sourceTitle ?? '').trim() || 'Untitled'}`;
  const model = kind === 'assignment' ? db.assignment : db.quiz;
  let candidate = base;
  let n = 2;
  // Cap iterations so a pathological course can't loop forever.
  for (let i = 0; i < 50; i += 1) {
    const clash = await model.findFirst({
      where: {
        courseOfferingId,
        title: { equals: candidate, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${base} (${n})`;
    n += 1;
  }
  return `${base} (${Date.now()})`;
}
