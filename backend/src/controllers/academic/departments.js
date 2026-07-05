import { Router } from "express";
import { getAllDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment } from "./departments.controller.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

// All users
router.get("/", getAllDepartments);
router.get("/:id", getDepartmentById);

// Only SUPER_ADMIN can run these
router.post("/", requireRole("SUPER_ADMIN"), createDepartment);
router.put("/:id", requireRole("SUPER_ADMIN"), updateDepartment);
router.delete("/:id", requireRole("SUPER_ADMIN"), deleteDepartment);

export default router;