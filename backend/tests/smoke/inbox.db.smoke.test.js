/**
 * Unified inbox + 1:1 DM smoke tests — the WhatsApp-inbox additions.
 * GET-only where possible; the DM get-or-create is exercised for idempotency.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { env } from "../../src/config/env.js";

const healthRes = await request(app).get("/health");
const dbReady = healthRes.status === 200 && healthRes.body.db === true;

// A user with at least one active server membership → their inbox has rows.
let memberUserId = null;
// A pair sharing a server → can open a 1:1 DM.
let pairA = null;
let pairB = null;

if (dbReady) {
  const m = await prisma.discussionGroupMembership.findFirst({
    where: { leftAt: null, isActive: true, user: { status: "ACTIVE" } },
    select: { userId: true },
  });
  memberUserId = m?.userId ?? null;

  // Find any server-type group with ≥2 active members, group-counting in JS
  // (avoids groupBy+having implicit-orderBy quirks).
  const serverMembers = await prisma.discussionGroupMembership.findMany({
    where: {
      leftAt: null,
      isActive: true,
      user: { status: "ACTIVE" },
      group: { kind: { in: ["FACULTY_SERVER", "USER_SERVER"] } },
    },
    select: { groupId: true, userId: true },
    take: 2000,
  });
  const byGroup = new Map();
  for (const row of serverMembers) {
    const arr = byGroup.get(row.groupId) ?? [];
    if (arr.length < 2) arr.push(Number(row.userId));
    byGroup.set(row.groupId, arr);
  }
  for (const arr of byGroup.values()) {
    if (arr.length === 2) {
      [pairA, pairB] = arr;
      break;
    }
  }
}

const tokenFor = (sub, role = "STUDENT") =>
  jwt.sign({ sub, role, tokenType: "access" }, env.JWT_SECRET, { expiresIn: "10m" });

describe.skipIf(!dbReady)("Inbox + DM smoke (database)", () => {
  it.skipIf(!memberUserId)("GET /api/inbox returns a normalized row list", async () => {
    const res = await request(app)
      .get("/api/inbox")
      .set("Authorization", `Bearer ${tokenFor(memberUserId)}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.rows)).toBe(true);
    expect(typeof res.body.totalUnread).toBe("number");
    if (res.body.rows.length > 0) {
      const row = res.body.rows[0];
      expect(row).toHaveProperty("type");
      expect(row).toHaveProperty("href");
      expect(["group", "dm", "office"]).toContain(row.type);
    }
  });

  it("GET /api/inbox requires auth", async () => {
    const res = await request(app).get("/api/inbox");
    expect(res.status).toBe(401);
  });

  it.skipIf(!pairA || !pairB)("POST /group-dms/direct get-or-creates idempotently", async () => {
    const csrf = "smoke-csrf";
    const post = (target) =>
      request(app)
        .post("/api/discussions/group-dms/direct")
        .set("Authorization", `Bearer ${tokenFor(pairA)}`)
        .set("x-csrf-token", csrf)
        .set("Cookie", `csrf_token=${csrf}`)
        .send({ targetUserId: target });

    const first = await post(pairB);
    expect([200, 201]).toContain(first.status);
    const id = first.body.groupDm?.id;
    expect(id).toBeTruthy();

    const second = await post(pairB);
    expect(second.status).toBe(200);
    expect(second.body.created).toBe(false);
    expect(second.body.groupDm?.id).toBe(id);

    const self = await post(pairA);
    expect(self.status).toBe(400);
  });
});
