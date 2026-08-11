# Dashboard Testing Guide

This document describes the automated test suites for all 4 Tier 1 landing page dashboards using **Vitest** and React Testing Library.

## Overview

Complete test coverage for:
- **StudentDashboard** — Student landing page with course list, GPA, and due assignments
- **TeacherDashboard** — Teacher landing page with class management and submission tracking
- **AdminDashboard** — Admin console with analytics, quick actions, and department overview
- **SuperAdminDashboard** — Platform-wide administration dashboard

## Running Tests

### Run all tests
```bash
npm run test
```

### Run tests in watch mode (auto-re-run on file changes)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test -- --coverage
```

### Run specific test file
```bash
npm run test -- student-dashboard.test.tsx
```

### Run tests matching a pattern
```bash
npm run test -- --reporter=verbose --grep="GPA"
```

## Test Structure

All test files follow the pattern: `ComponentName.test.tsx`

Each test file is organized into describe blocks:

### StudentDashboard Tests (366 lines, 35+ test cases)
- **Rendering and Header** — Component mounts correctly, displays student name
- **Summary Cards** — Course count, GPA calculation, semester display, N/A handling
- **My Courses Section** — Course list rendering, empty state
- **Due Soon Section** — 7-day filter, date sorting, submitted item filtering
- **Recent Activity Section** — Graded items display, 5-item limit

### TeacherDashboard Tests (238 lines, 15+ test cases)
- **Header** — Welcome message and avatar display
- **Summary Cards** — Course count, total students, pending submissions, drafts summation
- **My Classes Section** — All courses display, empty state
- **Pending Submissions Section** — Conditional rendering, empty state
- **Error Handling** — Error state display

### AdminDashboard Tests (348 lines, 25+ test cases)
- **Header** — Admin name and avatar
- **Summary Cards** — Users, courses, departments, active today counts
- **Quick Actions** — Navigation links (users, courses, departments, reports)
- **Department Overview** — Department list, course counts, user counts
- **Loading States** — Skeleton display
- **Error Handling** — Error state display

### SuperAdminDashboard Tests (380 lines, 30+ test cases)
- **Header** — Super admin name and platform title
- **Summary Cards** — Platform-wide totals (users, active this month, admins, alerts)
- **Faculty Overview** — All departments including inactive ones
- **Platform Statistics** — Total courses, enrollment rate calculations
- **Differences from AdminDashboard** — No quick actions, platform perspective
- **Data Transformation** — Course/user aggregation from faculty data
- **Error Handling** — Partial content on partial failures

## What Each Suite Tests

### Data Flow Correctness
- ✓ API hooks called correctly
- ✓ Data fetched and displayed in correct locations
- ✓ Multiple data sources aggregated properly

### Edge Cases
- ✓ Empty collections (no courses, no grades, no departments)
- ✓ Null/undefined values
- ✓ GPA calculation with partial grades
- ✓ Timezone-aware date filtering (7-day cutoff)

### Loading States
- ✓ Skeleton loaders display during fetch
- ✓ Data replaces skeletons when ready

### Error States
- ✓ Error messages display on fetch failure
- ✓ Partial content renders when only some queries fail

### Data Transformations
- ✓ GPA calculation (percentage to 4.0 scale)
- ✓ Due date filtering (7 days)
- ✓ Aggregations (sum students, sum submissions)
- ✓ Recent items limiting (max 5)

### User Interactions
- ✓ Navigation links work correctly
- ✓ Keyboard accessibility
- ✓ Conditional rendering (hide sections if no data)

## Test Dependencies

### Required Packages
- `vitest` ✓ — Fast unit test framework (already installed)
- `@testing-library/react` ✓ — React component testing (already installed)
- `@testing-library/jest-dom` — Jest matchers for DOM (needs: `npm install -D @testing-library/jest-dom`)
- `@testing-library/user-event` ✓ — User interaction simulation (already installed)
- `jsdom` ✓ — DOM environment for Vitest (already installed)
- `@vitejs/plugin-react` — React support for Vitest (needs: `npm install -D @vitejs/plugin-react`)

### Auto-mocked Modules
- `@/lib/auth-store` — User authentication
- `@/lib/student-courses/queries` — Student course data
- `@/lib/teacher-courses/queries` — Teacher course data
- `@/lib/admin-queries` — Admin analytics and faculty data
- `@/lib/course-details/queries/gradebook-queries` — Grades data
- `next/link` — Link component
- `next/navigation` — Router hooks
- `next/image` — Image component

## Coverage Targets

Current configuration enforces (in `vitest.config.ts`):
- **70% branch coverage** — All code paths tested
- **70% function coverage** — All functions called
- **70% line coverage** — 70% of lines executed
- **70% statement coverage** — All statements tested

Coverage report location: `coverage/` directory (generated after `npm run test -- --coverage`)

## Debugging Tests

### Run a single test file with verbose output
```bash
npm run test -- student-dashboard.test.tsx --reporter=verbose
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Vitest Debug",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:watch", "--"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Print debug info in tests
```typescript
import { screen, debug } from '@testing-library/react'

debug(screen.getByTestId('element'))
```

