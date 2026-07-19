export async function getActiveMember(groupDmId, userId) {
  return prisma.groupDmMember.findFirst({
    where: { groupDmId, userId, leftAt: null },
    include: { groupDm: { select: { id: true, archivedAt: true } } },
  });
}
