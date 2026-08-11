import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeacherDashboard } from './teacher-dashboard'
import * as authStore from '@/lib/auth-store'
import * as teacherCoursesQueries from '@/lib/teacher-courses/queries'

vi.mock('@/lib/auth-store')
vi.mock('@/lib/teacher-courses/queries')
vi.mock('@/components/teacher-courses/course-card', () => ({
  CourseCard: ({ course }: any) => <div>{course.courseName}</div>
}))

const mockTeacher = {
  id: 1,
  name: 'Dr. Smith',
  email: 'smith@example.com',
  role: 'TEACHER' as const,
  avatarUrl: 'https://example.com/avatar.jpg'
}

const mockTeacherCourses = [
  {
    id: '1',
    courseCode: 'CS101',
    courseName: 'Introduction to Computer Science',
    department: 'Computer Science',
    section: 'A',
    thumbnail: null,
    totalStudents: 30,
    totalLessons: 20,
    pendingSubmissions: 5,
    drafts: 0,
    status: 'active' as const,
    createdAt: '2024-01-01'
  },
  {
    id: '2',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    department: 'Computer Science',
    section: 'B',
    thumbnail: null,
    totalStudents: 25,
    totalLessons: 20,
    pendingSubmissions: 3,
    drafts: 1,
    status: 'active' as const,
    createdAt: '2024-01-01'
  }
]

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Header', () => {
    it('should display teacher name in welcome message', () => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockTeacher } as any)
      vi.spyOn(teacherCoursesQueries, 'useTeacherCourses').mockReturnValue({
        data: { courses: mockTeacherCourses },
        isLoading: false,
        error: null
      } as any)

      render(<TeacherDashboard />)

      expect(screen.getByText('Welcome, Dr. Smith!')).toBeInTheDocument()
    })

    it('should display teacher avatar', () => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockTeacher } as any)
      vi.spyOn(teacherCoursesQueries, 'useTeacherCourses').mockReturnValue({
        data: { courses: mockTeacherCourses },
        isLoading: false,
        error: null
      } as any)

      render(<TeacherDashboard />)

      expect(screen.getByAltText('Dr. Smith')).toHaveAttribute('src', mockTeacher.avatarUrl)
    })
  })

  describe('Summary Cards', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockTeacher } as any)
    })

    it('should display correct course count', () => {
      vi.spyOn(teacherCoursesQueries, 'useTeacherCourses').mockReturnValue({
        data: { courses: mockTeacherCourses },
        isLoading: false,
        error: null
      } as any)

      render(<TeacherDashboard />)

      expect(screen.getByText('Courses Teaching')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should calculate total students across all courses', () => {
      vi.spyOn(teacherCoursesQueries, 'useTeacherCourses').mockReturnValue({
        data: { courses: mockTeacherCourses },
        isLoading: false,
        error: null
      } as any)

      render(<TeacherDashboard />)

      // 30 + 25 = 55 students
      expect(screen.getByText('55')).toBeInTheDocument()
    })

    it('should sum pending submissions across all courses', () => {
      vi.spyOn(teacherCoursesQueries, 'useTeacherCourses').mockReturnValue({
        data: { courses: mockTeacherCourses },
        isLoading: false,
        error: null
      } as any)

      render(<TeacherDashboard />)

      // 5 + 3 = 8 pending
      expect(screen.getByText('8')).toBeInTheDocument()
    })

    it('should sum drafts across all courses', () => {
      vi.spyOn(teacherCoursesQueries, 'useTeacherCourses').mockReturnValue({
        data: { courses: mockTeacherCourses },
        isLoading: false,
        error: null
      } as any)

      render(<TeacherDashboard />)

      // 0 + 1 = 1 draft
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('My Classes Section', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockTeacher } as any)
    })

    it('should display all taught courses', () => {
      vi.spyOn(teacherCoursesQueries, 'useTeacherCourses').mockReturnValue({
        data: { courses: mockTeacherCourses },
        isLoading: false,
        error: null
      } as any)

      render(<TeacherDashboard />)

      expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument()
      expect(screen.getByText('Data Structures')).toBeInTheDocument()
    })

    it('should show empty state when no courses assigned', () => {
      vi.spyOn(teacherCoursesQueries, 'useTeacherCourses').mockReturnValue({
        data: { courses: [] },
        isLoading: false,
        error: null
      } as any)

      render(<TeacherDashboard />)

      expect(screen.getByText('No classes assigned')).toBeInTheDocument()
    })
  })

  describe('Pending Submissions Section', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockTeacher } as any)
    })

    it('should display pending submissions for courses with ungraded work', () => {
      vi.spyOn(teacherCoursesQueries, 'useTeacherCourses').mockReturnValue({
        data: { courses: mockTeacherCourses },
        isLoading: false,
        error: null
      } as any)

      render(<TeacherDashboard />)

      expect(screen.getByText('Submissions to Grade (8)')).toBeInTheDocument()
    })

    it('should not display pending submissions section if no ungraded work', () => {
      const coursesNoPending = mockTeacherCourses.map(c => ({
        ...c,
        pendingSubmissions: 0
      }))

      vi.spyOn(teacherCoursesQueries, 'useTeacherCourses').mockReturnValue({
        data: { courses: coursesNoPending },
        isLoading: false,
        error: null
      } as any)

      render(<TeacherDashboard />)

      expect(screen.queryByText(/Submissions to Grade/)).not.toBeInTheDocument()
    })

    it('should display loading state while fetching', () => {
      vi.spyOn(teacherCoursesQueries, 'useTeacherCourses').mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      } as any)

      render(<TeacherDashboard />)

      // Should show loading skeletons
      expect(screen.getAllByTestId('skeleton')).toHaveLength(4)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockTeacher } as any)
    })

    it('should display error state if data fails to load', () => {
      vi.spyOn(teacherCoursesQueries, 'useTeacherCourses').mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch')
      } as any)

      render(<TeacherDashboard />)

      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument()
    })
  })
})
