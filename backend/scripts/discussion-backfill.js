import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import {
  backfillMissingDiscussionGroups,
  ensureDiscussionGroupForScope,
} from "../src/features/discussions/groupProvisioning.service.js";
import { syncDiscussionMembershipsForUser } from "../src/features/discussions/membershipSync.service.js";
import {
  DISCUSSION_CONTEXT_ROLES,
  DISCUSSION_SCOPE_TYPES,
  getDefaultDiscussionPermissions,
} from "../src/features/discussions/policy.js";

const ROLE_PRIORITY = {
  [DISCUSSION_CONTEXT_ROLES.DEAN]: 60,
  [DISCUSSION_CONTEXT_ROLES.HEAD]: 50,
  [DISCUSSION_CONTEXT_ROLES.ADMIN]: 45,
  [DISCUSSION_CONTEXT_ROLES.ADVISOR]: 40,
  [DISCUSSION_CONTEXT_ROLES.LECTURER]: 30,
  [DISCUSSION_CONTEXT_ROLES.STUDENT]: 10,
};

function parseArgs(argv) {
  const args = new Set(argv);
  const getNumber = (name, fallback) => {
    const prefix = `${name}=`;
    const token = argv.find((entry) => String(entry).startsWith(prefix));
    if (!token) return fallback;
    const n = Number(token.slice(prefix.length));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  };
  return {
    apply: args.has("--apply"),
    dryRun: !args.has("--apply"),
    concurrency: getNumber("--concurrency", 1),
    userLimit: getNumber("--user-limit", 0),
    includeInactiveUsers: args.has("--include-inactive-users"),
    membershipsOnly: args.has("--memberships-only"),
  };
}

function isDeadlockError(error) {
  const message = String(error?.message || "");
  return message.includes("40P01") || message.toLowerCase().includes("deadlock detected");
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncUserWithRetry(userId, syncOptions = {}, maxAttempts = 4) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      await syncDiscussionMembershipsForUser(userId, prisma, syncOptions);
      return { ok: true, attempts: attempt };
    } catch (error) {
      if (!isDeadlockError(error) || attempt >= maxAttempts) {
        return {
          ok: false,
          attempts: attempt,
          reason: error?.message || "unknown_error",
        };
      }
      await sleep(150 * attempt);
    }
  }
  return { ok: false, attempts: maxAttempts, reason: "retry_exhausted" };
}

function roleHigher(a, b) {
  if (!a) return b;
  return (ROLE_PRIORITY[b] || 0) > (ROLE_PRIORITY[a] || 0) ? b : a;
}

function scopeKey(scopeType, scopeId) {
  return `${scopeType}:${Number(scopeId)}`;
}

function addDesiredRole(map, scopeType, scopeId, role) {
  const key = scopeKey(scopeType, scopeId);
  map.set(key, roleHigher(map.get(key), role));
}

function normalizeNameByScope(scopeType, row) {
  if (scopeType === DISCUSSION_SCOPE_TYPES.FACULTY) return row.name;
  if (scopeType === DISCUSSION_SCOPE_TYPES.DEPARTMENT) return row.name;
  if (scopeType === DISCUSSION_SCOPE_TYPES.BATCH) return row.name;
  if (scopeType === DISCUSSION_SCOPE_TYPES.SECTION) return row.name;
  return `Group ${scopeType}:${row.id}`;
}

function splitScopeKey(key) {
  const [scopeType, rawId] = String(key).split(":");
  return { scopeType, scopeId: Number(rawId) };
}

async function runWithConcurrency(items, concurrency, worker) {
  const queue = [...items];
  const limit = Math.max(1, Number(concurrency) || 1);
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      // eslint-disable-next-line no-await-in-loop
      await worker(item);
    }
  });
  await Promise.all(runners);
}

