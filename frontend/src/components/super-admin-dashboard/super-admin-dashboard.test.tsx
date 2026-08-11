import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
// @ts-ignore - screen exported from dom which isn't in types
import { screen } from '@testing-library/react'
import { SuperAdminDashboard } from './super-admin-dashboard'
import * as authStore from '@/lib/auth-store'
import * as adminQueries from '@/lib/admin-queries'

vi.mock('@/lib/auth-store')
vi.mock('@/lib/admin-queries')

const mockSuperAdmin = {
  id: 1,
  name: 'Super Admin',
  email: 'superadmin@example.com',
  role: 'SUPER_ADMIN' as const,
  avatarUrl: 'https://example.com/avatar.jpg'
}

const mockAnalytics = {
  totalUsers: 1250,
  activeCourses: 85,
  departments: 12,
  activeThisMonth: 654,
  systemAlerts: 3
}

const mockAllFaculties = [
  {
    id: '1',
    name: 'Computer Science',
    courseCount: 25,
    userCount: 150,
    active: true
  },
  {
    id: '2',
    name: 'Mathematics',
    courseCount: 18,
    userCount: 120,
    active: true
  },
  {
    id: '3',
    name: 'Engineering',
    courseCount: 30,
    userCount: 200,
    active: true
  },
  {
    id: '4',
    name: 'Arts',
    courseCount: 12,
    userCount: 80,
    active: false
  }
]

