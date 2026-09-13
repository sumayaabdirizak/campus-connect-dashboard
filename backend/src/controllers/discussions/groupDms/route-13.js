/**
 * Group DMs (3–10 members, no 1:1). Mounted at `/api/discussions`.
 */

import { prisma } from "../../../db/prisma.js";
import { apiErrorBody } from "../../../utils/apiEnvelope.js";
import { getIo } from "../../../socket/hub.js";
import { getDiscussionCallerUserId } from "../../../services/discussions/discussionCaller.js";
import { setGroupDmMemberCanPostSchema } from "../../../validation/groupDiscussionSchemas.js";

import { getActiveMember } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  // Owner-only: allow/disallow a specific member from sending messages in
  // this conversation. Mirrors the `canPost` gate route-06.js already
  // enforces when posting — this is the missing control to change it.
  router.patch("/group-dms/:groupDmId/members/:targetUserId/permissions", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const targetUserId = Number(req.params.targetUserId);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json(apiErrorBody("Invalid targetUserId", null));
      }

      const parsed = setGroupDmMemberCanPostSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
      }

      const self = await getActiveMember(req.params.groupDmId, userId);
      if (!self?.groupDm || self.groupDm.archivedAt) {
        return res.status(403).json(apiErrorBody("Forbidden", null));
      }
      if (self.role !== "OWNER") {
        return res.status(403).json(apiErrorBody("Only the owner can manage posting permissions", null));
      }
      const groupDmId = self.groupDm.id;
      if (targetUserId === userId) {
        return res.status(400).json(apiErrorBody("You can't change your own posting permission", null));
      }

      const target = await prisma.groupDmMember.findFirst({
        where: { groupDmId, userId: targetUserId, leftAt: null },
      });
      if (!target) {
        return res.status(404).json(apiErrorBody("Member not found in this conversation", null));
      }
      // The owner role always retains posting rights.
      if (target.role === "OWNER") {
        return res.status(400).json(apiErrorBody("The owner's posting permission can't be changed", null));
      }

      const updated = await prisma.groupDmMember.update({
        where: { id: target.id },
        data: { canPost: parsed.data.canPost },
        select: { userId: true, canPost: true },
      });

      try {
        const io = getIo();
        if (io) {
          io.to(`groupdm:${groupDmId}`).emit("groupdm:member:permission", {
            groupDmId: self.groupDm.publicId,
            userId: updated.userId,
            canPost: updated.canPost,
          });
        }
      } catch (e) {
        console.warn("groupdm permission socket emit failed", e?.message);
      }

      return res.json({ member: updated });
    } catch (error) {
      console.error("PATCH /discussions/group-dms/:id/members/:uid/permissions failed", error);
      return res.status(500).json(apiErrorBody("Failed to update member permission", null));
    }
  });
}