async function getScopeInventory() {
  const [faculties, departments, batches, sections] = await Promise.all([
    prisma.faculty.findMany({ select: { id: true, name: true } }),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.batch.findMany({ select: { id: true, name: true } }),
    prisma.batchSection.findMany({ select: { id: true, name: true } }),
  ]);

  const expectedGroups = [];
  for (const row of faculties) {
    expectedGroups.push({
      scopeType: DISCUSSION_SCOPE_TYPES.FACULTY,
      scopeId: row.id,
      name: normalizeNameByScope(DISCUSSION_SCOPE_TYPES.FACULTY, row),
    });
  }
  for (const row of departments) {
    expectedGroups.push({
      scopeType: DISCUSSION_SCOPE_TYPES.DEPARTMENT,
      scopeId: row.id,
      name: normalizeNameByScope(DISCUSSION_SCOPE_TYPES.DEPARTMENT, row),
    });
  }
  for (const row of batches) {
    expectedGroups.push({
      scopeType: DISCUSSION_SCOPE_TYPES.BATCH,
      scopeId: row.id,
      name: normalizeNameByScope(DISCUSSION_SCOPE_TYPES.BATCH, row),
    });
  }
  for (const row of sections) {
    expectedGroups.push({
      scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
      scopeId: row.id,
      name: normalizeNameByScope(DISCUSSION_SCOPE_TYPES.SECTION, row),
    });
  }
  return { expectedGroups };
}

function deriveDesiredRolesForUser(user) {
  const desired = new Map();
  if (user.deanProfile?.facultyId) {
    addDesiredRole(desired, DISCUSSION_SCOPE_TYPES.FACULTY, user.deanProfile.facultyId, DISCUSSION_CONTEXT_ROLES.DEAN);
  }
  for (const faculty of user.facultiesAsDean || []) {
    addDesiredRole(desired, DISCUSSION_SCOPE_TYPES.FACULTY, faculty.id, DISCUSSION_CONTEXT_ROLES.DEAN);
  }
  if (user.facultyAdminProfile?.faculty_id) {
    addDesiredRole(
      desired,
      DISCUSSION_SCOPE_TYPES.FACULTY,
      user.facultyAdminProfile.faculty_id,
      DISCUSSION_CONTEXT_ROLES.ADMIN
    );
  }
  if (user.lecturerProfile?.departmentId) {
    addDesiredRole(
      desired,
      DISCUSSION_SCOPE_TYPES.DEPARTMENT,
      user.lecturerProfile.departmentId,
      DISCUSSION_CONTEXT_ROLES.LECTURER
    );
  }
  if (user.studentProfile?.departmentId) {
    addDesiredRole(
      desired,
      DISCUSSION_SCOPE_TYPES.DEPARTMENT,
      user.studentProfile.departmentId,
      DISCUSSION_CONTEXT_ROLES.STUDENT
    );
  }
  for (const registration of user.studentRegistrations || []) {
    if (registration.batchSection?.batchId) {
      addDesiredRole(
        desired,
        DISCUSSION_SCOPE_TYPES.BATCH,
        registration.batchSection.batchId,
        DISCUSSION_CONTEXT_ROLES.STUDENT
      );
    }
    if (registration.batchSectionId) {
      addDesiredRole(
        desired,
        DISCUSSION_SCOPE_TYPES.SECTION,
        registration.batchSectionId,
        DISCUSSION_CONTEXT_ROLES.STUDENT
      );
    }
  }
  for (const assignment of user.teacherAssignings || []) {
    for (const offering of assignment.course?.offerings || []) {
      if (offering.section?.batchId) {
        addDesiredRole(
          desired,
          DISCUSSION_SCOPE_TYPES.BATCH,
          offering.section.batchId,
          DISCUSSION_CONTEXT_ROLES.ADVISOR
        );
      }
      if (offering.sectionId) {
        addDesiredRole(
          desired,
          DISCUSSION_SCOPE_TYPES.SECTION,
          offering.sectionId,
          DISCUSSION_CONTEXT_ROLES.LECTURER
        );
      }
    }
  }
  return desired;
}

