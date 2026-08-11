# Deferred Features Architecture Audit

**Date**: 2026-08-11  
**Scope**: Comprehensive audit of `admin` and `notifications` features  
**Status**: Research only — No changes made

---

## Executive Summary

| Feature | Files | Status | Type | Recommendation |
|---------|-------|--------|------|-----------------|
| **admin** | 30 | Production-ready code, broken imports | Complete feature | **MIGRATE to lib/admin/** |
| **notifications** | 13 (features) + 6 (lib) | Hybrid/partially split | Mixed feature + system utility | **CONSOLIDATE into lib/notifications/** |

---

## Detailed Audit: `admin`

### Current Structure

```
src/features/admin/
├── api/
│   ├── admin-api-client.ts        (adminApi object with 5 endpoints)
│   ├── admin-api-types.ts         (10+ type definitions)
│   ├── admin-api.ts               (re-exports)
│   ├── normalize-platform-analytics.ts
│   └── queries.ts                 (5 query hooks)
└── components/
    ├── admin-report-filters.tsx
    ├── admin-reports/             (6 files)
    │   ├── admin-reports-dashboard.tsx
    │   ├── export-reports.ts
    │   ├── report-cards.tsx
    │   ├── report-detail-sheet.tsx
    │   ├── reports-activity.tsx
    │   ├── reports-charts.tsx
    │   ├── reports-growth-charts.tsx
    │   ├── reports-header.tsx
    │   ├── reports-kpi-grid.tsx
    │   └── reports-performance-charts.tsx
    └── audit-logs/                (9 files)
        ├── audit-filter-fields.tsx
        ├── audit-filters.ts
        ├── audit-log-detail-sheet.tsx
        ├── audit-log-row.tsx
        ├── audit-log-styles.ts
        ├── audit-logs-filters-bar.tsx
        ├── audit-logs-pagination.tsx
        ├── audit-logs-table.tsx
        ├── audit-logs-toolbar.tsx
        ├── audit-logs-view.tsx
        ├── audit-module-tabs.tsx
        ├── audit-stat-chip.tsx
        ├── export-audit-logs.ts
        └── use-audit-logs-view.ts
```

### Production API Endpoints

All endpoints are real backend endpoints:

```typescript
// Analytics endpoint
GET /admin/analytics?facultyId={id}&period={3m|6m|12m}
// Returns: PlatformAnalytics object with KPIs, charts, trends

// Faculties endpoint
GET /admin/faculties
// Returns: { results: AdminFaculty[] }

// Audit logs endpoint
GET /admin/audit-logs?filters...
// Returns: PlatformAuditLogsResponse

// Audit stats endpoint
GET /admin/audit-logs/stats
// Returns: PlatformAuditStats

// Audit actors endpoint
GET /admin/audit-logs/actors
// Returns: { results: AuditActorOption[] }
```

### Type Definitions Provided

**PlatformAnalytics** (largest - 90+ properties):
- `scope`: Faculty, period, segmentation
- `platform`: Counts (faculties, departments, programs, students, etc.)
- `kpis`: Activity metrics (active users, completion rates, quiz attempts, etc.)
- `charts`: 15+ chart data series (communication, learning progress, growth, etc.)
- `insights`: String array
- `recentActivity`: Log entries

**Other types**: AdminFaculty, AdminAuditLogFilters, AuditActionType, AuditModule, etc.

### Current Dependencies (Broken)

**lib/admin/queries** does NOT exist but is imported by:
```
src/app/dashboard/admin/report/page.tsx
  ├─ useAdminAnalytics()         [expected: @/lib/admin/queries]
  └─ useAdminFaculties()          [expected: @/lib/admin/queries]

src/components/overview/main-dashboard/main-dashboard.tsx
  └─ useAdminAnalytics()          [expected: @/lib/admin/queries]
```

**@/lib/admin** type does NOT exist but is imported by:
```
src/components/overview/main-dashboard/
  ├─ dashboard-activity-timeline.tsx
  ├─ dashboard-assignment-pie-chart.tsx
  ├─ dashboard-chart-panels-primary.tsx
  ├─ dashboard-chart-panels-secondary.tsx
  ├─ dashboard-charts-section.tsx
  ├─ dashboard-course-enrollment-chart.tsx
  ├─ dashboard-kpi-card.tsx
  ├─ dashboard-recent-courses-table.tsx
  ├─ department-enrollment-panel.tsx
  ├─ main-dashboard-kpis.ts
  ├─ most-active-courses-panel.tsx
  ├─ role-distribution-panel.tsx
  └─ system-usage-chart.tsx
  
All expecting: import type { PlatformAnalytics } from '@/lib/admin'
```

### Consumers of admin feature (33 imports total)

1. **Route pages** (2):
   - `/dashboard/admin/report` — AdminReportsDashboard
   - `/dashboard/audit-logs` — AuditLogsView

2. **Overview dashboard components** (10):
   - All main-dashboard chart/KPI components use PlatformAnalytics type
   - main-dashboard.tsx uses useAdminAnalytics hook

3. **Reports feature** (1):
   - `src/components/reports/reports-command-bar.tsx` — LivePulseDot from report-cards

4. **Internal admin references** (20):
   - All component-to-component imports within admin/ itself

### Code Quality Assessment

✅ **Production-ready**:
- Well-structured API client with proper filtering
- Comprehensive type definitions
- Normalized data transformations
- Query hooks with proper caching keys
- Dashboard and audit log UI components are complete

⚠️ **Issues**:
- API client and query hooks are in features/admin but consumed as if they were in lib/admin
- PlatformAnalytics type is large and complex (90+ properties) — appropriate for lib/types or as its own types file
- No error handling/loading states in some components (but follows pattern of other features)

### Routes Using Admin

```
/dashboard/admin/report        — AdminReportPage (admin analytics dashboard)
/dashboard/audit-logs          — AuditLogsPage (requires SUPER_ADMIN role)
```

Both pages exist and are accessible (if user has appropriate role).

---

## Detailed Audit: `notifications`

### Current Split Structure

#### Features/Notifications (13 files)
```
src/features/notifications/
├── api/
│   └── course-activity.ts              (fetchCourseActivityNotifications, markCourseActivityRead)
├── components/
│   ├── notification-center.tsx         (NotificationCenter component)
│   ├── notification-item.tsx           (UI for individual notification)
│   ├── notification-timeline.tsx       (Timeline view)
│   └── notifications-page.tsx          (Full page /dashboard/notifications)
├── notification-toggle.tsx             (Quick toggle component)
├── use-push-subscription.ts            (Web push subscription logic)
├── utils/
│   ├── map-course-activity.ts          (Data mapping)
│   ├── notification-feed-mappers.ts    (Mappers + grouping logic)
│   ├── notification-feed-types.ts      (Type definitions)
│   ├── read-store.ts                   (Local read state management)
│   └── use-notification-feed.ts        (Main hook aggregating all data sources)
└── web-push.ts                         (Web push config)
```

#### Lib/Notifications (6 files)
```
src/lib/notifications/
├── api-error.ts                        (parseApiError, handleApiError, ParsedApiError)
├── confirm.ts                          (confirmAction, confirmDelete, confirmLogout, etc.)
├── toast.ts                            (showToast, ToastType definitions)
└── index (rollup)                      (Re-exports all above)

src/lib/discussions/queries/
├── notification-service.ts             (getUnreadCount, listNotifications, markNotificationsRead)
└── status-notification-queries.ts      (useNotifications hook)
```

### Type of Split

**Notifications is NOT split into lib/queries + lib/services + lib/components**

Instead, it has THREE different organizational patterns:

1. **lib/notifications/** — Toast/confirm utilities (shared system)
2. **lib/discussions/queries/** — Notification data service (cross-feature utilities)
3. **features/notifications/** — Notification feed UI + aggregation (feature-specific)

### What Each Part Does

#### lib/notifications (Shared System Utility)
- Toast notifications (success, error, info, warning)
- Confirmation dialogs (delete, logout, generic actions)
- API error parsing and display
- **Purpose**: Global notification system for the entire app
- **Usage**: Imported everywhere for showing user feedback

#### lib/discussions/queries (Cross-Feature Service)
- Query hooks for discussion notifications
- Unread count tracking
- Mark-as-read mutations
- **Purpose**: Queries discussion/channel notifications (part of discussions feature)
- **Scope**: Limited to discussion notifications only

#### features/notifications (Feature: Notification Feed)
- **Aggregator**: Combines data from multiple sources:
  - Announcements (from lib/announcements)
  - Discussion notifications (from lib/discussions)
  - Calendar deadlines (from API)
  - Course activity (from features/notifications/api)
- Components for viewing notification feed/center
- Web push subscription management
- **Purpose**: Unified notification feed/inbox experience

### Consumer Analysis

**lib/notifications** (shared system):
```
Imported in 50+ files across the app
Every component that shows toast/confirmDialog depends on this
Used globally by:
  - All API error handlers
  - Form submissions
  - User actions requiring confirmation
  - Success/failure feedback
```

**lib/discussions/queries** (notification service):
```
Imported by:
  - features/notifications/utils/use-notification-feed.ts
  - Used to fetch discussion-specific notifications
  - Part of the unified feed aggregation
```

**features/notifications** (feed feature):
```
Imported in 4 places:
  1. src/app/dashboard/notifications/page.tsx
     → Exports NotificationsPage component
  
  2. src/components/layout/pharmacy/pharmacy-header.tsx
     → NotificationCenter component (dropdown in header)
  
  3. src/components/profile/profile-view/profile-notifications-card.tsx
     → NotificationToggle (web push settings)
  
  4. src/components/teacher-courses/course-detail-header/course-header-actions.tsx
     → NotificationToggle (web push settings)
```

### Duplicate Analysis

#### No Exact Duplicates, But Overlaps:

1. **Toast System (lib) vs Toast in Web Push (features)**:
   - lib/notifications provides global toast
   - features/notifications/use-push-subscription uses it
   - No duplication, proper dependency

2. **Notification Types**:
   - lib/discussions/queries — Discussion notification types
   - features/notifications/utils/notification-feed-types.ts — Aggregated notification types
   - No duplication, different purposes

3. **Read State Management**:
   - features/notifications/utils/read-store.ts — Local (client-side)
   - lib/discussions queries — Server-side via API
   - Complementary, not duplicate

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Notification Feed (features/notifications)                      │
│                                                                  │
│ useNotificationFeed()  ← Aggregates all sources                │
│   ├─→ useAnnouncements()        (@/lib/announcements)          │
│   ├─→ useNotifications()        (@/lib/discussions)            │
│   ├─→ Calendar deadlines API    (/announcements/deadlines)     │
│   └─→ Course activity API       (features/notifications/api)   │
│                                                                  │
│ → Combines into unified NotifItem[]                            │
│ → Groups by date/category                                      │
│ → Tracks read status (local + server)                          │
└─────────────────────────────────────────────────────────────────┘
        ↓
    ┌─────────────────────────────────────────────────────────────────┐
    │ UI Components (features/notifications/components)              │
    │                                                                  │
    │ NotificationsPage ← Full page view                            │
    │ NotificationCenter ← Header dropdown                          │
    │ NotificationTimeline ← Timeline display                       │
    │ NotificationItem ← Individual item                            │
    └─────────────────────────────────────────────────────────────────┘
        ↓
    ┌─────────────────────────────────────────────────────────────────┐
    │ System Notifications (lib/notifications)                       │
    │                                                                  │
    │ Toast ← Async feedback (success/error/info)                  │
    │ Confirm ← User confirmations                                 │
    │ API Error ← Network error parsing                            │
    │                                                                  │
    │ Used globally by entire app                                  │
    └─────────────────────────────────────────────────────────────────┘
```

### Routes Using Notifications

```
/dashboard/notifications     — NotificationsPage (full notifications center)
```

Components used:
- Header notification center (pharmacy-header)
- Profile notification settings
- Course notification settings

---

## Migration Recommendations

### ADMIN Feature

#### **Recommended Action: MIGRATE to `src/lib/admin/`**

**Rationale**:
1. Production code with real backend endpoints
2. Currently broken imports (expecting lib/admin but in features/admin)
3. Already used as if it were a lib feature (overview imports @/lib/admin)
4. No self-contained domain boundary (analytics dashboard, not a business domain)
5. Other features depend on it (overview, reports)

**Proposed Structure**:
```
src/lib/admin/
├── queries/
│   ├── index.ts           ← useAdminAnalytics, useAdminFaculties, etc.
│   └── audit-queries.ts   ← useAdminAuditLogs, useAdminAuditStats, etc.
├── services/
│   ├── index.ts           ← adminApi client
│   ├── admin-api-types.ts ← Move types here
│   ├── normalize-platform-analytics.ts
│   └── audit-service.ts   ← Audit-specific functions
├── types.ts               ← Centralized (PlatformAnalytics, AdminFaculty, etc.)
└── constants.ts           ← Filter options, periods, etc.

src/components/admin/
├── admin-reports/         ← Report dashboard components
└── audit-logs/            ← Audit log components
```

**Implementation Steps**:
1. Create src/lib/admin/ with queries/, services/, types.ts
2. Move API client and queries from features/admin/api
3. Move types to lib/admin/types.ts
4. Create src/components/admin/ and move all components
5. Update all imports to use new paths
6. Delete src/features/admin/

**Risk**: Low - structure is clean, imports are straightforward

**Breaking Changes**: None (fixing currently broken imports)

---

### NOTIFICATIONS Feature

#### **Recommended Action: CONSOLIDATE into `src/lib/notifications/`**

**Rationale**:
1. Hybrid state creates confusion (data in two places)
2. lib/notifications is already shared system utility
3. features/notifications feed is actually a feature component
4. Clear separation needed: system (lib) vs feature (components)
5. Follows pattern: queries in lib/, UI in components/

**Proposed Structure**:
```
src/lib/notifications/
├── queries/
│   ├── index.ts           ← useNotificationFeed, useNotifications (from discussions)
│   └── notification-service.ts ← Merge discussion + course activity
├── services/
│   ├── index.ts           ← Toast, confirm, api-error (existing)
│   ├── toast.ts
│   ├── confirm.ts
│   └── api-error.ts
├── types.ts               ← NotifItem, NotifSource, etc. (merge both type files)
├── constants.ts           ← NOTIFICATION_DAY_MS, grouping rules
└── utils/
    ├── mappers.ts         ← Data transformation (currently notification-feed-mappers)
    └── read-store.ts      ← Local read state (currently features/notifications)

src/components/notifications/
├── notification-center.tsx
├── notification-item.tsx
├── notification-timeline.tsx
├── notifications-page.tsx
├── notification-toggle.tsx
└── web-push.ts            ← Can stay here or move to lib/services
```

**Implementation Steps**:
1. Create src/lib/notifications/queries/ and move hooks
2. Move notification-feed-types.ts and notification-feed-mappers.ts to lib/notifications
3. Move read-store.ts to lib/notifications/utils
4. Merge lib/discussions/queries/notification-service.ts into lib/notifications/queries
5. Consolidate types.ts (merge with lib/notifications/toast.ts types)
6. Move components to src/components/notifications/
7. Update all imports
8. Delete src/features/notifications/

**Optional**: Keep web-push.ts in lib/notifications/services or lib/notifications/web-push.ts

**Risk**: Low-Medium
- Needs careful import update
- Merging two notification type files (notification-feed-types + types from toast/confirm)
- Discussions queries has notification-service that might be used elsewhere

---

## Summary Comparison Table

| Aspect | admin | notifications |
|--------|-------|---------------|
| **Files Count** | 30 | 19 (13 features + 6 lib) |
| **Current Status** | Broken imports | Hybrid split |
| **Type** | Complete feature | Mixed feature + system |
| **Backend Endpoints** | 5 real endpoints | 5 endpoints (split) |
| **Components** | 16 complete UI | 7 complete UI |
| **Recommendation** | MIGRATE lib/admin | CONSOLIDATE lib/notifications |
| **Risk Level** | Low | Low-Medium |
| **Blocked Pages** | 2 pages + overview | 1 page + header |
| **Migration Complexity** | Straightforward | Requires merge |
| **Impact Radius** | 33 imports | 4 direct + 50+ indirect (toast) |

---

## Implementation Order

**Phase 1**: ADMIN (lower risk, fixes broken imports immediately)
- Migrate admin to lib/admin/
- Fixes overview dashboard immediately
- Unblocks reports integration

**Phase 2**: NOTIFICATIONS (after admin is stable)
- Consolidate notifications into lib/notifications/
- Requires careful import merging
- Can be done independently

---

## Risks & Mitigation

### ADMIN Migration Risks

| Risk | Likelihood | Mitigation |
|------|-------------|-----------|
| Import path conflicts | Low | Systematic find/replace with verification |
| Component dependencies | Low | Features/admin is self-contained |
| Type conflicts | Low | Consolidate in one types.ts |
| Breaking API client | Low | Move as-is, no changes needed |

### NOTIFICATIONS Consolidation Risks

| Risk | Likelihood | Mitigation |
|------|-------------|-----------|
| Type system merge issues | Medium | Carefully merge notification types |
| Import circular dependencies | Medium | Audit discussions/queries usage |
| Read state conflicts | Low | Local storage separate from server |
| Web push migration | Medium | Test push notifications thoroughly |
| Breaking existing imports | Medium | Create migration script for imports |

---

## Shared Component Libraries (NO ACTION)

These should remain untouched:
- `@/features/ui/*` — Radix UI primitives library
- `@/features/pos/*` — POS table/form components
- `@/features/modal/*` — Dialog/alert library
- `@/features/layout/*` — Layout wrapper components
- `@/features/file-uploader/*` — File upload widget
- `@/features/forms/*` — Form utilities and helpers
- `@/features/icons/*` — Icon library
- `@/features/kbar/*` — Command palette library
- `@/features/themes/*` — Theming components

**Reason**: These are intentionally shared libraries, not feature modules. The features/ naming is appropriate for shared component libraries even though Batch 1-5 migrated actual features to lib/.

---

## Decisions Pending

Before proceeding with migration, confirm:

1. **For ADMIN**:
   - Should audit-logs route stay at `/dashboard/audit-logs` or move to `/dashboard/admin/audit-logs`?
   - Should ReportKpiTone component remain in report-cards or be extracted?

2. **For NOTIFICATIONS**:
   - Should web-push.ts stay in services or lib/notifications/web-push.ts?
   - Can discussion notifications be fully merged with course activity notifications?
   - Should read-store be migrated to use IndexedDB or keep localStorage?

---

**Report Generated**: 2026-08-11  
**Status**: Audit complete, awaiting approval to proceed with migration

