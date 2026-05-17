import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import {
    getLecturerProfiles,
    getLecturerProfile,
    patchLecturerProfile,
    postLecturerProfile,
    deleteLecturerProfile,
} from "./lecturerProfiles.controller.js";

export const lecturerProfilesRouter = Router();

// Soo saar dhamaan Profile-yada macalimiinta (Lecturers)
lecturerProfilesRouter.get("/", auth, getLecturerProfiles);

// Abuur Profile macalin (Kaliya Super Admin)
lecturerProfilesRouter.post("/", auth, requireRole("SUPER_ADMIN", "FACULTY_ADMIN"), postLecturerProfile);

// Soo saar Profile macalin adigoo ID-giisa u maraya
lecturerProfilesRouter.get("/:id", auth, getLecturerProfile);

// Beddel xogta Profile macalin (Kaliya Super Admin)
lecturerProfilesRouter.patch("/:id", auth, requireRole("SUPER_ADMIN", "FACULTY_ADMIN"), patchLecturerProfile);

// Tirtir Profile macalin (Kaliya Super Admin)
lecturerProfilesRouter.delete("/:id", auth, requireRole("SUPER_ADMIN", "FACULTY_ADMIN"), deleteLecturerProfile);
