import { Router } from "express";
import {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch
} from "./batches.controller.js";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

router.get("/", auth, getAllBatches);
router.get("/:id", auth, getBatchById);
router.post("/", auth, requireRole("SUPER_ADMIN", "DEAN"), createBatch);
router.put("/:id", auth, requireRole("SUPER_ADMIN", "DEAN"), updateBatch);
router.delete("/:id", auth, requireRole("SUPER_ADMIN", "DEAN"), deleteBatch);

export default router;