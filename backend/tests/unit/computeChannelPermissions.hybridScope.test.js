import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/db/prisma.js", () => ({
  prisma: {},
}));

vi.mock("../../src/services/discussions/channelScopeAccess.js", () => ({
  userMayAccessDiscussionChannelScope: vi.fn(),
}));

import { userMayAccessDiscussionChannelScope } from "../../src/services/discussions/channelScopeAccess.js";
import { computeChannelPermissions } from "../../src/services/discussions/permissions/computeChannelPermissions.js";
import {
  hasPermission,
  PERMISSION_BITS,
} from "../../src/services/discussions/permissions.js";

const B = PERMISSION_BITS;

function mockPrisma({ channel, user, membership = null, memberOverwrites = [] }) {
  return {
    discussionChannel: {
      findUnique: vi.fn().mockResolvedValue(channel),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
    },
    discussionRole: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 1,
          systemKey: "EVERYONE",
          permissions: B.VIEW_CHANNEL | B.READ_MESSAGE_HISTORY | B.SEND_MESSAGES,
        },
      ]),
    },
    discussionGroupMembership: {
      findFirst: vi.fn().mockResolvedValue(membership),
    },
    discussionPermissionOverwrite: {
      findMany: vi.fn().mockImplementation(async ({ where }) => {
        if (where?.targetType === "ROLE") return [];
        if (where?.targetType === "MEMBER") return memberOverwrites;
        return [];
      }),
    },
  };
}

describe("computeChannelPermissions hybrid scope vs member overwrite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps VIEW when academic scope fails but MEMBER overwrite grants VIEW", async () => {
    userMayAccessDiscussionChannelScope.mockResolvedValue(false);
    const prismaClient = mockPrisma({
      channel: {
        id: 9,
        serverId: 1,
        isPrivate: false,
        scopeType: "BATCH",
        scopeId: 6,
        server: { id: 1, ownerId: null, kind: "FACULTY_SERVER" },
      },
      user: { id: 373, role: { name: "TEACHER" } },
      membership: { id: 1, role: "LECTURER", isActive: true },
      memberOverwrites: [
        {
          allow: (
            B.VIEW_CHANNEL |
            B.READ_MESSAGE_HISTORY |
            B.SEND_MESSAGES
          ).toString(),
          deny: "0",
        },
      ],
    });

    const perms = await computeChannelPermissions({
      userId: 373,
      channelId: 9,
      prismaClient,
    });

    expect(hasPermission(perms, B.VIEW_CHANNEL)).toBe(true);
    expect(hasPermission(perms, B.SEND_MESSAGES)).toBe(true);
  });

  it("strips VIEW when academic scope fails and there is no MEMBER VIEW overwrite", async () => {
    userMayAccessDiscussionChannelScope.mockResolvedValue(false);
    const prismaClient = mockPrisma({
      channel: {
        id: 9,
        serverId: 1,
        isPrivate: false,
        scopeType: "BATCH",
        scopeId: 6,
        server: { id: 1, ownerId: null, kind: "FACULTY_SERVER" },
      },
      user: { id: 373, role: { name: "TEACHER" } },
      membership: { id: 1, role: "LECTURER", isActive: true },
      memberOverwrites: [],
    });

    const perms = await computeChannelPermissions({
      userId: 373,
      channelId: 9,
      prismaClient,
    });

    expect(hasPermission(perms, B.VIEW_CHANNEL)).toBe(false);
    expect(hasPermission(perms, B.SEND_MESSAGES)).toBe(false);
  });
});
