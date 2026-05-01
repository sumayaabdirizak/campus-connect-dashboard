import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import {
    getStudentProfiles,
    getStudentProfile,
    patchStudentProfile,
    postStudentProfile,
    deleteStudentProfile,
} from "./studentProfiles.controller.js";

export const studentProfilesRouter = Router();

// Soo saar dhamaan Profile-yada ardayda (Students)
studentProfilesRouter.get("/", auth, getStudentProfiles);

// Abuur Profile arday (Kaliya Super Admin)
studentProfilesRouter.post("/", auth, requireRole("SUPER_ADMIN", "FACULTY_ADMIN"), postStudentProfile);

// Soo saar Profile arday adigoo ID-giisa u maraya
studentProfilesRouter.get("/:id", auth, getStudentProfile);

// Beddel xogta Profile arday (Kaliya Super Admin)
studentProfilesRouter.patch("/:id", auth, requireRole("SUPER_ADMIN", "FACULTY_ADMIN"), patchStudentProfile);

// Tirtir Profile arday (Kaliya Super Admin)
studentProfilesRouter.delete("/:id", auth, requireRole("SUPER_ADMIN", "FACULTY_ADMIN"), deleteStudentProfile);
