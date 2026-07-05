import { Router } from "express";
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from "./courses.controller.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

router.get("/", getAllCourses);
router.get("/:id", getCourseById);
router.post("/", requireRole("SUPER_ADMIN", "DEAN", "FACULTY_ADMIN"), createCourse);
router.put("/:id", requireRole("SUPER_ADMIN", "DEAN", "FACULTY_ADMIN"), updateCourse);
router.delete("/:id", requireRole("SUPER_ADMIN", "DEAN"), deleteCourse);

export default router;
