import { Router } from "express";
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from "./courses.controller.js";
import {
  listCourseTeachers,
  assignCourseTeacher,
  removeCourseTeacher,
} from "./courseTeachers.controller.js";
import { requireRole } from "../../middleware/requireRole.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validateBody } from "../../middleware/validateRequest.js";
import { createCourseBodySchema, updateCourseBodySchema } from "../../validation/coursesSchemas.js";

const router = Router();

router.get("/", getAllCourses);
router.get("/:id", getCourseById);
router.post(
  "/",
  requireRole("SUPER_ADMIN", "DEAN"),
  validateBody(createCourseBodySchema),
  createCourse
);
router.put(
  "/:id",
  requireRole("SUPER_ADMIN", "DEAN"),
  validateBody(updateCourseBodySchema),
  updateCourse
);
router.delete("/:id", requireRole("SUPER_ADMIN", "DEAN"), deleteCourse);

router.get(
  "/:id/teachers",
  requireRole("SUPER_ADMIN", "DEAN"),
  asyncHandler(listCourseTeachers)
);
router.post(
  "/:id/teachers",
  requireRole("SUPER_ADMIN", "DEAN"),
  asyncHandler(assignCourseTeacher)
);
router.delete(
  "/:id/teachers/:teacherId",
  requireRole("SUPER_ADMIN", "DEAN"),
  asyncHandler(removeCourseTeacher)
);

export default router;
