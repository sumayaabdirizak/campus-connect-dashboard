/**
 * Targeted repair: students with ACTIVE registrations who lack ACTIVE
 * BATCH and/or SECTION discussion memberships.
 *
 * Usage: node scripts/repair-batch-section-memberships.js
 */
import { prisma } from '../src/db/prisma.js';
import { syncDiscussionMembershipsForUser } from '../src/services/discussions/membershipSync.service.js';
import { ensureDiscussionGroupForScope } from '../src/services/discussions/groupProvisioning.service.js';
import { DISCUSSION_SCOPE_TYPES } from '../src/services/discussions/policy.js';

async function ensureScopesForRegistration(reg) {
  const section = reg.batchSection;
  const batch = section?.batch;
  if (!batch || !section) return;

  await ensureDiscussionGroupForScope({
    scopeType: DISCUSSION_SCOPE_TYPES.BATCH,
    scopeId: batch.id,
    name: batch.name,
    skipDefaultMembers: true,
  });
  await ensureDiscussionGroupForScope({
    scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
    scopeId: section.id,
    name: section.name,
    skipDefaultMembers: true,
  });
  if (batch.program?.department) {
    const dept = batch.program.department;
    await ensureDiscussionGroupForScope({
      scopeType: DISCUSSION_SCOPE_TYPES.DEPARTMENT,
      scopeId: dept.id,
      name: dept.name,
      skipDefaultMembers: true,
    });
    if (dept.faculty) {
      await ensureDiscussionGroupForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.FACULTY,
        scopeId: dept.faculty.id,
        name: dept.faculty.name,
        skipDefaultMembers: true,
      });
    }
  }
}

async function main() {
  const students = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      studentRegistrations: { some: {} },
    },
    select: {
      id: true,
      full_name: true,
      studentRegistrations: {
        select: {
          batchSection: {
            select: {
              id: true,
              name: true,
              batch: {
                select: {
                  id: true,
                  name: true,
                  program: {
                    select: {
                      department: {
                        select: {
                          id: true,
                          name: true,
                          faculty: { select: { id: true, name: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      discussionMemberships: {
        where: { leftAt: null, isActive: true, group: { status: 'ACTIVE' } },
        select: { group: { select: { scopeType: true } } },
      },
    },
  });

  const needsRepair = students.filter((u) => {
    const scopes = new Set(u.discussionMemberships.map((m) => m.group.scopeType));
    return !scopes.has('BATCH') || !scopes.has('SECTION');
  });

  console.log(`Students with regs: ${students.length}`);
  console.log(`Missing ACTIVE Batch and/or Section: ${needsRepair.length}`);

  let ok = 0;
  let fail = 0;
  for (const user of needsRepair) {
    try {
      for (const reg of user.studentRegistrations) {
        await ensureScopesForRegistration(reg);
      }
      const result = await syncDiscussionMembershipsForUser(user.id);
      ok += 1;
      console.log(`ok user=${user.id} ${user.full_name} groups=${result.syncedGroups}`);
    } catch (err) {
      fail += 1;
      console.error(`fail user=${user.id} ${user.full_name}: ${err?.message}`);
    }
  }

  console.log(JSON.stringify({ repaired: ok, failed: fail }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
