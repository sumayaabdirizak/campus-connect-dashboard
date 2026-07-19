import { prisma } from "../../../db/prisma.js";
import {
  deactivateDiscussionMembershipsForUser,
  syncDiscussionMembershipsForUser,
} from "../../../features/discussions/membershipSync.service.js";
import { revokeAllForUser } from "../../../utils/tokenRevocation.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { assertInFaculty } from "./helpers.js";

export const updateFacultyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const existing = await assertInFaculty(Number(id), facultyId, res);
    if (!existing) return;

    const { full_name, phone, status } = req.body;

    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        ...(full_name && { full_name }),
        ...(phone !== undefined && { phone }),
        ...(status && { status }),
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        number: true,
        phone: true,
        status: true,
      },
    });

    if (status && status !== "ACTIVE") {
      await revokeAllForUser(updated.id, `status_${String(status).toLowerCase()}`);
    }

    try {
      await syncDiscussionMembershipsForUser(updated.id);
    } catch (error) {
      console.error("Failed to sync discussion memberships after user update", {
        userId: updated.id,
        error: error?.message,
      });
    }

    res.json({ message: "User updated successfully", user: updated });
  } catch (e) {
    respondInternalError(res, "Failed to update user", e);
  }
};

export const removeFacultyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const existing = await assertInFaculty(Number(id), facultyId, res);
    if (!existing) return;

    await deactivateDiscussionMembershipsForUser(Number(id));
    await prisma.user.delete({ where: { id: Number(id) } });

    res.json({ message: "User removed from faculty successfully." });
  } catch (e) {
    respondInternalError(res, "Failed to remove user", e);
  }
};
