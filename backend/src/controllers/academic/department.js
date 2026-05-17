import { Router } from "express";
import { getAllDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment } from "./departments.controller.js";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

// All users
router.get("/", auth, getAllDepartments);
router.get("/:id", auth, getDepartmentById);

// Only SUPER_ADMIN can run these
router.post("/", auth, requireRole("SUPER_ADMIN"), createDepartment);
router.put("/:id", auth, requireRole("SUPER_ADMIN"), updateDepartment);
router.delete("/:id", auth, requireRole("SUPER_ADMIN"), deleteDepartment);

export default router;