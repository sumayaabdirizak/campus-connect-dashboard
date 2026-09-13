import { Router } from "express";
import {
  getAllBatches,
  getBatchById,
  getBatchOverview,
  createBatch,
  updateBatch,
  deleteBatch
} from "../../controllers/academic/batches.controller.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

router.get("/", getAllBatches);
router.get("/:id/overview", requireRole("SUPER_ADMIN", "DEAN"), getBatchOverview);
router.get("/:id", getBatchById);
router.post("/", requireRole("SUPER_ADMIN", "DEAN"), createBatch);
router.put("/:id", requireRole("SUPER_ADMIN", "DEAN"), updateBatch);
router.delete("/:id", requireRole("SUPER_ADMIN", "DEAN"), deleteBatch);

export default router;