import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import * as RTL from '@testing-library/react'

const screen = RTL.screen as any
import { StudentDashboard } from './student-dashboard'
import * as authStore from '@/lib/auth-store'
import * as studentCoursesQueries from '@/lib/student-courses/queries'
import * as gradebookQueries from '@/lib/course-details/queries/gradebook-queries'

vi.mock('@/lib/auth-store')
vi.mock('@/lib/student-courses/queries')
vi.mock('@/lib/course-details/queries/gradebook-queries')

const mockUser = {
  id: 1,
  name: 'Test Student',
  email: 'student@example.com',
  role: 'STUDENT' as const,
  avatarUrl: 'https://example.com/avatar.jpg'
}

describe('StudentDashboard - Edge Cases & Error Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Scenario 1: User with No Data', () => {
    beforeEach(() => {
      jest.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockUser } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: { semesters: [] },
        isLoading: false
      } as any)
    })

    it('should handle no enrolled courses gracefully', () => {
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: [] },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: { items: [], overallPct: null, gradedCount: 0, totalItems: 0 },
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('No courses enrolled')).toBeInTheDocument()
    })

    it('should display 0 courses in summary card', () => {
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: [] },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: { items: [], overallPct: null, gradedCount: 0, totalItems: 0 },
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('0')).toBeInTheDocument() // 0 courses
    })

    it('should display N/A for GPA when no grades exist', () => {
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: [] },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: { items: [], overallPct: null, gradedCount: 0, totalItems: 0 },
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('N/A')).toBeInTheDocument()
    })

    it('should not show Due Soon section when no assignments', () => {
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: [] },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: { items: [], overallPct: null, gradedCount: 0, totalItems: 0 },
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.queryByText('Due Soon')).not.toBeInTheDocument()
    })

    it('should not show Recent Grades section when no grades', () => {
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: [] },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: { items: [], overallPct: null, gradedCount: 0, totalItems: 0 },
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.queryByText('Recent Grades')).not.toBeInTheDocument()
    })

    it('should not have console errors with empty data', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: [] },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: { items: [], overallPct: null, gradedCount: 0, totalItems: 0 },
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(consoleErrorSpy).not.toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Scenario 2: User with Large Dataset', () => {
    it('should handle 20+ courses without performance issues', () => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockUser } as any)

      const largeCourseList = Array(20)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          courseCode: `COURSE${i}`,
          courseName: `Course ${i}`,
          instructor: `Dr. ${i}`,
          department: 'Test Dept',
          section: 'A',
          thumbnail: null,
          totalLessons: 20,
          completedLessons: i % 2 === 0 ? 20 : 10,
          progress: i % 2 === 0 ? 100 : 50,
          status: 'active' as const,
          enrolledAt: '2024-01-01'
        }))

      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: largeCourseList },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: { semesters: [{ semesterName: 'Fall 2024' }] },
        isLoading: false
      } as any)
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: { items: [], overallPct: 85, gradedCount: 5, totalItems: 20 },
        isLoading: false
      } as any)

      const start = performance.now()
      render(<StudentDashboard />)
      const end = performance.now()

      // Should render in under 1 second (adjust if needed)
      expect(end - start).toBeLessThan(1000)
      expect(screen.getByText('20')).toBeInTheDocument() // All courses loaded
    })

    it('should handle 100+ grades without crashing', () => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockUser } as any)

      const manyGrades = Array(100)
        .fill(null)
        .map((_, i) => ({
          kind: 'assignment' as const,
          id: i,
          title: `Grade ${i}`,
          pct: 80 + (i % 20),
          grade: 16,
          submitted: true,
          reviewed: i < 50
        }))

      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: [] },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: { semesters: [] },
        isLoading: false
      } as any)
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: { items: manyGrades, overallPct: 85, gradedCount: 100, totalItems: 100 },
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      // Should limit to 5 recent items
      expect(screen.getByText('Grade 0')).toBeInTheDocument()
      expect(screen.queryByText('Grade 99')).not.toBeInTheDocument()
    })
  })

  describe('Scenario 3: Missing/Failing API Endpoints', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockUser } as any)
    })

    it('should show error when courses API fails', () => {
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch courses')
      } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: { semesters: [] },
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument()
    })

    it('should show error when grades API fails', () => {
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: [] },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: { semesters: [] },
        isLoading: false
      } as any)
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch grades')
      } as any)

      render(<StudentDashboard />)

      // Error should be handled gracefully, not crash
      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument()
    })

    it('should display helpful error message on API failure', () => {
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error')
      } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: null,
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      const errorText = screen.getByText(/Failed to load dashboard/i)
      expect(errorText).toBeInTheDocument()
    })
  })

  describe('Scenario 4: Network Failure Recovery', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockUser } as any)
    })

    it('should show loading state during network request', () => {
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: null,
        isLoading: true
      } as any)

      render(<StudentDashboard />)

      // Should show skeletons during loading
      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
    })

    it('should recover gracefully from temporary network error', () => {
      // First call fails
      const useCoursesHook = vi.spyOn(studentCoursesQueries, 'useStudentCourses')
      useCoursesHook.mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: new Error('Network error')
      } as any)

      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: { semesters: [] },
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument()

      // Then it recovers (in real app, user would refresh)
      useCoursesHook.mockReturnValueOnce({
        data: { offerings: [] },
        isLoading: false,
        error: null
      } as any)

      // After refresh/retry, should work
      vi.clearAllMocks()
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: [] },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: { semesters: [] },
        isLoading: false
      } as any)

      render(<StudentDashboard />)
      // Component should be recoverable
      expect(screen.queryByText('Failed to load dashboard')).not.toBeInTheDocument()
    })

    it('should not have unhandled errors in error state', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error')
      } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: null,
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      // Errors should be handled, not logged to console
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('Network error'))
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Data Accuracy Under Edge Cases', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockUser } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: { semesters: [{ semesterName: 'Fall 2024' }] },
        isLoading: false
      } as any)
    })

    it('should calculate GPA correctly with partial grades', () => {
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: [] },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: {
          items: [
            { kind: 'assignment' as const, id: 1, pct: 80, submitted: true },
            { kind: 'assignment' as const, id: 2, pct: null, submitted: false } // No grade
          ],
          overallPct: 80, // Only 1 graded item = 80%
          gradedCount: 1,
          totalItems: 2
        },
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      // GPA should be 80 / 25 = 3.20
      expect(screen.getByText('3.20')).toBeInTheDocument()
    })

    it('should filter assignments by 7-day deadline correctly', () => {
      const now = Date.now()
      const inThreeDays = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString()
      const inEightDays = new Date(now + 8 * 24 * 60 * 60 * 1000).toISOString()

      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: [] },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: {
          items: [
            {
              kind: 'assignment' as const,
              id: 1,
              title: 'Due Soon',
              pct: null,
              submitted: false,
              dueAt: inThreeDays
            },
            {
              kind: 'assignment' as const,
              id: 2,
              title: 'Due Later',
              pct: null,
              submitted: false,
              dueAt: inEightDays
            }
          ],
          overallPct: 0,
          gradedCount: 0,
          totalItems: 2
        },
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('Due Soon')).toBeInTheDocument()
      expect(screen.queryByText('Due Later')).not.toBeInTheDocument()
    })
  })
})
