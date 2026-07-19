/**
 * Group DMs (3–10 members, no 1:1). Mounted at `/api/discussions`.
 */

import express from "express";
import { prisma } from "../../../db/prisma.js";
import { apiErrorBody } from "../../../utils/apiEnvelope.js";
import { getIo } from "../../../socket/hub.js";
import { buildUnreadSocketPayload } from "../../../features/discussions/buildUnreadPayload.js";
import {
  parseDiscussionHistoryLimit,
  encodeDiscussionCursor,
  decodeDiscussionCursor,
} from "../../../features/discussions/discussionPagination.js";
import { getDiscussionCallerUserId } from "../../../features/discussions/discussionCaller.js";
import {
  createGroupDmSchema,
  groupDmSendMessageSchema,
  addGroupDmMembersSchema,
} from "../../../features/discussions/validation/groupDiscussionSchemas.js";

import { getActiveMember } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get("/group-dms/member-candidates", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const q = String(req.query.q ?? "")
        .trim()
        .slice(0, 80);
  
      const myServers = await prisma.discussionGroupMembership.findMany({
        where: {
          userId,
          leftAt: null,
          isActive: true,
          group: { status: "ACTIVE", kind: { in: ["FACULTY_SERVER", "USER_SERVER"] } },
        },
        select: { groupId: true },
      });
      const serverIds = [...new Set(myServers.map((x) => x.groupId))];
      if (serverIds.length === 0) return res.json({ results: [] });
  
      const memberRows = await prisma.discussionGroupMembership.findMany({
        where: {
          groupId: { in: serverIds },
          leftAt: null,
          isActive: true,
          userId: { not: userId },
          user: {
            status: "ACTIVE",
            ...(q
              ? {
                  OR: [
                    { full_name: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
        },
        select: {
          userId: true,
          user: { select: { id: true, full_name: true, email: true } },
        },
        take: 80,
        orderBy: { joinedAt: "desc" },
      });
  
      const seen = new Set();
      const results = [];
      for (const row of memberRows) {
        const uid = Number(row.userId);
        if (seen.has(uid)) continue;
        seen.add(uid);
        if (row.user) results.push(row.user);
        if (results.length >= 25) break;
      }
      return res.json({ results });
    } catch (error) {
      console.error("GET /discussions/group-dms/member-candidates failed", error);
      return res.status(500).json(apiErrorBody("Failed to load candidates", null));
    }
  });
}