## Common Test Patterns

### Mock a hook that returns data
```typescript
import { vi } from 'vitest'

vi.spyOn(hooks, 'useStudentCourses').mockReturnValue({
  data: { offerings: mockCourses },
  isLoading: false,
  error: null
} as any)
```

### Test loading state
```typescript
vi.spyOn(hooks, 'useStudentCourses').mockReturnValue({
  data: null,
  isLoading: true,
  error: null
} as any)
expect(screen.getAllByTestId('skeleton')).toHaveLength(4)
```

### Test error state
```typescript
vi.spyOn(hooks, 'useStudentCourses').mockReturnValue({
  data: null,
  isLoading: false,
  error: new Error('Failed to fetch')
} as any)
expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument()
```

### Test data transformations
```typescript
expect(screen.getByText('3.50')).toBeInTheDocument() // GPA calculation
expect(screen.getByText('8')).toBeInTheDocument() // Sum of counts
```

### Clear mocks between tests
```typescript
import { beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.clearAllMocks()
})
```

## Continuous Integration

Tests should run as part of pre-commit hooks and CI/CD pipelines:

### Run tests with coverage (recommended for CI)
```bash
npm run test -- --coverage
```

### Watch mode (local development)
```bash
npm run test:watch
```

Coverage thresholds are enforced in `vitest.config.ts` and will fail the test run if not met.

## Adding New Tests

1. Create test file adjacent to component: `ComponentName.test.tsx`
2. Import from `@testing-library/react` directly (Vitest handles setup)
3. Use the describe/beforeEach/it pattern
4. Mock dependencies with `vi.mock()` at the top
5. Define test data (mock objects)
6. Group related tests in describe blocks
7. Run `npm run test` to verify

Example template:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComponent } from './my-component'
import * as hooks from '@/lib/hooks'

vi.mock('@/lib/hooks')

const mockData = { /* ... */ }

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with data', () => {
    vi.spyOn(hooks, 'useData').mockReturnValue({
      data: mockData,
      isLoading: false
    } as any)
    
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

## Troubleshooting

### "Cannot find module" errors
- Ensure path aliases in `vitest.config.ts` match `tsconfig.json`
- Restart Vitest: `npm run test:watch`

### "ReferenceError: document is not defined"
- Ensure `vitest.setup.ts` is listed in `setupFiles` in `vitest.config.ts`
- Restart Vitest: `npm run test:watch`

### "TypeError: Cannot read property 'mockReturnValue' of undefined"
- Ensure mock import uses `import * as hooks from '@/lib/...'` NOT `import { useHook } from '@/lib/...'`
- Vitest requires namespace imports for mocking

### Async test timeout
- Add `{ timeout: 10000 }` as third parameter to `it()`
- Most likely indicates an async operation not completing

### Tests pass locally but fail in CI
- Ensure mocks are cleared in `beforeEach` hooks
- Check for shared state between tests
- Vitest runs tests in parallel by default; ensure tests are isolated

## Next Steps

After tests pass consistently:
1. Integrate into pre-commit hooks via husky
2. Add coverage reports to CI/CD pipeline
3. Set up auto-comment on PRs with coverage metrics
4. Establish minimum coverage threshold for main branch (recommend 80%+)
