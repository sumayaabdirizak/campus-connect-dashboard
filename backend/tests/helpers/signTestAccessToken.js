import jwt from "jsonwebtoken";
import { env } from "../../src/config/env.js";

/**
 * Signs an access-shaped JWT compatible with `src/middleware/auth.js`.
 * @param {object} opts
 * @param {number} opts.sub
 * @param {string} opts.role
 * @param {number|null} [opts.facultyId]
 * @param {number|null} [opts.departmentId]
 * @param {number|null} [opts.programId]
 * @param {number[]} [opts.facultyIds]
 * @param {string} [opts.email]
 * @param {string} [opts.full_name]
 * @param {import('jsonwebtoken').SignOptions} [signOptions]
 */
export function signTestAccessToken(opts, signOptions) {
  const sub = Number(opts.sub);
  return jwt.sign(
    {
      id: sub,
      sub,
      role: opts.role,
      email: opts.email ?? "test@example.com",
      full_name: opts.full_name ?? "Test User",
      facultyId: opts.facultyId ?? null,
      departmentId: opts.departmentId ?? null,
      programId: opts.programId ?? null,
      facultyIds: opts.facultyIds ?? [],
      tokenType: "access",
    },
    env.JWT_SECRET,
    signOptions ?? { expiresIn: "1h" }
  );
}
