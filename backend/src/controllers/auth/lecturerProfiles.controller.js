import * as lecturerProfilesService from "../../services/lecturerProfiles.service.js";

// Soo saar dhammaan Profile-yada macalimiinta (Lecturer Profiles)
export async function getLecturerProfiles(req, res, next) {
    try {
        const data = await lecturerProfilesService.listLecturerProfiles(req.user);
        res.json(data);
    } catch (e) {
        next(e);
    }
}

// Abuur Profile macalin (New Lecturer Profile)
export async function postLecturerProfile(req, res, next) {
    try {
        const { user_id, staff_id, department_id } = req.body;

        if (!user_id || !staff_id || !department_id) {
            return res.status(400).json({
                message: "user_id, staff_id, and department_id are required",
            });
        }

        const created = await lecturerProfilesService.createLecturerProfile(req.user, {
            user_id,
            staff_id,
            department_id,
        });

        res.status(201).json(created);
    } catch (e) {
        next(e);
    }
}

// Soo saar hal Profile macalin (Single Lecturer Profile)
export async function getLecturerProfile(req, res, next) {
    try {
        const { id } = req.params;
        const data = await lecturerProfilesService.getLecturerProfileById(req.user, id);
        if (!data) return res.status(404).json({ message: "Lecturer Profile not found or unauthorized" });
        res.json(data);
    } catch (e) {
        next(e);
    }
}

// Beddel xogta Profile macalin (Update Lecturer Profile)
export async function patchLecturerProfile(req, res, next) {
    try {
        const { id } = req.params;
        const updated = await lecturerProfilesService.updateLecturerProfile(req.user, id, req.body);
        res.json(updated);
    } catch (e) {
        next(e);
    }
}

// Tirtir Profile macalin (Delete Lecturer Profile)
export async function deleteLecturerProfile(req, res, next) {
    try {
        const { id } = req.params;
        await lecturerProfilesService.deleteLecturerProfile(req.user, id);
        res.status(204).send();
    } catch (e) {
        next(e);
    }
}

