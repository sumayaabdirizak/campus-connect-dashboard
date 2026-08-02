# Backend conventions

## Controller file layout: flat file vs. split directory

Controllers start as a single flat file (`fooThing.controller.js`) exporting
one handler per named export. Once a controller grows past ~150 lines or
mixes more than one clearly separable concern (e.g. CRUD + file upload +
bulk import), split it into a directory instead of letting the file keep
growing:

```
controllers/<domain>/fooThing.controller/
  index.js          # barrel: re-exports every handler the route file needs
  <concern>.js       # one handler (or a tight group of related handlers)
  ...
controllers/<domain>/fooThing.js   # route file — imports from ./fooThing.controller/index.js
```

Each `<concern>.js` file is named after what it does (`listUsers.js`,
`update.js`, `delete.js`, `uploadAvatar.js`, `changePassword.js`), not after
the HTTP verb alone — a file should be findable by what it's responsible
for. `index.js` only re-exports; it has no logic of its own.

Reference implementation: `controllers/auth/users.controller/` (split) +
`controllers/auth/users.js` (route file, imports from
`./users.controller/index.js`). See also `controllers/academic/academicYear.controller/`.

### Migration status (as of 2026-07-29)

Split: `users.controller/`, `academicYear.controller/`,
`departments.controller/`, `batchSections.controller/`.

Still flat, pending split when next touched (line counts as of this
writing — split candidates are the ones over ~150 lines):
- `controllers/academic/faculties.controller.js` (210 lines)
- `controllers/academic/batches.controller.js` (204 lines)
- `controllers/academic/programs.controller.js` (188 lines)

Under the threshold — fine to leave flat unless they grow:
- `controllers/academic/courses.controller.js` (108 lines)
- `controllers/academic/courseTeachers.controller.js` (102 lines)
- `controllers/academic/sectionStudents.controller.js` (145 lines)
- `controllers/academic/semesters.controller.js` (98 lines)

Don't split a file just to match this doc — split it when you're already
touching it for a real change (new endpoint, validation migration, bug
fix), so the diff stays reviewable and the split earns its keep.
