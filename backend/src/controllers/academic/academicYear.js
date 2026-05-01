import { Router } from "express";
import {
  getAllAcademicYears,
  getAcademicYearById,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  promoteAcademicYear
} from "./academicYear.controller.js";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

router.get("/", auth, getAllAcademicYears);
router.get("/:id", auth, getAcademicYearById);
router.post("/", auth, requireRole("SUPER_ADMIN"), createAcademicYear);
router.put("/:id", auth, requireRole("SUPER_ADMIN"), updateAcademicYear);
router.delete("/:id", auth, requireRole("SUPER_ADMIN"), deleteAcademicYear);

// Promotion endpoint
router.post("/promote", auth, requireRole("SUPER_ADMIN"), promoteAcademicYear);

export default router;