# Campus Connect API — Integration Documentation

**Version:** 1.0  
**Last Updated:** September 2026  
**Contact:** Jazeera University IT Department

---

## Table of Contents

1. [Overview](#overview)
2. [Base URL & Protocol](#base-url--protocol)
3. [Authentication](#authentication)
   - [Partner Authentication](#partner-authentication)
   - [Role Tokens (Dean/Student)](#role-tokens-deanstudent)
4. [Response Format](#response-format)
5. [Endpoints](#endpoints)
   - [Health Check](#1-health-check)
   - [Authentication Endpoints](#2-authentication-endpoints)
   - [Dean Endpoints](#3-dean-endpoints)
   - [Student Endpoints](#4-student-endpoints)
   - [Course Endpoints](#5-course-endpoints)
6. [Error Handling](#error-handling)
7. [Pagination](#pagination)
8. [Code Examples](#code-examples)
9. [Postman Collection](#postman-collection)
10. [Security Considerations](#security-considerations)
11. [Rate Limiting & Quotas](#rate-limiting--quotas)
12. [FAQ](#faq)

---

## Overview

The Campus Connect API provides **read-only** access to Jazeera University's Academic Information System (AIS). It enables Campus Connect to retrieve verified student, enrollment, academic-standing, and course data.

### Key Features

- **Read-only access** — No write operations are permitted
- **Two-tier authentication** — Partner-level + Role-based tokens
- **Faculty-scoped data** — Dean access is restricted to authorized faculties
- **JSON responses** — All responses use a consistent envelope format
- **Audit logging** — All API calls are logged for security and compliance

### Use Cases

| Use Case | Authentication | Endpoints |
|----------|---------------|-----------|
| Verify student enrollment status | Partner | `/students/verify` |
| Retrieve student profile | Partner | `/students/info` |
| Dean dashboard data | Dean token | `/dean/*` |
| Student portal data | Student token | `/students/me` |
| Course catalog sync | Partner | `/courses/catalog` |

---

## Base URL & Protocol

```
Production:  https://app.jazeerauniversity.edu.so/campus-connect/v1
Staging:     https://staging.jazeerauniversity.edu.so/campus-connect/v1
```

### Requirements

| Requirement | Specification |
|-------------|---------------|
| Protocol | HTTPS/TLS required |
| Content-Type | `application/json` |
| Character Encoding | UTF-8 |
| Timestamp Format | Unix seconds (integer) |

---

## Authentication

### Partner Authentication

Every request must include a partner signature. The API key is **never transmitted** over the wire.

#### Headers Required

| Header | Format | Description |
|--------|--------|-------------|
| `Authorization` | `base64(partner_code:signature)` | Partner authentication |
| `X-Timestamp` | Unix seconds (integer) | Request timestamp |

#### Signature Computation

```
signature = SHA-512(api_key + timestamp)
```

Where:
- `api_key` — Your secret API key (provided by Jazeera University)
- `timestamp` — Current Unix time in seconds

#### Authorization Header Construction

```
Authorization = base64(partner_code + ":" + signature)
```

#### Timestamp Validation

- Server rejects requests where `X-Timestamp` differs by more than **5 minutes** from server clock
- Timestamp must be a valid Unix timestamp in seconds

#### Step-by-Step Process

1. Get current Unix timestamp: `timestamp = Math.floor(Date.now() / 1000)`
2. Concatenate: `message = api_key + timestamp`
3. Hash: `signature = SHA-512(message)`
4. Encode: `Authorization = base64(partner_code + ":" + signature)`

---

### Role Tokens (Dean/Student)

For dean and student-specific endpoints, an additional **role token** is required.

#### Obtaining a Role Token

1. **Dean Login:** `POST /auth/dean/login`
2. **Student Login:** `POST /auth/student/login`

Both login endpoints require valid partner authentication.

#### Using Role Tokens

Include the token in the `X-Access-Token` header:

```
X-Access-Token: <jwt-token>
```

Or with Bearer prefix (also accepted):

```
X-Access-Token: Bearer <jwt-token>
```

#### Token Properties

| Property | Value |
|----------|-------|
| Algorithm | HS256 |
| Signing Key | Partner's `secret_key` |
| Validity | 12 hours |
| Issuer | `campus-connect` |

#### Token Payload

**Dean Token:**
```json
{
  "role": "dean",
  "sid": 22,
  "name": "Dr. Ahmed Hassan",
  "username": "ahmed.hassan",
  "allowedFaculties": [12],
  "iat": 1693612800,
  "exp": 1693656000,
  "iss": "campus-connect"
}
```

**Student Token:**
```json
{
  "role": "student",
  "sid": 12345,
  "studentId": "JU-2023-001",
  "name": "Mohamed Ali",
  "batch": "23-SE-01",
  "deptId": 5,
  "facultyId": 12,
  "iat": 1693612800,
  "exp": 1693656000,
  "iss": "campus-connect"
}
```

---

## Response Format

All responses use a consistent JSON envelope:

### Success Response

```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    // Response data here
  }
}
```

### Error Response

```json
{
  "resultCode": "400",
  "resultMessage": "Human-readable error message",
  "error": "ERROR_CODE"
}
```

### Response Headers

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json; charset=utf-8` |
| `X-Request-Id` | Unique request identifier for tracing |

---

## Endpoints

### 1. Health Check

#### `GET /ping`

Verifies partner credentials and API connectivity.

**Authentication:** Partner signature required

**Request:**
```bash
GET /v1/ping
Authorization: base64(partner_code:signature)
X-Timestamp: 1693612800
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    "service": "campus-connect",
    "partner": "campus_connect",
    "serverTime": 1693612800,
    "serverTimeIso": "2026-09-02T12:00:00+00:00"
  }
}
```

---

### 2. Authentication Endpoints

#### `POST /auth/dean/login`

Authenticates a dean (admin dashboard user) and returns a role token.

**Authentication:** Partner signature required

**Request Body:**
```json
{
  "username": "dean_username",
  "password": "dean_password"
}
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "Login successful",
  "data": {
    "role": "dean",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 43200,
    "profile": {
      "id": 22,
      "name": "Dr. Ahmed Hassan",
      "username": "ahmed.hassan"
    },
    "allowedFaculties": [12]
  }
}
```

**Error Responses:**
- `401 INVALID_CREDENTIALS` — Invalid username or password
- `403 FORBIDDEN` — Account has no faculty access

---

#### `POST /auth/student/login`

Authenticates a student using portal credentials and returns a role token.

**Authentication:** Partner signature required

**Request Body:**
```json
{
  "username": "JU-2023-001",
  "password": "student_password"
}
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "Login successful",
  "data": {
    "role": "student",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 43200,
    "profile": {
      "studentId": "JU-2023-001",
      "name": "Mohamed Ali",
      "status": "Enrolled",
      "section": "A",
      "batchCode": "23-SE-01",
      "faculty": "Economics",
      "department": "Business Administration"
    }
  }
}
```

**Error Responses:**
- `401 INVALID_CREDENTIALS` — Invalid username or password
- `403 FORBIDDEN` — Student not in allowed faculty or not enrolled

---

### 3. Dean Endpoints

All dean endpoints require:
1. Partner authentication
2. Dean role token in `X-Access-Token` header

#### `GET /dean/faculties`

Returns faculties the authenticated dean may access, with department/batch/student counts.

**Request:**
```bash
GET /v1/dean/faculties
Authorization: base64(partner_code:signature)
X-Timestamp: 1693612800
X-Access-Token: eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    "faculties": [
      {
        "id": 12,
        "FacID": "ECO",
        "FacName": "Economics",
        "department_count": 5,
        "active_batch_count": 8,
        "active_student_count": 245
      }
    ],
    "scope": [12]
  }
}
```

---

#### `GET /dean/departments`

Returns active departments of a faculty with batch and student counts.

**Required Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `facultyId` | integer | Faculty ID (must be in dean's scope) |

**Request:**
```bash
GET /v1/dean/departments?facultyId=12
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    "facultyId": 12,
    "departments": [
      {
        "id": 21,
        "DeptID": "BA",
        "DeptName": "Business Administration",
        "Program": "Bachelor",
        "degree": "BBA",
        "DurationYrs": 4,
        "active_batch_count": 3,
        "active_student_count": 85
      }
    ]
  }
}
```

---

#### `GET /dean/batches`

Returns active batches (with at least one enrolled student) within a faculty and department.

**All Parameters Required:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `facultyId` | integer | Faculty ID (must be in dean's scope) |
| `departmentId` | integer | Department ID within the faculty |

**Request:**
```bash
GET /v1/dean/batches?facultyId=12&departmentId=21
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    "facultyId": 12,
    "departmentId": 21,
    "batches": [
      {
        "BatchCode": "23-BA-01",
        "Dept_ID": 21,
        "DeptName": "Business Administration",
        "active_students": 28,
        "total_students": 30
      },
      {
        "BatchCode": "24-BA-01",
        "Dept_ID": 21,
        "DeptName": "Business Administration",
        "active_students": 32,
        "total_students": 32
      }
    ]
  }
}
```

**Error Responses:**
- `400 MISSING_PARAM` — Missing required parameter
- `403 FORBIDDEN` — Faculty not in dean's scope

---

#### `GET /dean/students`

Returns students within a faculty, department, and batch.

**All Parameters Required:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `facultyId` | integer | Yes | Faculty ID (must be in dean's scope) |
| `departmentId` | integer | Yes | Department ID within the faculty |
| `batch` | string | Yes | Batch code (e.g., `ba10`, `23-BA-01`) |
| `status` | string | Yes | `active`, `graduated`, or `all` |
| `limit` | integer | Yes | Page size (1-500, default 50) |
| `offset` | integer | No | Pagination offset (default 0) |

**Status Values:**
- `active` — Students with status "Enrolled"
- `graduated` — Students with status "Graduated"
- `all` — All students regardless of status

**Request:**
```bash
GET /v1/dean/students?facultyId=12&departmentId=16&batch=ba10&status=active&limit=50
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    "facultyId": 12,
    "departmentId": 16,
    "batch": "ba10",
    "status": "active",
    "students": [
      {
        "id": 1234,
        "StudentID": "JU-2023-001",
        "JU_ID": "JU-2023-001",
        "hemis": "HEMIS-001",
        "StudentName": "Mohamed Ali",
        "Gender": "Male",
        "Section": "A",
        "BatchCode": "ba10",
        "Status": "Enrolled",
        "Phone": "+25261xxxxxxx",
        "Email": "mohamed@example.com",
        "EntryDate": "2023-09-01",
        "FacName": "Economics",
        "DeptName": "Accounting",
        "Program": "Bachelor"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 28
    }
  }
}
```

**Error Responses:**
- `400 MISSING_PARAM` — Missing required parameter
- `400 INVALID_PARAM` — Invalid status value
- `403 FORBIDDEN` — Faculty not in dean's scope

---

#### `GET /dean/courses`

Returns active courses offered for a specific batch.

**Required Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `facultyId` | integer | Yes | Faculty ID (must be in dean's scope) |
| `batch` | string | Yes | Batch code (e.g., `bf03`) |

**Optional Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `term` | string | No | `current` (default), `year`, or `all` |
| `semester` | integer | No | Override semester (defaults to active term) |
| `departmentId` | integer | No | Filter by department |
| `limit` | integer | No | Page size (1-500, default 50) |
| `offset` | integer | No | Pagination offset (default 0) |

**Term Values:**
- `current` — Active semester only (default)
- `year` — Both semesters of the active academic year
- `all` — Every offering to date

**Request:**
```bash
GET /v1/dean/courses?facultyId=12&batch=bf03&term=current
```

**With optional semester override:**
```bash
GET /v1/dean/courses?facultyId=12&batch=bf03&semester=1
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    "facultyId": 12,
    "batch": "bf03",
    "term": "current",
    "semester": 1,
    "academicYear": "2025-2026",
    "courses": [
      {
        "CourseCode": "ECO101",
        "CourseName": "Principles of Economics",
        "CreditHour": 3,
        "Semester": 1,
        "AcademicYear": "2025-2026",
        "Batch": "bf03",
        "departmentid": 21,
        "DeptName": "Business Administration",
        "Active": "1"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 8
    }
  }
}
```

**Error Responses:**
- `400 MISSING_PARAM` — Missing required parameter
- `400 INVALID_PARAM` — Invalid term value
- `400 NO_ACTIVE_TERM` — No active term configured and semester not provided
- `403 FORBIDDEN` — Faculty not in dean's scope

---

### 4. Student Endpoints

#### `GET /students/me`

Returns the authenticated student's profile, academic standing, and current courses.

**Authentication:** Partner + Student token required

**Request:**
```bash
GET /v1/students/me
Authorization: base64(partner_code:signature)
X-Timestamp: 1693612800
X-Access-Token: eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    "profile": {
      "id": 1234,
      "StudentID": "JU-2023-001",
      "JU_ID": "JU-2023-001",
      "hemis": "HEMIS-001",
      "StudentName": "Mohamed Ali",
      "Gender": "Male",
      "DOB": "2000-01-15",
      "POB": "Mogadishu",
      "Phone": "+25261xxxxxxx",
      "Email": "mohamed@example.com",
      "mothername": "Fatima Ali",
      "Photo": "uploads/students/photo.jpg",
      "Status": "Enrolled",
      "EntryDate": "2023-09-01",
      "AcademicYear": "2025-2026",
      "Semester": 1,
      "BatchCode": "23-BA-01",
      "Section": "A",
      "FacultyID": 12,
      "faculty": "Economics",
      "department": "Business Administration",
      "program": "Bachelor",
      "degree": "BBA"
    },
    "standing": {
      "totalCourses": 12,
      "failedCourses": 0
    },
    "currentTerm": {
      "semester": 1,
      "academicYear": "2025-2026"
    },
    "courses": [
      {
        "CourseCode": "ECO101",
        "CourseName": "Principles of Economics",
        "CreditHour": 3,
        "Semester": 1,
        "AcademicYear": "2025-2026"
      }
    ]
  }
}
```

**Error Responses:**
- `401 ROLE_REQUIRED` — Missing X-Access-Token
- `401 INVALID_TOKEN` — Invalid or expired token
- `403 FORBIDDEN` — Student not in allowed faculty or not enrolled

---

#### `POST /students/verify`

Verifies a student ID and reports account status.

**Authentication:** Partner signature required

**Request Body:**
```json
{
  "studentId": "JU-2023-001"
}
```

**Response (200) — Student Found:**
```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    "verified": true,
    "isActive": true,
    "student": {
      "studentId": "JU-2023-001",
      "name": "Mohamed Ali",
      "status": "Enrolled",
      "batchCode": "23-BA-01",
      "section": "A"
    }
  }
}
```

**Response (200) — Student Not Found:**
```json
{
  "resultCode": "0",
  "resultMessage": "Student not found",
  "data": {
    "verified": false,
    "isActive": false,
    "student": null
  }
}
```

**Status Values for `isActive`:**
- `true` — Status is `Enrolled`, `Pending`, or `Graduated`
- `false` — Any other status or student not found

---

#### `GET /students/info`

Returns detailed student information.

**Authentication:** Partner signature required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `studentId` | string | Yes | Student ID or JU_ID |

**Request:**
```bash
GET /v1/students/info?studentId=JU-2023-001
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    "student": {
      "id": 1234,
      "StudentID": "JU-2023-001",
      "JU_ID": "JU-2023-001",
      "hemis": "HEMIS-001",
      "StudentName": "Mohamed Ali",
      "Gender": "Male",
      "DOB": "2000-01-15",
      "POB": "Mogadishu",
      "Phone": "+25261xxxxxxx",
      "Email": "mohamed@example.com",
      "Address": "Mogadishu, Somalia",
      "MaritalStatus": "Single",
      "mothername": "Fatima Ali",
      "Photo": "uploads/students/photo.jpg",
      "Status": "Enrolled",
      "EntryDate": "2023-09-01",
      "AcademicYear": "2025-2026",
      "Semester": 1,
      "BatchCode": "23-BA-01",
      "Section": "A",
      "faculty": "Economics",
      "department": "Business Administration",
      "program": "Bachelor",
      "degree": "BBA"
    }
  }
}
```

**Error Responses:**
- `400 MISSING_PARAM` — Missing studentId
- `400 INVALID_STUDENT_ID` — Invalid format (allowed: `[A-Za-z0-9-]`)
- `404 NOT_FOUND` — Student not found

---

#### `GET /students/enrollment`

Returns student enrollment details and current academic term.

**Authentication:** Partner signature required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `studentId` | string | Yes | Student ID or JU_ID |

**Request:**
```bash
GET /v1/students/enrollment?studentId=JU-2023-001
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    "enrollment": {
      "BatchCode": "23-BA-01",
      "Section": "A",
      "Semester": 1,
      "AcademicYear": "2025-2026",
      "EntryDate": "2023-09-01",
      "Status": "Enrolled",
      "faculty": "Economics",
      "department": "Business Administration"
    },
    "currentTerm": {
      "semester": 1,
      "academicYear": "2025-2026"
    }
  }
}
```

---

#### `GET /students/academic-standing`

Returns academic status and course results summary.

**Authentication:** Partner signature required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `studentId` | string | Yes | Student ID or JU_ID |

**Request:**
```bash
GET /v1/students/academic-standing?studentId=JU-2023-001
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    "studentId": "JU-2023-001",
    "standing": {
      "Status": "Enrolled",
      "Status_Date": "2025-09-01",
      "Reason_status": null,
      "Status_AcademicYear": "2025-2026",
      "AcademicYear": "2025-2026",
      "Semester": 1,
      "BatchCode": "23-BA-01",
      "faculty": "Economics",
      "department": "Business Administration",
      "program": "Bachelor"
    },
    "courses": {
      "total": 12,
      "failed": 0
    }
  }
}
```

**Course Count Logic:**
- `total` — Distinct courses on record
- `failed` — Courses below the pass mark (considering re-exams)

---

### 5. Course Endpoints

#### `GET /courses/catalog`

Returns the official course catalog, restricted to allowed faculties.

**Authentication:** Partner signature required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `facultyId` | integer | No | Filter by faculty (must be allowed) |
| `departmentId` | integer | No | Filter by department |
| `semester` | integer | No | Filter by semester |
| `active` | string | No | `1` (default) = active only, `0` = include inactive |
| `limit` | integer | No | Page size (1-500, default 50) |
| `offset` | integer | No | Pagination offset (default 0) |

**Request:**
```bash
GET /v1/courses/catalog?facultyId=12&active=1&limit=50
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    "courses": [
      {
        "SNO": 1,
        "CourseCode": "ECO101",
        "CourseName": "Principles of Economics",
        "appreviation": "PE",
        "CreditHour": 3,
        "Semester": 1,
        "year": 1,
        "Active": "1",
        "faculty": "Economics",
        "department": "Business Administration"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 45
    }
  }
}
```

---

#### `GET /courses/offerings`

Returns courses offered in a specific term, from batch/course assignments.

**Authentication:** Partner signature required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `facultyId` | integer | No | Filter by faculty (must be allowed) |
| `departmentId` | integer | No | Filter by department |
| `batch` | string | No | Filter by batch |
| `semester` | integer | No | Semester (defaults to active term) |
| `academicYear` | string | No | Academic year (defaults to active term) |
| `limit` | integer | No | Page size (1-500, default 50) |
| `offset` | integer | No | Pagination offset (default 0) |

**Request:**
```bash
GET /v1/courses/offerings?facultyId=12&semester=1&academicYear=2025-2026
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    "offerings": [
      {
        "CourseCode": "ECO101",
        "CourseName": "Principles of Economics",
        "CreditHour": 3,
        "Semester": 1,
        "AcademicYear": "2025-2026",
        "Batch": "23-BA-01",
        "FacultyID": 12,
        "departmentid": 21
      }
    ],
    "term": {
      "semester": 1,
      "academicYear": "2025-2026"
    },
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 25
    }
  }
}
```

---

#### `GET /courses/roster`

Returns students enrolled in a course, grouped by batch and section.

**Authentication:** Partner signature required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `courseCode` | string | Yes | Course code (e.g., `ECO101`) |
| `batch` | string | No | Filter by batch |
| `section` | string | No | Filter by section |
| `gender` | string | No | `Male`, `Female`, `M`, or `F` |
| `semester` | integer | No | Semester (defaults to active term) |
| `academicYear` | string | No | Academic year (defaults to active term) |
| `limit` | integer | No | Page size (1-500, default 50) |
| `offset` | integer | No | Pagination offset (default 0) |

**Request:**
```bash
GET /v1/courses/roster?courseCode=ECO101&limit=50
```

**Response (200):**
```json
{
  "resultCode": "0",
  "resultMessage": "OK",
  "data": {
    "courseCode": "ECO101",
    "term": {
      "semester": 1,
      "academicYear": "2025-2026"
    },
    "groups": [
      {
        "batch": "23-BA-01",
        "section": "A",
        "students": [
          {
            "id": 1234,
            "StudentID": "JU-2023-001",
            "JU_ID": "JU-2023-001",
            "StudentName": "Mohamed Ali",
            "Gender": "Male",
            "Section": "A",
            "BatchCode": "23-BA-01",
            "attendance_number": "001"
          }
        ]
      },
      {
        "batch": "23-BA-01",
        "section": "B",
        "students": [
          {
            "id": 1235,
            "StudentID": "JU-2023-002",
            "JU_ID": "JU-2023-002",
            "StudentName": "Fatima Hassan",
            "Gender": "Female",
            "Section": "B",
            "BatchCode": "23-BA-01",
            "attendance_number": "002"
          }
        ]
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 35
    }
  }
}
```

**Notes:**
- Only students with status `Enrolled` are returned
- Results are grouped by batch + section combination
- Pagination applies to the flattened student list before grouping

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request — Invalid parameters |
| 401 | Unauthorized — Authentication failure |
| 403 | Forbidden — Access denied |
| 404 | Not Found — Resource doesn't exist |
| 405 | Method Not Allowed — Wrong HTTP method |
| 500 | Internal Server Error — Server issue |

### Error Codes

| HTTP | Error Code | Description |
|------|------------|-------------|
| 400 | `INVALID_JSON` | Request body must be a JSON object |
| 400 | `MISSING_PARAM` | Required parameter is missing |
| 400 | `INVALID_PARAM` | Parameter value is invalid |
| 400 | `INVALID_STUDENT_ID` | Student ID format invalid |
| 400 | `INVALID_COURSE_CODE` | Course code format invalid |
| 400 | `NO_ACTIVE_TERM` | No active academic term configured |
| 401 | `AUTH_REQUIRED` | Authorization and X-Timestamp headers required |
| 401 | `INVALID_TIMESTAMP` | X-Timestamp must be Unix seconds |
| 401 | `STALE_TIMESTAMP` | Timestamp outside 5-minute window |
| 401 | `INVALID_AUTHORIZATION` | Authorization header malformed |
| 401 | `ROLE_REQUIRED` | X-Access-Token header required |
| 401 | `INVALID_TOKEN` | Token signature invalid |
| 401 | `TOKEN_EXPIRED` | Token has expired |
| 401 | `INVALID_CREDENTIALS` | Invalid username or password |
| 403 | `UNKNOWN_PARTNER` | Partner not registered or inactive |
| 403 | `INVALID_SIGNATURE` | Signature doesn't match |
| 403 | `FORBIDDEN` | Access outside scope |
| 404 | `NOT_FOUND` | Resource not found |
| 405 | `METHOD_NOT_ALLOWED` | Wrong HTTP method |
| 500 | `INTERNAL` | Server error (details hidden) |

### Error Response Example

```json
{
  "resultCode": "400",
  "resultMessage": "Parameter 'facultyId' is required",
  "error": "MISSING_PARAM"
}
```

---

## Pagination

### Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | integer | 50 | 500 | Number of records per page |
| `offset` | integer | 0 | — | Number of records to skip |

### Response Structure

```json
{
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 245
  }
}
```

### Pagination Example

```
Page 1: ?limit=50&offset=0   (records 1-50)
Page 2: ?limit=50&offset=50  (records 51-100)
Page 3: ?limit=50&offset=100 (records 101-150)
```

### Calculating Total Pages

```javascript
const totalPages = Math.ceil(pagination.total / pagination.limit);
```

---

## Code Examples

### JavaScript (Node.js)

```javascript
const crypto = require('crypto');

