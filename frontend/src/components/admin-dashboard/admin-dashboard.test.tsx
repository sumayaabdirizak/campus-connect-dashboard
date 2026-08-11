import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
// @ts-ignore - screen/waitFor exported from dom which isn't in types
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminDashboard } from './admin-dashboard'
import * as authStore from '@/lib/auth-store'
import * as adminQueries from '@/lib/admin-queries'

vi.mock('@/lib/auth-store')
vi.mock('@/lib/admin-queries')
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>
}))

const mockAdmin = {
  id: 1,
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'ADMIN' as const,
  avatarUrl: 'https://example.com/avatar.jpg'
}

const mockAnalytics = {
  totalUsers: 250,
  activeCourses: 15,
  departments: 4,
  activeToday: 87
}

const mockFaculties = [
  {
    id: '1',
    name: 'Computer Science',
    courseCount: 8,
    userCount: 45,
    active: true
  },
  {
    id: '2',
    name: 'Mathematics',
    courseCount: 5,
    userCount: 32,
    active: true
  }
]

const mockAuditStats = {
  todayActivities: 125,
  thisWeekActivities: 890,
  thisMonthActivities: 3500
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Header', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockAdmin } as any)
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockFaculties,
        isLoading: false
      } as any)
      vi.spyOn(adminQueries, 'useAdminAuditStats').mockReturnValue({
        data: mockAuditStats,
        isLoading: false
      } as any)
    })

    it('should display admin name in welcome message', () => {
      render(<AdminDashboard />)
      expect(screen.getByText('Welcome, Admin User!')).toBeInTheDocument()
    })

    it('should display admin avatar', () => {
      render(<AdminDashboard />)
      expect(screen.getByAltText('Admin User')).toHaveAttribute('src', mockAdmin.avatarUrl)
    })
  })

  describe('Summary Cards', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockAdmin } as any)
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockFaculties,
        isLoading: false
      } as any)
      vi.spyOn(adminQueries, 'useAdminAuditStats').mockReturnValue({
        data: mockAuditStats,
        isLoading: false
      } as any)
    })

    it('should display total users count', () => {
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)

      render(<AdminDashboard />)
      expect(screen.getByText('250')).toBeInTheDocument()
    })

    it('should display active courses count', () => {
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)

      render(<AdminDashboard />)
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('should display department count', () => {
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)

      render(<AdminDashboard />)
      expect(screen.getByText('4')).toBeInTheDocument()
    })

    it('should display active users today', () => {
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)

      render(<AdminDashboard />)
      expect(screen.getByText('87')).toBeInTheDocument()
    })
  })

  describe('Quick Actions', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockAdmin } as any)
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockFaculties,
        isLoading: false
      } as any)
      vi.spyOn(adminQueries, 'useAdminAuditStats').mockReturnValue({
        data: mockAuditStats,
        isLoading: false
      } as any)
    })

    it('should display all quick action buttons', () => {
      render(<AdminDashboard />)

      expect(screen.getByText('Manage Users')).toBeInTheDocument()
      expect(screen.getByText('Manage Courses')).toBeInTheDocument()
      expect(screen.getByText('Manage Departments')).toBeInTheDocument()
      expect(screen.getByText('View Reports')).toBeInTheDocument()
    })

    it('should have correct navigation links', () => {
      render(<AdminDashboard />)

      const userLink = screen.getByRole('link', { name: /Manage Users/ })
      expect(userLink).toHaveAttribute('href', '/admin/users')

      const courseLink = screen.getByRole('link', { name: /Manage Courses/ })
      expect(courseLink).toHaveAttribute('href', '/admin/courses')

      const deptLink = screen.getByRole('link', { name: /Manage Departments/ })
      expect(deptLink).toHaveAttribute('href', '/admin/departments')

      const reportLink = screen.getByRole('link', { name: /View Reports/ })
      expect(reportLink).toHaveAttribute('href', '/admin/reports')
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<AdminDashboard />)

      const manageUsersLink = screen.getByRole('link', { name: /Manage Users/ })
      manageUsersLink.focus()
      expect(manageUsersLink).toHaveFocus()

      await user.keyboard('{Enter}')
    })
  })

  describe('Department Overview', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockAdmin } as any)
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)
      vi.spyOn(adminQueries, 'useAdminAuditStats').mockReturnValue({
        data: mockAuditStats,
        isLoading: false
      } as any)
    })

    it('should display all departments', () => {
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockFaculties,
        isLoading: false
      } as any)

      render(<AdminDashboard />)

      expect(screen.getByText('Computer Science')).toBeInTheDocument()
      expect(screen.getByText('Mathematics')).toBeInTheDocument()
    })

    it('should display course counts per department', () => {
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockFaculties,
        isLoading: false
      } as any)

      render(<AdminDashboard />)

      expect(screen.getByText('8')).toBeInTheDocument() // CS courses
      expect(screen.getByText('5')).toBeInTheDocument() // Math courses
    })

    it('should display user counts per department', () => {
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockFaculties,
        isLoading: false
      } as any)

      render(<AdminDashboard />)

      expect(screen.getByText('45')).toBeInTheDocument() // CS users
      expect(screen.getByText('32')).toBeInTheDocument() // Math users
    })

    it('should show empty state when no departments exist', () => {
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: [],
        isLoading: false
      } as any)

      render(<AdminDashboard />)

      expect(screen.getByText('No departments found')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockAdmin } as any)
    })

    it('should display loading skeletons while data fetches', () => {
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: null,
        isLoading: true
      } as any)
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: null,
        isLoading: true
      } as any)
      vi.spyOn(adminQueries, 'useAdminAuditStats').mockReturnValue({
        data: null,
        isLoading: true
      } as any)

      render(<AdminDashboard />)

      expect(screen.getAllByTestId('skeleton')).toHaveLength(4)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockAdmin } as any)
    })

    it('should display error state if analytics fails to load', () => {
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch')
      } as any)
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: [],
        isLoading: false
      } as any)
      vi.spyOn(adminQueries, 'useAdminAuditStats').mockReturnValue({
        data: null,
        isLoading: false
      } as any)

      render(<AdminDashboard />)

      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument()
    })
  })
})
