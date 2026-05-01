import * as studentProfilesService from "../../services/studentProfiles.service.js";

// Soo saar dhammaan Profile-yada ardayda (Student Profiles)
export async function getStudentProfiles(req, res, next) {
    try {
        const data = await studentProfilesService.listStudentProfiles(req.user);
        res.json(data);
    } catch (e) {
        next(e);
    }
}

// Abuur Profile arday (New Student Profile)
export async function postStudentProfile(req, res, next) {
    try {
        const { user_id, reg_no, admission_year, program_id } = req.body;

        if (!user_id || !reg_no || !admission_year || !program_id) {
            return res.status(400).json({
                message: "user_id, reg_no, admission_year, and program_id are required",
            });
        }

        const created = await studentProfilesService.createStudentProfile(req.user, {
            user_id,
            reg_no,
            admission_year,
            program_id,
        });

        res.status(201).json(created);
    } catch (e) {
        next(e);
    }
}

// Soo saar hal Profile arday (Single Student Profile)
export async function getStudentProfile(req, res, next) {
    try {
        const { id } = req.params;
        const data = await studentProfilesService.getStudentProfileById(req.user, id);
        if (!data) return res.status(404).json({ message: "Student Profile not found or unauthorized" });
        res.json(data);
    } catch (e) {
        next(e);
    }
}

// Beddel xogta Profile arday (Update Student Profile)
export async function patchStudentProfile(req, res, next) {
    try {
        const { id } = req.params;
        const updated = await studentProfilesService.updateStudentProfile(req.user, id, req.body);
        res.json(updated);
    } catch (e) {
        next(e);
    }
}

// Tirtir Profile arday (Delete Student Profile)
export async function deleteStudentProfile(req, res, next) {
    try {
        const { id } = req.params;
        await studentProfilesService.deleteStudentProfile(req.user, id);
        res.status(204).send();
    } catch (e) {
        next(e);
    }
}