const PARTNER_CODE = 'campus_connect';
const API_KEY = 'your-api-key-here';
const BASE_URL = 'https://app.jazeerauniversity.edu.so/campus-connect/v1';

function generateAuth() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHash('sha512')
    .update(API_KEY + timestamp)
    .digest('hex');
  const auth = Buffer.from(`${PARTNER_CODE}:${signature}`).toString('base64');
  
  return {
    'Authorization': auth,
    'X-Timestamp': timestamp,
    'Content-Type': 'application/json'
  };
}

async function verifyStudent(studentId) {
  const response = await fetch(`${BASE_URL}/students/verify`, {
    method: 'POST',
    headers: generateAuth(),
    body: JSON.stringify({ studentId })
  });
  
  return response.json();
}

async function getStudentInfo(studentId) {
  const response = await fetch(
    `${BASE_URL}/students/info?studentId=${encodeURIComponent(studentId)}`,
    { headers: generateAuth() }
  );
  
  return response.json();
}

// Dean endpoints with role token
async function deanLogin(username, password) {
  const response = await fetch(`${BASE_URL}/auth/dean/login`, {
    method: 'POST',
    headers: generateAuth(),
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json();
  return data.data.token;
}

async function getDeanBatches(facultyId, departmentId, deanToken) {
  const headers = {
    ...generateAuth(),
    'X-Access-Token': deanToken
  };
  
  const response = await fetch(
    `${BASE_URL}/dean/batches?facultyId=${facultyId}&departmentId=${departmentId}`,
    { headers }
  );
  
  return response.json();
}
```

### Python

```python
import hashlib
import base64
import time
import requests

PARTNER_CODE = 'campus_connect'
API_KEY = 'your-api-key-here'
BASE_URL = 'https://app.jazeerauniversity.edu.so/campus-connect/v1'

def generate_auth():
    timestamp = str(int(time.time()))
    signature = hashlib.sha512((API_KEY + timestamp).encode()).hexdigest()
    auth = base64.b64encode(f'{PARTNER_CODE}:{signature}'.encode()).decode()
    
    return {
        'Authorization': auth,
        'X-Timestamp': timestamp,
        'Content-Type': 'application/json'
    }

def verify_student(student_id):
    response = requests.post(
        f'{BASE_URL}/students/verify',
        headers=generate_auth(),
        json={'studentId': student_id}
    )
    return response.json()

def get_student_info(student_id):
    response = requests.get(
        f'{BASE_URL}/students/info',
        headers=generate_auth(),
        params={'studentId': student_id}
    )
    return response.json()

def dean_login(username, password):
    response = requests.post(
        f'{BASE_URL}/auth/dean/login',
        headers=generate_auth(),
        json={'username': username, 'password': password}
    )
    return response.json()['data']['token']

def get_dean_batches(faculty_id, department_id, dean_token):
    headers = {**generate_auth(), 'X-Access-Token': dean_token}
    response = requests.get(
        f'{BASE_URL}/dean/batches',
        headers=headers,
        params={'facultyId': faculty_id, 'departmentId': department_id}
    )
    return response.json()

def get_dean_students(faculty_id, department_id, batch, status, limit, dean_token):
    headers = {**generate_auth(), 'X-Access-Token': dean_token}
    response = requests.get(
        f'{BASE_URL}/dean/students',
        headers=headers,
        params={
            'facultyId': faculty_id,
            'departmentId': department_id,
            'batch': batch,
            'status': status,
            'limit': limit
        }
    )
    return response.json()
```

### PHP

```php
<?php

const PARTNER_CODE = 'campus_connect';
const API_KEY = 'your-api-key-here';
const BASE_URL = 'https://app.jazeerauniversity.edu.so/campus-connect/v1';

function generateAuth(): array {
    $timestamp = (string) time();
    $signature = hash('sha512', API_KEY . $timestamp);
    $auth = base64_encode(PARTNER_CODE . ':' . $signature);
    
    return [
        'Authorization: ' . $auth,
        'X-Timestamp: ' . $timestamp,
        'Content-Type: application/json'
    ];
}

function verifyStudent(string $studentId): array {
    $ch = curl_init(BASE_URL . '/students/verify');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['studentId' => $studentId]),
        CURLOPT_HTTPHEADER => generateAuth(),
        CURLOPT_RETURNTRANSFER => true
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

function getStudentInfo(string $studentId): array {
    $ch = curl_init(BASE_URL . '/students/info?studentId=' . urlencode($studentId));
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => generateAuth(),
        CURLOPT_RETURNTRANSFER => true
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

function deanLogin(string $username, string $password): string {
    $ch = curl_init(BASE_URL . '/auth/dean/login');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'username' => $username,
            'password' => $password
        ]),
        CURLOPT_HTTPHEADER => generateAuth(),
        CURLOPT_RETURNTRANSFER => true
    ]);
    
    $response = json_decode(curl_exec($ch), true);
    curl_close($ch);
    
    return $response['data']['token'];
}

