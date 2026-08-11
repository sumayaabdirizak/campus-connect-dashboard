# University System Integration Plan

## Context

Campus Connect was built and validated using simulated accounts and sample
data because Jazeera University did not provide access to a real Academic
Information System (AIS) or an API during development (see thesis §5,
Limitations: *"No integration with existing university systems"*). This
document describes how a real university AIS would plug into Campus Connect
once one becomes available, so that connecting it later is a configuration
and adapter-implementation exercise rather than a re-architecture.

It does not require or assume any specific vendor. It defines the contract
Campus Connect expects an external system to satisfy (or that we implement
against) — Prasetyo & Saintika (2021) describe the same shape of problem for
Moodle↔AIS sync via REST, which this plan follows.

## Two integration directions

There are two distinct integration problems, and they should not be
conflated:

1. **Inbound sync** — pulling authoritative records (students, lecturers,
   enrollments) from the university's AIS *into* Campus Connect, so Campus
   Connect stops being the system of record for identity/enrollment data.
2. **Outbound feed** — exposing Campus Connect's own academic activity
   (attendance, grades, course completion) *back to* the AIS, so the
   university's official records reflect what happened inside Campus
   Connect.

Most institutions only need (1) at first — Campus Connect becomes a
downstream consumer of the AIS's roster data — with (2) added later once the
university trusts Campus Connect's grade data enough to treat it as
authoritative.

## Data mapping (inbound)

Campus Connect's existing schema already anticipates these entities
(`backend/prisma/schema.prisma`); an AIS integration maps external records
onto them rather than introducing new tables:

| Campus Connect model | Fields an AIS record must supply | Notes |
|---|---|---|
| `User` | `full_name`, `email`, role | Role determines whether a `StudentProfile`, `LecturerProfile`, or `DeanProfile` is also created |
| `StudentProfile` | `student_number` (unique), `admission_year`, `facultyId`/`departmentId`/`programId` | `student_number` is the natural external key |
| `LecturerProfile` | `specialty`, `hire_date`, `departmentId` | |
| `StudentRegistration` | `batchSectionId`, `currentAcademicYearId`, `currentSemesterId` | Drives which courses a student sees (`getMyCourses` in `studentPortal.controller.js`) — this is the record most institutions change every term |
| `Faculty` / `Department` / `Program` | code, name | Usually near-static; syncing these is a one-time or rare operation, not a per-term feed |

The external system is the source of truth for all of the above; Campus
Connect's own admin UI (Users, Batches) becomes a fallback for
manually-managed accounts (e.g. guest lecturers) that never existed in the
AIS.

## Proposed adapter interface

Rather than hard-coding a specific vendor's API shape into the controllers
that currently create users/registrations (`users.registration.js`,
`sectionAssignment.js`), introduce a single seam:

```
backend/src/services/integrations/academicInfoSystem/
  AcademicInfoSystemAdapter.js   // interface + no-op default implementation
  syncStudents.js                // orchestrates adapter → StudentProfile/StudentRegistration upserts
  syncLecturers.js                // orchestrates adapter → LecturerProfile upserts
```

`AcademicInfoSystemAdapter` defines the contract any real integration must
implement:

```js
export class AcademicInfoSystemAdapter {
  /** @returns {Promise<ExternalStudentRecord[]>} */
  async fetchStudents({ since }) { throw new Error('not implemented'); }

  /** @returns {Promise<ExternalLecturerRecord[]>} */
  async fetchLecturers({ since }) { throw new Error('not implemented'); }

  /** Outbound — only needed once direction (2) is in scope. */
  async pushGradeRecords(records) { throw new Error('not implemented'); }
}
```

A `NullAcademicInfoSystemAdapter` (no-op, returns empty arrays) is the
default binding today — this is what "not yet integrated" looks like in
code, instead of the sync job simply not existing. When a real university
API is available, a concrete adapter (e.g.
`RestAcademicInfoSystemAdapter`) is written against that university's
actual endpoints and swapped in via config — no changes to
`syncStudents.js`/`syncLecturers.js` or the controllers that currently
create these records by hand.

`since` supports incremental sync (only records changed after the last
successful run) once a real AIS is connected; the no-op adapter ignores it.

## Sync strategy

- **Cadence**: nightly full sync is sufficient for a university's pace of
  change (enrollment, hiring) — Campus Connect already runs comparable
  nightly jobs (`runDiscussionMembershipNightlySync` in `server.js`) that
  this would sit alongside, not compete with.
- **Conflict rule**: AIS data always wins for identity/enrollment fields
  (name, student number, section, department). Campus Connect–only fields
  (avatar, notification prefs) are never touched by sync.
- **Idempotency**: upsert by the external system's natural key
  (`student_number` / an equivalent staff ID), never by internal Campus
  Connect `id` — reruns and out-of-order delivery must be safe.
- **Deletion/deactivation**: an AIS "graduated" or "withdrawn" signal maps
  to the existing `StudentRegistration.status = 'GRADUATED'` /
  `EnrollmentStatus` transition (see `graduateCompletedCohorts.js`), not a
  hard delete — Campus Connect already has this lifecycle, sync just
  becomes another trigger for it.

## Auth

Two independent auth concerns:

1. **Service-to-service**: the AIS integration authenticates as a
   background job, not as any human user — a dedicated API key /
   client-credentials grant scoped to read-only roster access, stored as
   an env var (`ACADEMIC_INFO_SYSTEM_API_KEY`), never a real user's
   session token.
2. **Single sign-on** (separate, optional, later-stage question): if the
   university also wants students/staff to log into Campus Connect with
   their existing university credentials, that's a distinct SAML/OIDC
   integration against Campus Connect's existing JWT-based auth
   (`auth.controller.js`) — out of scope for the roster-sync adapter above,
   and should be scoped separately if/when requested.

## What ships today vs. what's deferred

**Today (no real AIS available)**: the `NullAcademicInfoSystemAdapter`
seam described above, so the codebase has a clearly-named extension point
instead of scattered TODOs. Manual account creation (already built) remains
the only way to add users.

**Deferred until a real university API/AIS is provided**: the concrete
adapter implementation, the nightly sync job registration in `server.js`,
and the outbound grade-feed direction. None of this can be built or tested
meaningfully without a real endpoint and credentials to integrate against —
attempting to guess a schema now would just produce untested, likely-wrong
code, which is exactly the trap the thesis's own limitations section
flags (simulated data ≠ real institutional behavior).
