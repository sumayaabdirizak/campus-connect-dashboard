import express from "express";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { loadUserAnnouncementScope } from "../../../../utils/userAnnouncementScope.js";
import { patchDiscussionMeStatusSchema } from "../../../../features/discussions/validation/groupDiscussionSchemas.js";

const router = express.Router();

router.get("/me/workspaces", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(userId)) {
      return res.status(401).json(apiErrorBody("Unauthorized", null));
    }
    const loaded = await loadUserAnnouncementScope(prisma, userId);
    if (!loaded) {
      return res.json({ faculties: [], discussionCustomStatus: null });
    }
    const faculties =
      loaded.facultyIds.length === 0
        ? []
        : await prisma.faculty.findMany({
            where: { id: { in: loaded.facultyIds } },
            orderBy: { name: "asc" },
            select: { id: true, code: true, name: true },
          });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { discussionCustomStatus: true },
    });
    return res.json({
      faculties,
      discussionCustomStatus: user?.discussionCustomStatus ?? null,
    });
  } catch (error) {
    console.error("GET /discussions/me/workspaces failed", error);
    return res.status(500).json(apiErrorBody("Failed to load workspaces", null));
  }
});

router.patch("/me/status", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(userId)) {
      return res.status(401).json(apiErrorBody("Unauthorized", null));
    }
    const parsed = patchDiscussionMeStatusSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json(apiErrorBody("Invalid body", parsed.error.flatten()));
    }
    const raw = parsed.data.status;
    const next =
      raw === null || raw === undefined ? null : String(raw).trim().slice(0, 80) || null;
    await prisma.user.update({
      where: { id: userId },
      data: { discussionCustomStatus: next },
    });
    return res.json({ discussionCustomStatus: next });
  } catch (error) {
    console.error("PATCH /discussions/me/status failed", error);
    return res.status(500).json(apiErrorBody("Failed to update status", null));
  }
});

export default router;