function getDeanBatches(int $facultyId, int $departmentId, string $deanToken): array {
    $headers = array_merge(generateAuth(), [
        'X-Access-Token: ' . $deanToken
    ]);
    
    $ch = curl_init(BASE_URL . "/dean/batches?facultyId=$facultyId&departmentId=$departmentId");
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}
```

### cURL

```bash
#!/bin/bash

PARTNER_CODE="campus_connect"
API_KEY="your-api-key-here"
BASE_URL="https://app.jazeerauniversity.edu.so/campus-connect/v1"

# Generate authentication headers
generate_auth() {
    TS=$(date +%s)
    SIG=$(printf '%s' "${API_KEY}${TS}" | sha512sum | awk '{print $1}')
    AUTH=$(printf '%s:%s' "$PARTNER_CODE" "$SIG" | base64)
    echo "-H 'Authorization: $AUTH' -H 'X-Timestamp: $TS'"
}

# Verify student
verify_student() {
    local student_id="$1"
    curl -sS -X POST "$BASE_URL/students/verify" \
        $(generate_auth) \
        -H "Content-Type: application/json" \
        -d "{\"studentId\": \"$student_id\"}"
}

# Get student info
get_student_info() {
    local student_id="$1"
    curl -sS "$BASE_URL/students/info?studentId=$student_id" \
        $(generate_auth)
}

