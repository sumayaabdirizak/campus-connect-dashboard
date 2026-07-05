import { Router } from "express";
import {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch
} from "./batches.controller.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

router.get("/", getAllBatches);
router.get("/:id", getBatchById);
router.post("/", requireRole("SUPER_ADMIN", "DEAN"), createBatch);
router.put("/:id", requireRole("SUPER_ADMIN", "DEAN"), updateBatch);
router.delete("/:id", requireRole("SUPER_ADMIN", "DEAN"), deleteBatch);

export default router;