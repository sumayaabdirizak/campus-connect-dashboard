/**
 * Re-sync discussion memberships for all active users (after publicId migration).
 *
 * Usage: node scripts/repair-discussion-memberships.js
 */
import { prisma } from '../src/db/prisma.js';
import { syncDiscussionMembershipsForUser } from '../src/services/discussions/membershipSync.service.js';

const users = await prisma.user.findMany({
  where: { status: 'ACTIVE' },
  select: { id: true, full_name: true, email: true },
  orderBy: { id: 'asc' },
});

let ok = 0;
let failed = 0;

for (const user of users) {
  try {
    await syncDiscussionMembershipsForUser(user.id);
    ok += 1;
  } catch (err) {
    failed += 1;
    console.error(`failed user=${user.id} ${user.full_name}: ${err?.message}`);
  }
}

console.log(JSON.stringify({ scanned: users.length, ok, failed }, null, 2));
await prisma.$disconnect();
