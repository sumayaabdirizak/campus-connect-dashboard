/**
 * Delete course-offering children that lack onDelete: Cascade in the schema.
 * @param {import('@prisma/client').Prisma.TransactionClient | import('../../db/prisma.js').prisma} db
 * @param {number[]} offeringIds
 */
export async function clearOfferingDependents(db, offeringIds) {
  if (!offeringIds.length) return;

  const inOfferings = { courseOfferingId: { in: offeringIds } };
  const quizzes = await db.quiz.findMany({ where: inOfferings, select: { id: true } });
  const quizIds = quizzes.map((q) => q.id);
  const assignments = await db.assignment.findMany({
    where: inOfferings,
    select: { id: true }
  });
  const assignmentIds = assignments.map((a) => a.id);
  const rooms = await db.chatRoom.findMany({
    where: { courseOfferingId: { in: offeringIds } },
    select: { id: true }
  });
  const roomIds = rooms.map((r) => r.id);
  const posts = await db.coursePost.findMany({
    where: inOfferings,
    select: { id: true }
  });
  const postIds = posts.map((p) => p.id);
  const groups = await db.courseGroup.findMany({
    where: inOfferings,
    select: { id: true }
  });
  const groupIds = groups.map((g) => g.id);

  if (quizIds.length) {
    await db.quizAnswer.deleteMany({ where: { attempt: { quizId: { in: quizIds } } } });
    await db.quizAttempt.deleteMany({ where: { quizId: { in: quizIds } } });
    await db.quizOption.deleteMany({ where: { question: { quizId: { in: quizIds } } } });
    await db.quizQuestion.deleteMany({ where: { quizId: { in: quizIds } } });
    await db.quiz.deleteMany({ where: { id: { in: quizIds } } });
  }

  if (assignmentIds.length) {
    await db.submissionExtension.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await db.submission.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await db.assignmentAttachment.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await db.assignmentLifecycleEvent.deleteMany({
      where: { assignmentId: { in: assignmentIds } }
    });
    await db.assignmentLifecycle.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await db.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
  }

  if (roomIds.length) {
    await db.chatMessageMention.deleteMany({ where: { message: { roomId: { in: roomIds } } } });
    await db.chatAttachment.deleteMany({ where: { message: { roomId: { in: roomIds } } } });
    await db.chatMessage.updateMany({
      where: { roomId: { in: roomIds } },
      data: { replyToId: null }
    });
    await db.chatMessage.deleteMany({ where: { roomId: { in: roomIds } } });
    await db.chatRoom.deleteMany({ where: { id: { in: roomIds } } });
  }

  if (postIds.length) {
    await db.coursePostReaction.deleteMany({ where: { postId: { in: postIds } } });
    await db.coursePostReply.deleteMany({ where: { postId: { in: postIds } } });
    await db.coursePostAttachment.deleteMany({ where: { postId: { in: postIds } } });
    await db.coursePost.deleteMany({ where: { id: { in: postIds } } });
  }

  if (groupIds.length) {
    await db.groupMember.deleteMany({ where: { groupId: { in: groupIds } } });
    await db.courseGroup.deleteMany({ where: { id: { in: groupIds } } });
  }

  await db.courseOfferingAccess.deleteMany({ where: inOfferings });
  await db.resourceView.deleteMany({ where: { resource: inOfferings } });
  await db.resource.deleteMany({ where: inOfferings });
  await db.question.deleteMany({ where: inOfferings });
  await db.courseModule.deleteMany({ where: inOfferings });
  await db.courseActivityNotification.deleteMany({ where: inOfferings });
  await db.groupMember.deleteMany({ where: inOfferings });
}
