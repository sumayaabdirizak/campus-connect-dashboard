import { Router } from "express";
import {
  getAllPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram
} from "./programs.controller.js";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

// GET all, optionally filter by department/level
router.get("/", auth, getAllPrograms);
router.get("/:id", auth, getProgramById);
// Only SUPER_ADMIN can create/update/delete
router.post("/", auth, requireRole("SUPER_ADMIN"), createProgram);
router.put("/:id", auth, requireRole("SUPER_ADMIN"), updateProgram);
router.delete("/:id", auth, requireRole("SUPER_ADMIN"), deleteProgram);

export default router;