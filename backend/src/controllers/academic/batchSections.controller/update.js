import { prisma } from "../../../db/prisma.js";
import { DISCUSSION_SCOPE_TYPES } from "../../../features/discussions/policy.js";
import { refreshDiscussionMembershipsForScope } from "../../../features/discussions/membershipSync.service.js";
import { respondInternalError } from "../../../utils/httpError.js";

// UPDATE batch section
// Body is pre-validated by validateBody(updateBatchSectionBodySchema) — see
// ../../batchSections.js and ../../../validation/batchSectionsSchemas.js.
export const updateBatchSection = async (req, res) => {
  const { id } = req.params;
  const { name, batchId, moderatorUserId } = req.body;
  try {
    const section = await prisma.batchSection.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(batchId !== undefined && { batchId }),
        ...(moderatorUserId !== undefined && {
          moderatorUserId: moderatorUserId === null || moderatorUserId === "" ? null : moderatorUserId,
        }),
      },
    });
    try {
      await refreshDiscussionMembershipsForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
        scopeId: section.id,
      });
    } catch (error) {
      console.error("Failed to refresh section discussion group after update", {
        sectionId: section.id,
        error: error?.message,
      });
    }
    res.json({ message: "Batch section updated", section });
  } catch (err) {
    respondInternalError(res, "Failed to update batch section", err);
  }
};
