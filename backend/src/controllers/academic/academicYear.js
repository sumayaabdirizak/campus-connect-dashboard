import { Router } from "express";
import {
  getAllAcademicYears,
  getAcademicYearById,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  promoteAcademicYear,
  getNextSemesterNumbers,
  ensureSixAcademicYears,
  resetSemestersCatalog
} from "./academicYear.controller/index.js";
import {
  createSemester,
  updateSemester,
  deleteSemester,
  getAllSemesters
} from "./semesters.controller.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

router.get("/", getAllAcademicYears);
router.get("/semesters", getAllSemesters);
router.get("/semesters/next", getNextSemesterNumbers);
router.post("/ensure-active-years", requireRole("SUPER_ADMIN"), ensureSixAcademicYears);
router.post("/ensure-semesters", requireRole("SUPER_ADMIN"), ensureSixAcademicYears);
router.post("/reset-semesters", requireRole("SUPER_ADMIN"), resetSemestersCatalog);
router.post("/promote", requireRole("SUPER_ADMIN"), promoteAcademicYear);
router.post("/", requireRole("SUPER_ADMIN"), createAcademicYear);
router.post("/:yearId/semesters", requireRole("SUPER_ADMIN"), createSemester);
router.put("/:yearId/semesters/:semesterId", requireRole("SUPER_ADMIN"), updateSemester);
router.delete("/:yearId/semesters/:semesterId", requireRole("SUPER_ADMIN"), deleteSemester);
router.get("/:id", getAcademicYearById);
router.put("/:id", requireRole("SUPER_ADMIN"), updateAcademicYear);
router.delete("/:id", requireRole("SUPER_ADMIN"), deleteAcademicYear);

export default router;