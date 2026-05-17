# Discussion Module - Step 1 Scope and Rules

This document locks the Step 1 product and authorization rules for the discussion module.

## 1) Group scopes and identity

Fixed scopes:

- Faculty: all departments in a faculty
- Department: all staff + students in a department
- Batch: students in same cohort/year
- Section: students in same class section

Hard rules:

- Each academic entity maps to exactly one discussion group.
- Canonical keys must follow:
  - `faculty:<id>`
  - `department:<id>`
  - `batch:<id>`
  - `section:<id>`

## 2) Contextual roles (not global)

Minimum contextual roles in group membership:

- DEAN
- HEAD
- LECTURER
- ADVISOR
- STUDENT
- ADMIN

Rule: role authority is evaluated per group membership, not globally.

## 3) Posting and reading policy matrix

| Scope | Who can post | Who can read |
|---|---|---|
| Faculty | Dean + Admin | All faculty members |
| Department | Head + Lecturers + Admin | All department users |
| Batch | Lecturers + Advisors + Admin | All batch users |
| Section | Lecturers + Advisors + Admin | Students + lecturers (+ higher staff) |

Advanced student posting option:

- `NO_POSTING`
- `REPLY_ONLY` (default)
- `FULL_POSTING`

Default for this project: `REPLY_ONLY`.

## 4) Moderation policy

- Dean and Head: full moderation
  - delete messages
  - pin important items
  - mute users
- Lecturer and Advisor: limited moderation
  - delete messages
  - pin important items
  - cannot mute users
- Student: no moderation

## 5) Membership assignment rules

Membership is auto-assigned from academic data; it is not manually managed in normal flow.

Examples:

- Student section change: remove from old section group, add to new section group.
- Lecturer assignment change: auto-join/leave relevant section and batch groups.
- Role removal/deactivation: remove from all derived discussion memberships.

## 6) Audit and compliance

Recommended audit trail for accountability:

- who posted message
- who deleted message
- who pinned/unpinned
- who muted/unmuted
- when membership was auto-added or removed

## 7) Source of truth in code

The machine-readable policy definitions are in:

- `backend/src/features/discussions/policy.js`

All later steps (schema, REST, socket events, notifications) should import and follow this policy module to avoid policy drift.
