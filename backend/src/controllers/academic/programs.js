import { Router } from "express";
import {
  getAllPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram
} from "./programs.controller.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

// GET all, optionally filter by department/level
router.get("/", getAllPrograms);
router.get("/:id", getProgramById);
// Only SUPER_ADMIN can create/update/delete
router.post("/", requireRole("SUPER_ADMIN"), createProgram);
router.put("/:id", requireRole("SUPER_ADMIN"), updateProgram);
router.delete("/:id", requireRole("SUPER_ADMIN"), deleteProgram);

export default router;