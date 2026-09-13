import { ClubServiceError } from './errors.js';

async function loadQuotaPolicy(tx) {
  const row = await tx.clubQuotaPolicy.findUnique({ where: { id: 1 } });
  return {
    perUserActiveCap: row?.perUserActiveCap ?? 2,
    perUserPendingCap: row?.perUserPendingCap ?? 1,
  };
}

export async function assertQuota(tx, ownerId) {
  const policy = await loadQuotaPolicy(tx);

  const [activeCount, pendingCount] = await Promise.all([
    tx.club.count({
      where: { ownerId, status: { in: ['APPROVED', 'SUSPENDED'] } },
    }),
    tx.club.count({
      where: { ownerId, status: 'PENDING' },
    }),
  ]);

  if (pendingCount >= policy.perUserPendingCap) {
    throw new ClubServiceError(
      `You can only have ${policy.perUserPendingCap} pending club application at a time.`,
      { code: 'CLUB_QUOTA_PENDING', status: 409, details: { perUserPendingCap: policy.perUserPendingCap } }
    );
  }
  if (activeCount >= policy.perUserActiveCap) {
    throw new ClubServiceError(
      `You can only own ${policy.perUserActiveCap} clubs at a time.`,
      { code: 'CLUB_QUOTA_ACTIVE', status: 409, details: { perUserActiveCap: policy.perUserActiveCap } }
    );
  }
}
