import { Router } from "express";
import {
  getAllBatchSections,
  getBatchSectionById,
  createBatchSection,
  updateBatchSection,
  deleteBatchSection
} from "../../controllers/academic/batchSections.controller/index.js";
import {
  listSectionStudents,
  addSectionStudents,
  removeSectionStudent
} from "../../controllers/academic/sectionStudents.controller.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validateRequest.js";
import {
  createBatchSectionBodySchema,
  updateBatchSectionBodySchema
} from "../../validation/batchSectionsSchemas.js";

const router = Router();

router.get("/", getAllBatchSections);
router.get("/:id/students", requireRole("SUPER_ADMIN", "DEAN"), listSectionStudents);
router.post("/:id/students", requireRole("SUPER_ADMIN", "DEAN"), addSectionStudents);
router.delete(
  "/:id/students/:studentId",
  requireRole("SUPER_ADMIN", "DEAN"),
  removeSectionStudent
);
router.get("/:id", getBatchSectionById);
router.post(
  "/",
  requireRole("SUPER_ADMIN", "DEAN"),
  validateBody(createBatchSectionBodySchema),
  createBatchSection
);
router.put(
  "/:id",
  requireRole("SUPER_ADMIN", "DEAN"),
  validateBody(updateBatchSectionBodySchema),
  updateBatchSection
);
router.delete("/:id", requireRole("SUPER_ADMIN", "DEAN"), deleteBatchSection);

export default router;