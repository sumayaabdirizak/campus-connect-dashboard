import { Router } from "express";
import * as facultyAdminProfilesController from "./facultyAdminProfiles.controller.js";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

// Dhammaan endpoints waxay u baahan yihiin auth
router.use(auth);

// List faculty admin profiles (Super Admin or individual Faculty Admin)
router.get("/", facultyAdminProfilesController.getProfiles);

// Create new faculty admin profile (Super Admin only)
router.post("/", auth, requireRole("SUPER_ADMIN"), facultyAdminProfilesController.postProfile);

// Get a single faculty admin profile
router.get("/:id", facultyAdminProfilesController.getProfile);

// Update a faculty admin profile (Super Admin only)
router.patch("/:id", auth, requireRole("SUPER_ADMIN"), facultyAdminProfilesController.patchProfile);

// Delete a faculty admin profile (Super Admin only)
router.delete("/:id", auth, requireRole("SUPER_ADMIN"), facultyAdminProfilesController.deleteProfile);

export default router;