# Dean login
dean_login() {
    local username="$1"
    local password="$2"
    curl -sS -X POST "$BASE_URL/auth/dean/login" \
        $(generate_auth) \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$username\", \"password\": \"$password\"}"
}

# Get dean batches
get_dean_batches() {
    local faculty_id="$1"
    local department_id="$2"
    local dean_token="$3"
    curl -sS "$BASE_URL/dean/batches?facultyId=$faculty_id&departmentId=$department_id" \
        $(generate_auth) \
        -H "X-Access-Token: $dean_token"
}

# Usage examples
# verify_student "JU-2023-001"
# get_student_info "JU-2023-001"
# dean_login "dean_username" "dean_password"
# get_dean_batches 12 21 "eyJhbGciOiJIUzI1NiIs..."
```

---

## Postman Collection

### Setup Instructions

1. **Import Collection:**
   - Open Postman
   - Click "Import" → "File"
   - Select `postman/campus-connect.postman_collection.json`

2. **Import Environment:**
   - Click "Import" → "File"
   - Select `postman/campus-connect.postman_environment.json`

3. **Configure Environment:**
   - Select "Campus Connect" environment
   - Update `apiKey` with your provided API key
   - Update `partnerCode` if different from default

4. **Run Requests:**
   - Start with "Ping" to verify connectivity
   - Run "Dean login" or "Student login" to get tokens
   - Tokens are automatically stored and reused

### Collection Structure

| Folder | Description | Auth Required |
|--------|-------------|---------------|
| 01 · Setup & Partner Auth | Connectivity check | Partner signature |
| 02 · Login (role tokens) | Dean & student login | Partner signature |
| 03 · Dean · Faculty Overview | Faculty-scoped data | Dean token |
| 04 · Student · My Data | Student profile data | Student token |
| 05 · AIS Reads | Machine-to-machine reads | Partner signature |

### Environment Variables

| Variable | Description | Auto-Set |
|----------|-------------|----------|
| `baseUrl` | API base URL | No |
| `partnerCode` | Partner identifier | No |
| `apiKey` | Partner API key | No |
| `deanToken` | Dean JWT token | Yes (by login) |
| `studentToken` | Student JWT token | Yes (by login) |
| `partnerAuth` | Computed auth header | Yes (per request) |
| `timestamp` | Unix timestamp | Yes (per request) |

### Pre-Request Script

The collection includes an automatic pre-request script that:
1. Generates a fresh timestamp
2. Computes the SHA-512 signature
3. Sets the `Authorization` header

No manual signature computation needed in Postman.

---

## Security Considerations

### Best Practices

1. **API Key Security:**
   - Never expose API keys in client-side code
   - Store keys in secure environment variables
   - Rotate keys periodically

2. **Token Management:**
   - Store role tokens securely
   - Implement token refresh logic (tokens expire after 12 hours)
   - Never log or expose tokens

3. **Request Validation:**
   - Always validate response codes
   - Handle errors gracefully
   - Implement retry logic for transient failures

4. **Data Handling:**
   - Cache responses when appropriate
   - Respect rate limits
   - Handle sensitive data according to privacy policies

### Input Validation

All inputs are validated before processing:

| Input Type | Validation Pattern |
|------------|-------------------|
| Student ID | `[A-Za-z0-9-]{1,50}` |
| Course Code | `[A-Za-z0-9-]{1,50}` |
| Faculty ID | Integer |
| Department ID | Integer |
| Batch Code | String |
| Status | Enum: `active`, `graduated`, `all` |
| Term | Enum: `current`, `year`, `all` |

### Audit Logging

All API calls are logged with:
- Request ID (returned in `X-Request-Id` header)
- Partner code
- Resolved role (dean/student/none)
- Client IP address
- HTTP method and path
- HTTP status code
- Result code and message
- Request duration (milliseconds)

---

## Rate Limiting & Quotas

### Current Limits

| Limit Type | Value |
|------------|-------|
| Timestamp skew | ±5 minutes |
| Default page size | 50 records |
| Maximum page size | 500 records |
| Token validity | 12 hours |

### Recommendations

- Implement exponential backoff for retries
- Cache frequently accessed data
- Use pagination for large datasets
- Batch requests when possible

---

## FAQ

### General Questions

**Q: What is the Campus Connect API?**  
A: A read-only API that provides access to Jazeera University's academic data for the Campus Connect platform.

**Q: Is write access available?**  
A: No, the API is read-only. Write operations (SSO, enrollment sync, grade sync) are not yet implemented.

**Q: What data can I access?**  
A: Student profiles, enrollment status, academic standing, course catalogs, course rosters, and faculty/department information.

### Authentication Questions

**Q: How do I get API credentials?**  
A: Contact Jazeera University IT Department to register as a partner and receive your `partner_code`, `api_key`, and `secret_key`.

**Q: Why is my request returning 403 FORBIDDEN?**  
A: Check that:
- Your partner code is active
- Your signature is computed correctly
- The timestamp is within 5 minutes of server time
- For dean endpoints, the faculty is in your allowed scope

**Q: How long do role tokens last?**  
A: 12 hours. After expiration, you must login again to get a new token.

**Q: Can I use the same token for multiple requests?**  
A: Yes, tokens are reusable until they expire.

### Technical Questions

**Q: What format are timestamps in?**  
A: Unix timestamps in seconds (integer). Example: `1693612800`

**Q: How do I handle pagination?**  
A: Use `limit` and `offset` parameters. Check `pagination.total` to determine if more pages exist.

**Q: What student statuses are considered "active"?**  
A: `Enrolled`, `Pending`, and `Graduated` are considered active statuses.

**Q: Can I filter by multiple faculties?**  
A: No, each request is scoped to the allowed faculties automatically. You can filter by a single faculty using `facultyId`.

### Error Handling Questions

**Q: What does error code `STALE_TIMESTAMP` mean?**  
A: Your request timestamp is more than 5 minutes different from the server clock. Synchronize your system clock.

**Q: What does error code `INVALID_SIGNATURE` mean?**  
A: The computed signature doesn't match. Verify your API key and signature computation algorithm.

**Q: How do I debug authentication issues?**  
A: 
1. Verify your API key is correct
2. Check timestamp is current Unix seconds
3. Ensure signature is SHA-512 of `api_key + timestamp`
4. Confirm Authorization header is base64 of `partner_code + ":" + signature`

---

## Appendix A: Database Schema Reference

### Key Tables

| Table | Description |
|-------|-------------|
| `apikeys` | Partner credentials |
| `staff_user` | Dean/admin accounts |
| `online_student_login` | Student portal credentials |
| `students` | Student records |
| `faculties` | Faculty definitions |
| `depts` | Department definitions |
| `courses` | Course catalog |
| `assigncourses` | Course assignments to batches |
| `exames` | Exam results |
| `settings` | Active academic term |
| `passmark` | Pass mark threshold |
| `emp_user_faculties` | Dean-faculty mappings |

### Status Values

**Student Status:**
- `Enrolled` — Currently active student
- `Pending` — Awaiting enrollment confirmation
- `Graduated` — Completed studies
- `Withdrawn` — Left the university
- `Suspended` — Temporarily suspended

**Department Status:**
- `Active` — Currently operating
- `Inactive` — Not currently accepting students

**Course Active Status:**
- `1` or `Y` or `NULL` — Active course
- `0` or `N` — Inactive course

---

## Appendix B: Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | September 2026 | Initial release |
| 1.1 | September 2026 | Made `batch` required for `/dean/courses`, `departmentId` required for `/dean/batches`, all parameters required for `/dean/students` |

---

## Support

For technical support or questions:

- **Email:** it-support@jazeerauniversity.edu.so
- **Documentation:** This document
- **Postman Collection:** Included in `postman/` directory

---

**End of Documentation**
