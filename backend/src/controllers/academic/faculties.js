// src/routes/faculty.routes.js
import express from "express";
import {
  getAllFaculties,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  assignDean
} from "./faculty.controller.js";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = express.Router();

// Only authenticated users can read faculties
router.get("/", auth, getAllFaculties);
router.get("/:id", auth, getFacultyById);

// Only SUPER_ADMIN can change faculties
router.post("/", auth, requireRole("SUPER_ADMIN"), createFaculty);
router.put("/:id", auth, requireRole("SUPER_ADMIN"), updateFaculty);
router.delete("/:id", auth, requireRole("SUPER_ADMIN"), deleteFaculty);
router.patch("/:facultyId/assign-dean", auth, requireRole("SUPER_ADMIN"), assignDean);
export default router;