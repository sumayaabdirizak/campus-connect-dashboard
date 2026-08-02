import { prisma } from "../../../db/prisma.js";
import { DISCUSSION_SCOPE_TYPES } from "../../../services/discussions/policy.js";
import { refreshDiscussionMembershipsForScope } from "../../../services/discussions/membershipSync.service.js";
import { respondInternalError } from "../../../utils/httpError.js";

// CREATE batch section
// Body is pre-validated by validateBody(createBatchSectionBodySchema) — see
// ../../batchSections.js and ../../../validation/batchSectionsSchemas.js.
export const createBatchSection = async (req, res) => {
  const { name, batchId } = req.body;
  // Prevent duplicates in same batch
  const exists = await prisma.batchSection.findUnique({
    where: { batchId_name: { batchId, name } },
  });
  if (exists) {
    return res.status(409).json({ message: "Section with this name already exists in the batch" });
  }

  try {
    const section = await prisma.batchSection.create({
      data: { name, batchId },
    });
    try {
      await refreshDiscussionMembershipsForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
        scopeId: section.id,
      });
    } catch (error) {
      console.error("Failed to auto-create section discussion group", {
        sectionId: section.id,
        error: error?.message,
      });
    }
    res.status(201).json({ message: "Batch section created", section });
  } catch (err) {
    respondInternalError(res, "Failed to create batch section", err);
  }
};
