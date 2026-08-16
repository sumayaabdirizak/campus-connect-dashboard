/**
 * End-to-end test of the club join-request flow against the running
 * backend (not a unit test — real HTTP calls, real DB reads/writes),
 * mirroring the existing assignments-workflow-e2e.mjs pattern.
 *
 * Covers: POST /clubs/:id/join on a BY_REQUEST club creates a PENDING
 * ClubJoinRequest with no membership yet, then POST
 * /clubs/:id/requests/:reqId/decide {approve:true} by the owner creates
 * the DiscussionGroupMembership and bumps memberCountCache.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = process.env.E2E_API_BASE_URL || 'http://localhost:4000/api';
const PASSWORD = process.env.E2E_TEST_PASSWORD || 'password123';

function extractCookies(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const raw = response.headers.get('set-cookie');
  return raw ? [raw] : [];
}
function parseSetCookie(cookies) {
  const jar = {};
  for (const cookie of cookies) {
    const [pair] = cookie.split(';');
    const [name, ...rest] = pair.split('=');
    jar[name.trim()] = rest.join('=');
  }
  return jar;
}
function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}
async function login(email) {
  const response = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Login ${email}: ${response.status} ${body.message || ''}`);
  const cookies = parseSetCookie(extractCookies(response));
  return {
    email,
    authToken: cookies.auth_token,
    csrfToken: body.csrfToken || cookies.csrf_token,
    csrfCookie: cookies.csrf_token || body.csrfToken,
  };
}
async function api(actor, path, { method = 'GET', body } = {}) {
  const headers = { Authorization: `Bearer ${actor.authToken}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && method !== 'HEAD') {
    headers['X-CSRF-Token'] = actor.csrfToken || actor.csrfCookie;
    headers.Cookie = cookieHeader({
      csrf_token: actor.csrfCookie || actor.csrfToken,
      auth_token: actor.authToken,
    });
  }
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function main() {
  const results = [];
  const pass = (step, detail = '') => { results.push({ ok: true, step }); console.log(`[PASS] ${step}${detail ? ` — ${detail}` : ''}`); };
  const fail = (step, detail = '') => { results.push({ ok: false, step }); console.log(`[FAIL] ${step} — ${detail}`); };

  // 1. Prefer a BY_REQUEST club that isn't FACULTY-scoped, so any student
  // can apply without also having to match the club's faculty — that
  // matching is exercised by the dean-pending-queue fix earlier in this
  // session, not what this test is checking. Fall back to a FACULTY club
  // if that's all there is, and pick the applicant from the same faculty.
  let club = await prisma.club.findFirst({
    where: {
      status: 'APPROVED',
      joinPolicy: 'BY_REQUEST',
      serverId: { not: null },
      scopeKind: { not: 'FACULTY' },
    },
    select: { id: true, slug: true, name: true, serverId: true, ownerId: true, memberCountCache: true, scopeKind: true, facultyId: true },
  });
  if (!club) {
    club = await prisma.club.findFirst({
      where: { status: 'APPROVED', joinPolicy: 'BY_REQUEST', serverId: { not: null } },
      select: { id: true, slug: true, name: true, serverId: true, ownerId: true, memberCountCache: true, scopeKind: true, facultyId: true },
    });
  }
  if (!club) { fail('setup', 'no APPROVED BY_REQUEST club with a server found'); process.exit(1); }
  const owner = await prisma.user.findUnique({ where: { id: club.ownerId }, select: { id: true, email: true } });
  if (!owner?.email) { fail('setup', `club ${club.slug} has no resolvable owner`); process.exit(1); }
  pass('setup: club', `${club.slug} (id=${club.id}, scope=${club.scopeKind}, owner=${owner.email}, members=${club.memberCountCache})`);

  // 2. Find a student who is neither a member nor has a pending request —
  // a clean applicant so the test result isn't muddied by prior state.
  // For a FACULTY-scoped club, the applicant must be in that faculty or
  // the join is correctly rejected with CLUB_FACULTY_SCOPE — that's not a
  // bug, it's the same check verified separately in this session's
  // dean-pending-queue fix.
  const existingMemberIds = new Set(
    (await prisma.discussionGroupMembership.findMany({
      where: { groupId: club.serverId, leftAt: null, isActive: true },
      select: { userId: true },
    })).map((m) => m.userId)
  );
  const existingRequesterIds = new Set(
    (await prisma.clubJoinRequest.findMany({
      where: { clubId: club.id, status: 'PENDING' },
      select: { userId: true },
    })).map((r) => r.userId)
  );
  const applicant = await prisma.user.findFirst({
    where: {
      role: { name: 'STUDENT' },
      id: { notIn: [...existingMemberIds, ...existingRequesterIds, club.ownerId] },
      ...(club.scopeKind === 'FACULTY' ? { studentProfile: { facultyId: club.facultyId } } : {}),
    },
    select: { id: true, email: true, full_name: true },
  });
  if (!applicant?.email) { fail('setup', 'no eligible student applicant found'); process.exit(1); }
  pass('setup: applicant', `${applicant.email} (id=${applicant.id})`);

  // Clean slate: drop any stale request/membership from a previous run of
  // this script for the same pair, so re-running is idempotent.
  await prisma.clubJoinRequest.deleteMany({ where: { clubId: club.id, userId: applicant.id } });
  await prisma.discussionGroupMembership.deleteMany({ where: { groupId: club.serverId, userId: applicant.id } });
  const baselineCount = (await prisma.club.findUnique({ where: { id: club.id }, select: { memberCountCache: true } })).memberCountCache;

  // 3. Log in as both actors.
  let applicantSession, ownerSession;
  try {
    applicantSession = await login(applicant.email);
    pass('login: applicant');
  } catch (e) { fail('login: applicant', e.message); process.exit(1); }
  try {
    ownerSession = await login(owner.email);
    pass('login: owner');
  } catch (e) { fail('login: owner', e.message); process.exit(1); }

  // 4. Request to join.
  const joinRes = await api(applicantSession, `/clubs/${club.id}/join`, { method: 'POST' });
  if (joinRes.status === 201 && joinRes.data?.status === 'PENDING' && joinRes.data?.joinRequest) {
    pass('POST /clubs/:id/join', `status=${joinRes.status} body.status=${joinRes.data.status} joinRequestId=${joinRes.data.joinRequest.id}`);
  } else {
    fail('POST /clubs/:id/join', `status=${joinRes.status} body=${JSON.stringify(joinRes.data)}`);
    process.exit(1);
  }
  const reqId = joinRes.data.joinRequest.id;

  // 5. DB truth check — pending request exists, no membership yet.
  const reqRow = await prisma.clubJoinRequest.findUnique({ where: { id: reqId } });
  const memberRowBefore = await prisma.discussionGroupMembership.findUnique({
    where: { groupId_userId: { groupId: club.serverId, userId: applicant.id } },
  });
  if (reqRow?.status === 'PENDING') pass('DB: ClubJoinRequest.status', 'PENDING');
  else fail('DB: ClubJoinRequest.status', String(reqRow?.status));
  if (!memberRowBefore || !memberRowBefore.isActive) pass('DB: no active membership yet');
  else fail('DB: no active membership yet', 'membership already active — should not exist before approval');

  // 6. Detail view as the applicant should NOT show isMember yet.
  const detailBefore = await api(applicantSession, `/clubs/${club.slug}`);
  if (detailBefore.ok && detailBefore.data?.isMember === false) {
    pass('GET /clubs/:slug as applicant (before approval)', 'isMember=false');
  } else {
    fail('GET /clubs/:slug as applicant (before approval)', JSON.stringify(detailBefore.data));
  }

  // 7. Owner approves.
  const decideRes = await api(ownerSession, `/clubs/${club.id}/requests/${reqId}/decide`, {
    method: 'POST',
    body: { approve: true },
  });
  if (decideRes.ok && decideRes.data?.request?.status === 'APPROVED') {
    pass('POST /clubs/:id/requests/:reqId/decide {approve:true}', `request.status=${decideRes.data.request.status}`);
  } else {
    fail('POST /clubs/:id/requests/:reqId/decide', `status=${decideRes.status} body=${JSON.stringify(decideRes.data)}`);
    process.exit(1);
  }

  // 8. DB truth check — membership now exists and is active, count incremented.
  const memberRowAfter = await prisma.discussionGroupMembership.findUnique({
    where: { groupId_userId: { groupId: club.serverId, userId: applicant.id } },
  });
  if (memberRowAfter?.isActive) pass('DB: DiscussionGroupMembership.isActive', 'true');
  else fail('DB: DiscussionGroupMembership.isActive', String(memberRowAfter?.isActive));

  const clubAfter = await prisma.club.findUnique({ where: { id: club.id }, select: { memberCountCache: true } });
  if (clubAfter.memberCountCache === baselineCount + 1) {
    pass('DB: club.memberCountCache incremented', `${baselineCount} -> ${clubAfter.memberCountCache}`);
  } else {
    fail('DB: club.memberCountCache incremented', `expected ${baselineCount + 1}, got ${clubAfter.memberCountCache}`);
  }

  // 9. Detail view as the applicant should now show isMember: true — this
  // is the exact query the frontend's useClubDetail hook reads, so it's
  // the closest API-level proxy for "the UI would now show them as a member".
  const detailAfter = await api(applicantSession, `/clubs/${club.slug}`);
  if (detailAfter.ok && detailAfter.data?.isMember === true) {
    pass('GET /clubs/:slug as applicant (after approval)', 'isMember=true');
  } else {
    fail('GET /clubs/:slug as applicant (after approval)', JSON.stringify(detailAfter.data));
  }

  // Cleanup — leave the DB as this script found it.
  await prisma.discussionGroupMembership.deleteMany({ where: { groupId: club.serverId, userId: applicant.id } });
  await prisma.clubJoinRequest.deleteMany({ where: { clubId: club.id, userId: applicant.id } });
  await prisma.club.update({ where: { id: club.id }, data: { memberCountCache: baselineCount } });
  console.log('\ncleanup: removed test membership/request, restored memberCountCache');

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main()
  .catch((e) => { console.error('FATAL', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
