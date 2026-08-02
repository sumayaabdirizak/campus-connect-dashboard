import { prisma } from "../../../db/prisma.js";
import { archiveDiscussionGroupForScope } from "../../../features/discussions/groupProvisioning.service.js";
import { DISCUSSION_SCOPE_TYPES } from "../../../features/discussions/policy.js";
import { respondInternalError } from "../../../utils/httpError.js";

// DELETE batch section
export const deleteBatchSection = async (req, res) => {
  const { id } = req.params;
  try {
    await archiveDiscussionGroupForScope({
      scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
      scopeId: Number(id),
    });
    await prisma.batchSection.delete({ where: { id: Number(id) } });
    res.json({ message: "Batch section deleted" });
  } catch (err) {
    respondInternalError(res, "Failed to delete batch section", err);
  }
};
