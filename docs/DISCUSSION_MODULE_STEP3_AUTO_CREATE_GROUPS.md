# Discussion Module - Step 3 Auto-Create Groups

This step ensures discussion groups are provisioned by the system whenever core academic entities are created.

## Implemented behavior

- Faculty created -> auto-create `FACULTY` discussion group
- Department created -> auto-create `DEPARTMENT` discussion group
- Batch created -> auto-create `BATCH` discussion group
- Section created -> auto-create `SECTION` discussion group

Identity rules:

- `faculty:<facultyId>`
- `department:<departmentId>`
- `batch:<batchId>`
- `section:<sectionId>`

Uniqueness:

- Prisma unique constraint on `(scopeType, scopeId)` in `DiscussionGroup`
- Service uses idempotent `upsert` to skip duplicates safely

## Default members at creation

Default memberships are attached during provisioning:

- Faculty group: dean + faculty admins
- Department group: head (mapped from faculty dean when explicit head is unavailable) + lecturers in the department
- Batch group: advisors (inferred from teachers assigned to offerings in that batch)
- Section group: assigned lecturers (from section course offerings)

Students are intentionally not pre-loaded at group creation in this step; they are added through membership sync flows.

## Naming

Display name uses academic entity name at provisioning time:

- Faculty -> faculty name
- Department -> department name
- Batch -> batch name
- Section -> section name

## Archive strategy

On delete operations, discussion group is archived before entity deletion:

- `status = ARCHIVED`
- `archivedAt = now()`

History is preserved because messages are attached to discussion group IDs, not hard academic foreign keys.

## Failure handling

- Group provisioning is wrapped in try/catch at controller entry points.
- On failure, API still completes academic creation and logs the provisioning error.
- Backfill helper is available to re-create missing groups:
  - `backfillMissingDiscussionGroups(...)` in `backend/src/features/discussions/groupProvisioning.service.js`

## Key source files

- `backend/src/features/discussions/groupProvisioning.service.js`
- `backend/src/controllers/academic/faculty.controller.js`
- `backend/src/controllers/academic/departments.controller.js`
- `backend/src/controllers/academic/batches.controller.js`
- `backend/src/controllers/academic/batchSections.controller.js`
- `backend/src/controllers/dean/batchManagement.controller.js`
