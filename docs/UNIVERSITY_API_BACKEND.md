# Backend — University AIS client

Outbound integration with Jazeera University's read-only AIS API (same contract as Postman).

## Configure `backend/.env`

```env
UNIVERSITY_API_BASE_URL="https://app.jazeerauniversity.edu.so/campus-connect"
UNIVERSITY_API_PARTNER_CODE="campus_connect"
UNIVERSITY_API_KEY="your-key-from-ict"

# Optional — server-side dean roster reads
UNIVERSITY_DEAN_USERNAME="..."
UNIVERSITY_DEAN_PASSWORD="..."
```

Never commit real keys. Restart the backend after changing `.env`.

## Super-admin diagnostics (logged in as SUPER_ADMIN)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/university-ais/status` | Ping university API |
| `GET /api/admin/university-ais/dean-overview` | Dean login + faculties (needs dean env creds) |
| `GET /api/admin/university-ais/students-preview?facultyId=12&departmentId=12&batch=FA08` | Preview student rows (no DB write) |
| `POST /api/admin/university-ais/sync-students` | One AIS batch → Campus Connect DB |
| `POST /api/admin/university-ais/sync-faculty-students` | All departments + batches for one AIS faculty |
| `POST /api/admin/university-ais/sync-courses` | One batch → courses + offerings |
| `POST /api/admin/university-ais/sync-faculty-courses` | All batches in faculty → courses + offerings |
| `POST /api/admin/university-ais/sync-faculty-lecturers` | AIS lecturers → TEACHER users + offering assignments |
| `GET /api/admin/university-ais/active-term?facultyId=12` | University active term + year labels from offerings |
| `POST /api/admin/university-ais/sync-academic-terms` | AIS academic years → local AcademicYear + Semesters |

CLI: `node scripts/sync-university-faculty-courses.js`
CLI: `node scripts/sync-university-faculty-lecturers.js`

### Sync one faculty (all departments & batches)

```json
POST /api/admin/university-ais/sync-faculty-students
{
  "facultyId": 12,
  "facultyCode": "EMS",
  "facultyName": "Economics and Management Science",
  "dryRun": true
}
```

CLI equivalent: `node scripts/sync-university-faculty-students.js` (edit `facultyId` in script).

### Sync body example

```json
{
  "facultyId": 12,
  "departmentId": 12,
  "batch": "FA08",
  "localDepartmentId": 3,
  "dryRun": true
}
```

Set `UNIVERSITY_SYNC_DEFAULT_PASSWORD` before a real sync (`dryRun: false`). Students log in with their **StudentID** (e.g. `JU-2023-001`) and the default password; `must_change_password` is true.

If AIS batch names differ from Campus Connect batch names, pass `localBatchId` instead of relying on name matching.

## Code layout

- `src/services/integrations/universityApi/` — HTTP client + partner signature
- `src/services/integrations/academicInfoSystem/` — adapter seam (`getAcademicInfoSystemAdapter()`)

Full DB sync is available via `POST /api/admin/university-ais/sync-students` (see body example in this doc).
