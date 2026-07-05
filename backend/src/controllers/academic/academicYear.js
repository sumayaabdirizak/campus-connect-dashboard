import { Router } from "express";
import {
  getAllAcademicYears,
  getAcademicYearById,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  promoteAcademicYear
} from "./academicYear.controller.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

router.get("/", getAllAcademicYears);
router.get("/:id", getAcademicYearById);
router.post("/", requireRole("SUPER_ADMIN"), createAcademicYear);
router.put("/:id", requireRole("SUPER_ADMIN"), updateAcademicYear);
router.delete("/:id", requireRole("SUPER_ADMIN"), deleteAcademicYear);

// Promotion endpoint
router.post("/promote", requireRole("SUPER_ADMIN"), promoteAcademicYear);

export default router;