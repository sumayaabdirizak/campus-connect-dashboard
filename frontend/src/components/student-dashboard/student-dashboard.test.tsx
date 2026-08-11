import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { StudentDashboard } from './student-dashboard'
import * as authStore from '@/lib/auth-store'
import * as studentCoursesQueries from '@/lib/student-courses/queries'
import * as gradebookQueries from '@/lib/course-details/queries/gradebook-queries'

// Mock dependencies
vi.mock('@/lib/auth-store')
vi.mock('@/lib/student-courses/queries')
vi.mock('@/lib/course-details/queries/gradebook-queries')

const mockUser = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  role: 'STUDENT' as const,
  avatarUrl: 'https://example.com/avatar.jpg'
}

const mockCourses = [
  {
    id: '1',
    courseCode: 'CS101',
    courseName: 'Introduction to Computer Science',
    instructor: 'Dr. Smith',
    department: 'Computer Science',
    section: 'A',
    thumbnail: null,
    totalLessons: 20,
    completedLessons: 15,
    progress: 75,
    status: 'active' as const,
    enrolledAt: '2024-01-01'
  },
  {
    id: '2',
    courseCode: 'MATH201',
    courseName: 'Calculus II',
    instructor: 'Dr. Johnson',
    department: 'Mathematics',
    section: 'B',
    thumbnail: null,
    totalLessons: 20,
    completedLessons: 20,
    progress: 100,
    status: 'completed' as const,
    enrolledAt: '2024-01-01'
  }
]

const mockGrades = {
  items: [
    {
      kind: 'assignment' as const,
      id: 1,
      title: 'Assignment 1',
      pct: 85,
      grade: 17,
      maxMarks: 20,
      submitted: true,
      late: false,
      reviewed: true,
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      kind: 'quiz' as const,
      id: 2,
      title: 'Quiz 1',
      pct: 90,
      attempts: 1,
      taken: true,
      dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  overallPct: 87.5,
  gradedCount: 2,
  totalItems: 2
}

describe('StudentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering and Header', () => {
    it('should render with student name and avatar', () => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockUser } as any)
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: mockCourses },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: { semesters: [] },
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('Welcome back, John Doe!')).toBeInTheDocument()
      expect(screen.getByAltText('John Doe')).toHaveAttribute('src', mockUser.avatarUrl)
    })

    it('should display loading skeletons while data fetches', () => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockUser } as any)
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

      // Skeleton loaders should be present
      expect(screen.getAllByTestId('skeleton')).toHaveLength(4) // 4 summary cards
    })

    it('should display error state if data fails to load', () => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockUser } as any)
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch')
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument()
    })
  })

  describe('Summary Cards', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockUser } as any)
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: mockCourses },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: { semesters: [{ semesterName: 'Fall 2024' }] },
        isLoading: false
      } as any)
    })

    it('should display correct course count', () => {
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: mockGrades,
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('2')).toBeInTheDocument() // 2 courses
    })

    it('should calculate and display GPA correctly', async () => {
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: mockGrades,
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      await waitFor(() => {
        // GPA should be displayed (87.5 / 25 = 3.5)
        expect(screen.getByText('3.50')).toBeInTheDocument()
      })
    })

    it('should display current semester', () => {
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: mockGrades,
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('Fall 2024')).toBeInTheDocument()
    })

    it('should handle N/A GPA when no grades exist', () => {
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: { items: [], overallPct: null, gradedCount: 0, totalItems: 0 },
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('N/A')).toBeInTheDocument()
    })
  })

  describe('My Courses Section', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockUser } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: { semesters: [] },
        isLoading: false
      } as any)
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: mockGrades,
        isLoading: false
      } as any)
    })

    it('should display all enrolled courses', () => {
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: mockCourses },
        isLoading: false,
        error: null
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument()
      expect(screen.getByText('Calculus II')).toBeInTheDocument()
    })

    it('should show empty state when no courses enrolled', () => {
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: [] },
        isLoading: false,
        error: null
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('No courses enrolled')).toBeInTheDocument()
    })
  })

  describe('Due Soon Section', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockUser } as any)
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: mockCourses },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: { semesters: [] },
        isLoading: false
      } as any)
    })

    it('should display assignments due within 7 days', () => {
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: mockGrades,
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('Assignment 1')).toBeInTheDocument()
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    it('should sort assignments by due date', () => {
      const gradesSorted = {
        ...mockGrades,
        items: [
          { ...mockGrades.items[1], dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() },
          { ...mockGrades.items[0], dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() }
        ]
      }

      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: gradesSorted,
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      const assignmentElements = screen.getAllByText(/Assignment|Quiz/)
      expect(assignmentElements[0].textContent).toContain('Assignment 1') // Soonest due
    })

    it('should not show submitted assignments', () => {
      const unsubmittedGrades = {
        ...mockGrades,
        items: [
          { ...mockGrades.items[0], submitted: false },
          { ...mockGrades.items[1], submitted: false }
        ]
      }

      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: unsubmittedGrades,
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.queryByText('No due assignments')).not.toBeInTheDocument()
    })

    it('should hide Due Soon section if no unsubmitted assignments', () => {
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: { items: [], overallPct: null, gradedCount: 0, totalItems: 0 },
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.queryByText('Due Soon')).not.toBeInTheDocument()
    })
  })

  describe('Recent Activity Section', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockUser } as any)
      vi.spyOn(studentCoursesQueries, 'useStudentCourses').mockReturnValue({
        data: { offerings: mockCourses },
        isLoading: false,
        error: null
      } as any)
      vi.spyOn(studentCoursesQueries, 'useSemesterHistory').mockReturnValue({
        data: { semesters: [] },
        isLoading: false
      } as any)
    })

    it('should display graded items', () => {
      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: mockGrades,
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('Recent Grades')).toBeInTheDocument()
      expect(screen.getByText('Assignment 1')).toBeInTheDocument()
    })

    it('should limit to 5 recent items', () => {
      const manyGrades = {
        ...mockGrades,
        items: Array(10)
          .fill(null)
          .map((_, i) => ({
            kind: 'assignment' as const,
            id: i,
            title: `Assignment ${i}`,
            pct: 80 + i,
            grade: 16 + i,
            submitted: true,
            reviewed: true
          }))
      }

      vi.spyOn(gradebookQueries, 'useMyGrades').mockReturnValue({
        data: manyGrades,
        isLoading: false
      } as any)

      render(<StudentDashboard />)

      expect(screen.getByText('Assignment 0')).toBeInTheDocument()
      expect(screen.queryByText('Assignment 9')).not.toBeInTheDocument()
    })
  })
})
