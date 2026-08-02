/**
 * Group DMs (3–10 members, no 1:1). Mounted at `/api/discussions`.
 */

import { prisma } from "../../../db/prisma.js";
import { apiErrorBody } from "../../../utils/apiEnvelope.js";
import { getIo } from "../../../socket/hub.js";
import { getDiscussionCallerUserId } from "../../../features/discussions/discussionCaller.js";
import { renameGroupDmSchema } from "../../../features/discussions/validation/groupDiscussionSchemas.js";

import { getActiveMember } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.patch("/group-dms/:groupDmId", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const parsed = renameGroupDmSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
      }

      const self = await getActiveMember(req.params.groupDmId, userId);
      if (!self?.groupDm || self.groupDm.archivedAt) {
        return res.status(403).json(apiErrorBody("Forbidden", null));
      }
      if (self.role !== "OWNER") {
        return res.status(403).json(apiErrorBody("Only the owner can rename this conversation", null));
      }
      const groupDmId = self.groupDm.id;

      const name = parsed.data.name?.trim() || null;
      const updated = await prisma.groupDm.update({
        where: { id: groupDmId },
        data: { name },
        select: { id: true, publicId: true, name: true },
      });

      try {
        const io = getIo();
        if (io) {
          io.to(`groupdm:${groupDmId}`).emit("groupdm:rename", {
            groupDmId: updated.publicId,
            name: updated.name,
          });
        }
      } catch (e) {
        console.warn("groupdm rename socket emit failed", e?.message);
      }

      return res.json({ groupDm: { id: updated.publicId, name: updated.name } });
    } catch (error) {
      console.error("PATCH /discussions/group-dms/:id failed", error);
      return res.status(500).json(apiErrorBody("Failed to rename conversation", null));
    }
  });
}
