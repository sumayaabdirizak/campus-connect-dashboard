import { prisma } from '../../../db/prisma.js';

export const QUESTION_INCLUDE = {
  bankOptions: { orderBy: { order_index: 'asc' } },
  module: { select: { id: true, title: true, position: true, publishedAt: true } },
};

export async function resolveModuleIdForOffering(rawModuleId, courseOfferingId) {
  if (rawModuleId === undefined) return undefined;
  if (rawModuleId === null) return null;
  const mod = await prisma.courseModule.findUnique({
    where: { id: Number(rawModuleId) },
    select: { id: true, courseOfferingId: true },
  });
  if (!mod || mod.courseOfferingId !== courseOfferingId) {
    const err = new Error('Module does not belong to this course');
    err.status = 400;
    throw err;
  }
  return mod.id;
}

export function assertQuizIsDraft(quiz) {
  if (!quiz.is_draft) {
    const err = new Error(
      'Cannot add questions to a published quiz. Switch it back to draft first.'
    );
    err.status = 400;
    throw err;
  }
}
