import { Router } from "express";
import {
  getAllBatchSections,
  getBatchSectionById,
  createBatchSection,
  updateBatchSection,
  deleteBatchSection
} from "./batchSections.controller.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

router.get("/", getAllBatchSections);
router.get("/:id", getBatchSectionById);
router.post("/", requireRole("SUPER_ADMIN", "DEAN"), createBatchSection);
router.put("/:id", requireRole("SUPER_ADMIN", "DEAN"), updateBatchSection);
router.delete("/:id", requireRole("SUPER_ADMIN", "DEAN"), deleteBatchSection);

export default router;