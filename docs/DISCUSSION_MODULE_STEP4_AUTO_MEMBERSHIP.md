# Discussion Module - Step 4 Auto-Membership

This step implements automatic membership synchronization for discussion groups based on academic assignments and contextual roles.

## Goal

Keep discussion memberships correct whenever users, roles, registrations, or teaching assignments change.

## Implemented assignment rules

### Faculty group

- Dean joins faculty group
- Faculty admins join faculty group
- Triggered by dean assignment/profile and faculty admin profile updates

### Department group

- Lecturers join their department group
- Students join their department group (from student profile)

### Batch group

- Students join from section registration (`StudentRegistration -> BatchSection -> Batch`)
- Advisors join from teaching assignment path (`TeacherAssigning -> CourseOffering -> Section -> Batch`)

### Section group

- Students join from `StudentRegistration.batchSectionId`
- Lecturers join when assigned via course-teaching path (`TeacherAssigning` + relevant `CourseOffering.sectionId`)

## Role and permission auto-set

Role and permissions are derived from Step 1 policy (`policy.js`) during sync:

- Dean: post + moderate
- Head: post + moderate
- Lecturer: post + no moderate
- Student: posting follows student policy, no moderate

## Update rules implemented

- Student section assignment -> sync student memberships immediately
- Lecturer assignment changes (course teacher assign/remove) -> sync lecturer memberships
- Offering create/delete -> sync all assigned teachers for the related course
- User status changes (approve/reject/update) -> membership flags refreshed
- User removal -> memberships deactivated before deletion
- Role/profile changes (student/lecturer/faculty-admin profile create/update/delete) -> memberships resynced

## Reliability strategy

- Primary: event-driven sync calls in mutation paths
- Backup: nightly/manual sync available through debug endpoint:
  - `POST /api/debug/discussion-memberships/sync`
  - Optional body: `{ "userId": 123 }` for single-user sync

## Edge-case behavior

- Missing group: auto-created on demand before membership upsert
- Existing membership: role/permissions updated in-place
- Inactive user: membership kept but marked inactive (`isActive=false`, `leftAt` set)

## Key source files

- `backend/src/features/discussions/membershipSync.service.js`
- `backend/src/features/discussions/groupProvisioning.service.js`
- `backend/src/controllers/dean/userManagement.controller.js`
- `backend/src/controllers/auth/users.controller.js`
- `backend/src/services/studentProfiles.service.js`
- `backend/src/services/lecturerProfiles.service.js`
- `backend/src/services/facultyAdminProfiles.service.js`
- `backend/src/controllers/dean/courseManagement.controller.js`
- `backend/src/controllers/academic/faculty.controller.js`
