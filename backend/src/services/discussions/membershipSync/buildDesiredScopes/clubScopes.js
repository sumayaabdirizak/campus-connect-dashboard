import { addDesiredRole } from '../helpers.js';

export async function applyClubScopes(tx, user, desiredByScope) {
  // Include club discussion groups in desired scopes so they don't get removed on sync.
  // Clubs use scopeType='CLUB' and scopeId=Club.id for their discussion groups.
  const clubGroups = await tx.discussionGroup.findMany({
    where: {
      scopeType: 'CLUB',
      memberships: {
        some: {
          userId: user.id,
          leftAt: null,
          isActive: true,
        },
      },
    },
    select: {
      scopeType: true,
      scopeId: true,
      memberships: {
        where: { userId: user.id },
        select: { role: true },
        take: 1,
      },
    },
  });

  for (const group of clubGroups) {
    const role = group.memberships[0]?.role || 'STUDENT';
    addDesiredRole(desiredByScope, group.scopeType, group.scopeId, role);
  }
}
