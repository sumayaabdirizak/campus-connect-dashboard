import express from "express";
import {
  getAllFaculties,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  assignDean
} from "./faculties.controller.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = express.Router();

// Only authenticated users can read faculties
router.get("/", getAllFaculties);
router.get("/:id", getFacultyById);

// Only SUPER_ADMIN can change faculties
router.post("/", requireRole("SUPER_ADMIN"), createFaculty);
router.put("/:id", requireRole("SUPER_ADMIN"), updateFaculty);
router.delete("/:id", requireRole("SUPER_ADMIN"), deleteFaculty);
router.patch("/:facultyId/assign-dean", requireRole("SUPER_ADMIN"), assignDean);
export default router;