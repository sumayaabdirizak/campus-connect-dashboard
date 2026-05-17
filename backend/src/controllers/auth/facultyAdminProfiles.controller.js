import * as facultyAdminProfilesService from "../../services/facultyAdminProfiles.service.js";

/**
 * Soo saar dhammaan profile-yada (Liiska)
 */
export async function getProfiles(req, res, next) {
  try {
    const data = await facultyAdminProfilesService.listFacultyAdminProfiles(req.user);
    res.json(data);
  } catch (e) {
    next(e);
  }
}

/**
 * Abuur profile cusub (Kaliya Super Admin)
 */
export async function postProfile(req, res, next) {
  try {
    const { user_id, faculty_id } = req.body;

    if (!user_id || !faculty_id) {
      return res.status(400).json({ message: "user_id and faculty_id are required" });
    }

    const created = await facultyAdminProfilesService.createFacultyAdminProfile({
      user_id,
      faculty_id,
    });

    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
}

/**
 * Soo saar hal profile gaar ah
 */
export async function getProfile(req, res, next) {
  try {
    const { id } = req.params;
    const data = await facultyAdminProfilesService.getFacultyAdminProfileById(req.user, id);
    if (!data) return res.status(404).json({ message: "Profile not found or unauthorized" });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

/**
 * Beddel xogta profile-ka (Kaliya Super Admin)
 */
export async function patchProfile(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await facultyAdminProfilesService.updateFacultyAdminProfile(req.user, id, req.body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

/**
 * Tirtir profile-ka (Kaliya Super Admin)
 */
export async function deleteProfile(req, res, next) {
  try {
    const { id } = req.params;
    await facultyAdminProfilesService.deleteFacultyAdminProfile(req.user, id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
