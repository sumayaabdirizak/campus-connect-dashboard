'use client'

import { useAuthStore } from '@/lib/auth-store'
import { useAdminAnalytics, useAdminFaculties, useAdminAuditStats } from '@/lib/admin/queries'
import { DashboardHeader } from '../dashboards/components/dashboard-header'
import { SummaryCard } from '../dashboards/components/summary-card'
import { Card, CardContent } from '@/features/ui/components/card'
import { Button } from '@/features/ui/components/button'
import { Badge } from '@/features/ui/components/badge'
import { Skeleton } from '@/features/ui/components/skeleton'
import { Users, BookOpen, Building2, Activity, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export function AdminDashboard() {
  const user = useAuthStore((state) => state.user)
  const analyticsQuery = useAdminAnalytics({})
  const facultiesQuery = useAdminFaculties()
  const statsQuery = useAdminAuditStats()

  const analytics = analyticsQuery.data
  const faculties = facultiesQuery.data?.faculties || []
  const stats = statsQuery.data
  const isLoading = analyticsQuery.isLoading || facultiesQuery.isLoading || statsQuery.isLoading
  const hasError = analyticsQuery.error || facultiesQuery.error

  // Calculate stats from analytics
  const userCount = analytics?.summary?.totalUsers || 0
  const courseCount = analytics?.summary?.activeCourses || 0
  const departmentCount = faculties.length
  const activeToday = analytics?.summary?.activeToday || 0

  if (hasError) {
    return (
      <div className='rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center'>
        <AlertCircle className='mx-auto mb-4 h-12 w-12 text-destructive' />
        <p className='font-medium text-destructive'>Failed to load admin dashboard</p>
        <p className='mt-1 text-sm text-muted-foreground'>Please try refreshing</p>
      </div>
    )
  }

  return (
    <div className='space-y-8 pb-8'>
      {/* Header */}
      <DashboardHeader
        user={user}
        title='Admin Dashboard'
        subtitle='System overview and management'
      />

      {/* Summary Cards */}
      {isLoading ? (
        <div className='grid grid-cols-4 gap-4'>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className='h-24' />
          ))}
        </div>
      ) : (
        <div className='grid grid-cols-4 gap-4'>
          <SummaryCard
            icon={<Users className='h-6 w-6' />}
            title='Total Users'
            value={userCount}
            color='blue'
          />
          <SummaryCard
            icon={<BookOpen className='h-6 w-6' />}
            title='Active Courses'
            value={courseCount}
            color='green'
          />
          <SummaryCard
            icon={<Building2 className='h-6 w-6' />}
            title='Departments'
            value={departmentCount}
            color='purple'
          />
          <SummaryCard
            icon={<Activity className='h-6 w-6' />}
            title='Active Today'
            value={activeToday}
            color='orange'
          />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className='mb-4 text-2xl font-bold'>Quick Actions</h2>
        <div className='grid grid-cols-4 gap-4'>
          <ActionCard title='Manage Users' count={userCount} href='/dashboard/admin/users' />
          <ActionCard title='Manage Courses' count={courseCount} href='/dashboard/admin/courses' />
          <ActionCard title='Manage Departments' count={departmentCount} href='/dashboard/admin/departments' />
          <ActionCard title='View Reports' count={analytics?.summary?.totalReports || 0} href='/dashboard/admin/reports' />
        </div>
      </div>

      {/* Departments Overview */}
      {!isLoading && faculties.length > 0 && (
        <div>
          <h2 className='mb-4 text-2xl font-bold'>Department Overview</h2>
          <div className='grid grid-cols-2 gap-4'>
            {faculties.slice(0, 6).map((dept: any) => (
              <Card key={dept.id} className='transition-colors hover:bg-accent'>
                <CardContent className='flex items-center justify-between p-4'>
                  <div>
                    <p className='font-medium'>{dept.name}</p>
                    <p className='text-sm text-muted-foreground'>
                      {dept._count?.courses || 0} courses • {dept._count?.users || 0} members
                    </p>
                  </div>
                  <Badge variant='outline'>Active</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ActionCard({ title, count, href }: { title: string; count: number; href: string }) {
  return (
    <Link href={href}>
      <Card className='transition-colors hover:bg-accent'>
        <CardContent className='p-4'>
          <p className='text-sm text-muted-foreground'>{title}</p>
          <p className='text-3xl font-bold'>{count}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

export default AdminDashboard