async function loadUsersForMembershipBackfill(options) {
  const where = options.includeInactiveUsers
    ? {}
    : {
        status: "ACTIVE",
      };
  const users = await prisma.user.findMany({
    where,
    ...(options.userLimit > 0 ? { take: options.userLimit } : {}),
    orderBy: { id: "asc" },
    select: {
      id: true,
      status: true,
      deanProfile: { select: { facultyId: true } },
      facultiesAsDean: { select: { id: true } },
      facultyAdminProfile: { select: { faculty_id: true } },
      lecturerProfile: { select: { departmentId: true } },
      studentProfile: { select: { departmentId: true } },
      studentRegistrations: {
        select: {
          batchSectionId: true,
          batchSection: {
            select: { batchId: true },
          },
        },
      },
      teacherAssignings: {
        select: {
          course: {
            select: {
              offerings: {
                select: {
                  sectionId: true,
                  section: { select: { batchId: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  return users;
}

async function dryRunReport(options) {
  const [{ expectedGroups }, existingGroups, users, memberships] = await Promise.all([
    getScopeInventory(),
    prisma.discussionGroup.findMany({
      select: { id: true, scopeType: true, scopeId: true, name: true, status: true },
    }),
    loadUsersForMembershipBackfill(options),
    prisma.discussionGroupMembership.findMany({
      include: { group: { select: { scopeType: true, scopeId: true } } },
    }),
  ]);

  const existingByScope = new Map(
    existingGroups.map((group) => [scopeKey(group.scopeType, group.scopeId), group])
  );

  let missingGroups = 0;
  let renamedGroups = 0;
  let archivedGroupsToReactivate = 0;
  for (const expected of expectedGroups) {
    const existing = existingByScope.get(scopeKey(expected.scopeType, expected.scopeId));
    if (!existing) {
      missingGroups += 1;
      continue;
    }
    if (existing.name !== expected.name) renamedGroups += 1;
    if (existing.status !== "ACTIVE") archivedGroupsToReactivate += 1;
  }

  const groupIdByScope = new Map();
  for (const group of existingGroups) {
    groupIdByScope.set(scopeKey(group.scopeType, group.scopeId), group.id);
  }

  const membershipsByUser = new Map();
  for (const m of memberships) {
    const userMap = membershipsByUser.get(m.userId) || new Map();
    userMap.set(scopeKey(m.group.scopeType, m.group.scopeId), m);
    membershipsByUser.set(m.userId, userMap);
  }

  let membershipCreates = 0;
  let membershipUpdates = 0;
  let membershipDeactivations = 0;
  let usersWithChanges = 0;

  for (const user of users) {
    const desired = deriveDesiredRolesForUser(user);
    const current = membershipsByUser.get(user.id) || new Map();
    let changedForUser = false;

    const desiredKeys = new Set(desired.keys());
    const isActiveUser = String(user.status || "").toUpperCase() === "ACTIVE";

    for (const [desiredScopeKey, role] of desired.entries()) {
      const currentMembership = current.get(desiredScopeKey);
      const { scopeType } = splitScopeKey(desiredScopeKey);
      const permissions = getDefaultDiscussionPermissions({ scopeType, role });
      const groupId = groupIdByScope.get(desiredScopeKey);
      if (!groupId) {
        membershipCreates += 1;
        changedForUser = true;
        continue;
      }
      if (!currentMembership) {
        membershipCreates += 1;
        changedForUser = true;
        continue;
      }
      const activeNow = currentMembership.leftAt == null && currentMembership.isActive === true;
      if (
        currentMembership.role !== role ||
        currentMembership.canPost !== permissions.canPost ||
        currentMembership.canModerate !== permissions.canModerate ||
        activeNow !== isActiveUser
      ) {
        membershipUpdates += 1;
        changedForUser = true;
      }
    }

    for (const [currentScopeKey, currentMembership] of current.entries()) {
      const currentlyActive = currentMembership.leftAt == null && currentMembership.isActive === true;
      if (currentlyActive && !desiredKeys.has(currentScopeKey)) {
        membershipDeactivations += 1;
        changedForUser = true;
      }
    }
    if (changedForUser) usersWithChanges += 1;
  }

  return {
    mode: "dry-run",
    groups: {
      expected: expectedGroups.length,
      existing: existingGroups.length,
      missingToCreate: missingGroups,
      namesToRefresh: renamedGroups,
      archivedToReactivate: archivedGroupsToReactivate,
    },
    memberships: {
      scannedUsers: users.length,
      creates: membershipCreates,
      updates: membershipUpdates,
      deactivations: membershipDeactivations,
      usersWithAnyChange: usersWithChanges,
    },
  };
}

async function applyBackfill(options) {
  let reactivatedGroups = 0;
  let ensuredGroups = 0;

  if (options.membershipsOnly) {
    await backfillMissingDiscussionGroups(prisma);
  }

  if (!options.membershipsOnly) {
    const { expectedGroups } = await getScopeInventory();
    const existingGroups = await prisma.discussionGroup.findMany({
      select: { id: true, scopeType: true, scopeId: true, status: true },
    });
    const existingByScope = new Map(
      existingGroups.map((group) => [scopeKey(group.scopeType, group.scopeId), group])
    );

    await backfillMissingDiscussionGroups(prisma);

    // Serial group ensure avoids lock contention with membership upserts.
    await runWithConcurrency(expectedGroups, 1, async (row) => {
      await ensureDiscussionGroupForScope({
        scopeType: row.scopeType,
        scopeId: row.scopeId,
        name: row.name,
        prismaClient: prisma,
      });
      ensuredGroups += 1;
      const prior = existingByScope.get(scopeKey(row.scopeType, row.scopeId));
      if (prior?.status && prior.status !== "ACTIVE") {
        await prisma.discussionGroup.update({
          where: { id: prior.id },
          data: { status: "ACTIVE", archivedAt: null },
        });
        reactivatedGroups += 1;
      }
    });
  }

  const users = await loadUsersForMembershipBackfill(options);
  let syncedUsers = 0;
  const failedUsers = [];
  const syncOpts = { skipGroupProvisioning: true };
  await runWithConcurrency(users, options.concurrency, async (user) => {
    const result = await syncUserWithRetry(user.id, syncOpts);
    if (result.ok) {
      syncedUsers += 1;
      return;
    }
    failedUsers.push({
      userId: user.id,
      attempts: result.attempts,
      reason: result.reason,
    });
  });

  return {
    mode: "apply",
    groups: {
      ensured: ensuredGroups,
      reactivated: reactivatedGroups,
    },
    memberships: {
      syncedUsers,
      failedUsers: failedUsers.length,
      failedSample: failedUsers.slice(0, 20),
    },
  };
}

function printUsage() {
  console.log("Discussion backfill command");
  console.log("Usage:");
  console.log("  node scripts/discussion-backfill.js --dry-run");
  console.log(
    "  node scripts/discussion-backfill.js --apply [--concurrency=10] [--user-limit=500] [--memberships-only]"
  );
  console.log("Options:");
  console.log("  --apply                 Execute group + membership backfill");
  console.log("  --dry-run               Report only (default)");
  console.log("  --concurrency=<n>       Parallel workers for apply (default: 10)");
  console.log("  --user-limit=<n>        Limit users for test runs");
  console.log("  --include-inactive-users Include non-ACTIVE users in sync scan");
  console.log("  --memberships-only      Skip group ensure and sync memberships only");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    return;
  }

  console.log(`Starting discussion backfill in ${args.apply ? "APPLY" : "DRY-RUN"} mode`);
  console.log(
    JSON.stringify(
      {
        apply: args.apply,
        concurrency: args.concurrency,
        userLimit: args.userLimit || null,
        includeInactiveUsers: args.includeInactiveUsers,
        membershipsOnly: args.membershipsOnly,
      },
      null,
      2
    )
  );

  const report = args.apply ? await applyBackfill(args) : await dryRunReport(args);
  console.log("Backfill report:");
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error("Discussion backfill failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
