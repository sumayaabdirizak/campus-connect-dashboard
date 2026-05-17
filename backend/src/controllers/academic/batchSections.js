import { Router } from "express";
import {
  getAllBatchSections,
  getBatchSectionById,
  createBatchSection,
  updateBatchSection,
  deleteBatchSection
} from "./batchSections.controller.js";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

router.get("/", auth, getAllBatchSections);
router.get("/:id", auth, getBatchSectionById);
router.post("/", auth, requireRole("SUPER_ADMIN", "DEAN"), createBatchSection);
router.put("/:id", auth, requireRole("SUPER_ADMIN", "DEAN"), updateBatchSection);
router.delete("/:id", auth, requireRole("SUPER_ADMIN", "DEAN"), deleteBatchSection);

export default router;