describe('SuperAdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Header', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockSuperAdmin } as any)
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockAllFaculties,
        isLoading: false
      } as any)
    })

    it('should display super admin name in welcome message', () => {
      render(<SuperAdminDashboard />)
      expect(screen.getByText('Welcome, Super Admin!')).toBeInTheDocument()
    })

    it('should display super admin avatar', () => {
      render(<SuperAdminDashboard />)
      expect(screen.getByAltText('Super Admin')).toHaveAttribute('src', mockSuperAdmin.avatarUrl)
    })

    it('should show platform title in subtitle', () => {
      render(<SuperAdminDashboard />)
      expect(screen.getByText('Platform Administration')).toBeInTheDocument()
    })
  })

  describe('Summary Cards - Platform Scope', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockSuperAdmin } as any)
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockAllFaculties,
        isLoading: false
      } as any)
    })

    it('should display total users across entire platform', () => {
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)

      render(<SuperAdminDashboard />)
      expect(screen.getByText('1250')).toBeInTheDocument()
    })

    it('should display active users this month', () => {
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)

      render(<SuperAdminDashboard />)
      expect(screen.getByText('654')).toBeInTheDocument()
    })

    it('should display admin count', () => {
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: { ...mockAnalytics, systemAdmins: 5 },
        isLoading: false
      } as any)

      render(<SuperAdminDashboard />)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should display system alerts count', () => {
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)

      render(<SuperAdminDashboard />)
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('Faculty Overview - All Departments', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockSuperAdmin } as any)
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)
    })

    it('should display all departments including inactive ones', () => {
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockAllFaculties,
        isLoading: false
      } as any)

      render(<SuperAdminDashboard />)

      expect(screen.getByText('Computer Science')).toBeInTheDocument()
      expect(screen.getByText('Mathematics')).toBeInTheDocument()
      expect(screen.getByText('Engineering')).toBeInTheDocument()
      expect(screen.getByText('Arts')).toBeInTheDocument()
    })

    it('should display course counts for all departments', () => {
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockAllFaculties,
        isLoading: false
      } as any)

      render(<SuperAdminDashboard />)

      expect(screen.getByText('25')).toBeInTheDocument() // CS
      expect(screen.getByText('18')).toBeInTheDocument() // Math
      expect(screen.getByText('30')).toBeInTheDocument() // Engineering
      expect(screen.getByText('12')).toBeInTheDocument() // Arts
    })

    it('should display user counts for all departments', () => {
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockAllFaculties,
        isLoading: false
      } as any)

      render(<SuperAdminDashboard />)

      expect(screen.getByText('150')).toBeInTheDocument() // CS
      expect(screen.getByText('120')).toBeInTheDocument() // Math
      expect(screen.getByText('200')).toBeInTheDocument() // Engineering
      expect(screen.getByText('80')).toBeInTheDocument() // Arts
    })

    it('should show empty state when no departments', () => {
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: [],
        isLoading: false
      } as any)

      render(<SuperAdminDashboard />)

      expect(screen.getByText('No departments found')).toBeInTheDocument()
    })
  })

  describe('Platform Statistics', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockSuperAdmin } as any)
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockAllFaculties,
        isLoading: false
      } as any)
    })

    it('should display total active courses', () => {
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)

      render(<SuperAdminDashboard />)
      expect(screen.getByText('85')).toBeInTheDocument()
    })

    it('should calculate and display total departments', () => {
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)

      render(<SuperAdminDashboard />)
      expect(screen.getByText('12')).toBeInTheDocument()
    })

    it('should calculate enrollment rate', () => {
      const testAnalytics = {
        ...mockAnalytics,
        totalEnrollments: 5000
      }

      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: testAnalytics,
        isLoading: false
      } as any)

      render(<SuperAdminDashboard />)

      // 5000 enrollments / 1250 users ≈ 4.0 enrollments per user
      expect(screen.getByText('4.0')).toBeInTheDocument()
    })
  })

  describe('Differences from AdminDashboard', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockSuperAdmin } as any)
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockAllFaculties,
        isLoading: false
      } as any)
    })

    it('should not display quick action buttons', () => {
      render(<SuperAdminDashboard />)

      expect(screen.queryByText('Manage Users')).not.toBeInTheDocument()
      expect(screen.queryByText('Manage Courses')).not.toBeInTheDocument()
      expect(screen.queryByText('View Reports')).not.toBeInTheDocument()
    })

    it('should display platform-wide statistics instead of quick actions', () => {
      render(<SuperAdminDashboard />)

      expect(screen.getByText('Platform Statistics')).toBeInTheDocument()
    })

    it('should show all departments regardless of active status', () => {
      render(<SuperAdminDashboard />)

      // Arts department is inactive but should still be shown for super admin
      expect(screen.getByText('Arts')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockSuperAdmin } as any)
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

      render(<SuperAdminDashboard />)

      expect(screen.getAllByTestId('skeleton')).toHaveLength(4)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockSuperAdmin } as any)
    })

    it('should display error state if analytics fails', () => {
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch')
      } as any)
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: [],
        isLoading: false
      } as any)

      render(<SuperAdminDashboard />)

      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument()
    })

    it('should display partial content if only faculties fail', () => {
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch')
      } as any)

      render(<SuperAdminDashboard />)

      // Summary cards should still show
      expect(screen.getByText('1250')).toBeInTheDocument()
      // But faculties error should show
      expect(screen.getByText('No departments found')).toBeInTheDocument()
    })
  })

  describe('Data Transformation', () => {
    beforeEach(() => {
      vi.spyOn(authStore, 'useAuthStore').mockReturnValue({ user: mockSuperAdmin } as any)
      vi.spyOn(adminQueries, 'useAdminAnalytics').mockReturnValue({
        data: mockAnalytics,
        isLoading: false
      } as any)
    })

    it('should calculate total courses from faculty data', () => {
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockAllFaculties,
        isLoading: false
      } as any)

      render(<SuperAdminDashboard />)

      // 25 + 18 + 30 + 12 = 85
      expect(screen.getByText('85')).toBeInTheDocument()
    })

    it('should calculate total users from faculty data', () => {
      vi.spyOn(adminQueries, 'useAdminFaculties').mockReturnValue({
        data: mockAllFaculties,
        isLoading: false
      } as any)

      render(<SuperAdminDashboard />)

      // Total should be sum of all faculty users
      const totalExpected = 150 + 120 + 200 + 80
      expect(screen.getByText(totalExpected.toString())).toBeInTheDocument()
    })
  })
})
