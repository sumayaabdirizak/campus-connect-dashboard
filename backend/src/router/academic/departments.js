import { Router } from "express";
import { getAllDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment } from "../../controllers/academic/departments.controller/index.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validateRequest.js";
import { createDepartmentBodySchema, updateDepartmentBodySchema } from "../../validation/departmentsSchemas.js";

const router = Router();

// All users
router.get("/", getAllDepartments);
router.get("/:id", getDepartmentById);

// Only SUPER_ADMIN can run these
router.post("/", requireRole("SUPER_ADMIN"), validateBody(createDepartmentBodySchema), createDepartment);
router.put("/:id", requireRole("SUPER_ADMIN"), validateBody(updateDepartmentBodySchema), updateDepartment);
router.delete("/:id", requireRole("SUPER_ADMIN"), deleteDepartment);

export default router;