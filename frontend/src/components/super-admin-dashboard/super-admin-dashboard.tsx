'use client'

import { useAuthStore } from '@/lib/auth-store'
import { useAdminAnalytics, useAdminFaculties } from '@/lib/admin/queries'
import { DashboardHeader } from '../dashboards/components/dashboard-header'
import { SummaryCard } from '../dashboards/components/summary-card'
import { Card, CardContent } from '@/features/ui/components/card'
import { Badge } from '@/features/ui/components/badge'
import { Skeleton } from '@/features/ui/components/skeleton'
import { Globe, TrendingUp, Users, AlertTriangle, AlertCircle } from 'lucide-react'

export function SuperAdminDashboard() {
  const user = useAuthStore((state) => state.user)
  const analyticsQuery = useAdminAnalytics({})
  const facultiesQuery = useAdminFaculties()

  const analytics = analyticsQuery.data
  const faculties = facultiesQuery.data?.results || []
  const isLoading = analyticsQuery.isLoading || facultiesQuery.isLoading
  const hasError = analyticsQuery.error || facultiesQuery.error

  // Platform-wide metrics
  const totalUsers = analytics?.kpis?.totalUsers || 0
  const activeMonth = analytics?.kpis?.activeUsersThisMonth || 0
  const adminCount = faculties.length || 0
  const alertCount = 0 // Placeholder

  if (hasError) {
    return (
      <div className='rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center'>
        <AlertCircle className='mx-auto mb-4 h-12 w-12 text-destructive' />
        <p className='font-medium text-destructive'>Failed to load platform dashboard</p>
        <p className='mt-1 text-sm text-muted-foreground'>Please try refreshing</p>
      </div>
    )
  }

  return (
    <div className='space-y-8 pb-8'>
      {/* Header */}
      <DashboardHeader
        user={user}
        title='Platform Dashboard'
        subtitle='System-wide overview and management'
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
            icon={<Globe className='h-6 w-6' />}
            title='Total Users'
            value={totalUsers}
            color='blue'
          />
          <SummaryCard
            icon={<TrendingUp className='h-6 w-6' />}
            title='Active This Month'
            value={activeMonth}
            color='green'
          />
          <SummaryCard
            icon={<Users className='h-6 w-6' />}
            title='Admins'
            value={adminCount}
            color='purple'
          />
          <SummaryCard
            icon={<AlertTriangle className='h-6 w-6' />}
            title='System Alerts'
            value={alertCount}
            color='orange'
          />
        </div>
      )}

      {/* Department Overview */}
      {!isLoading && faculties.length > 0 && (
        <div>
          <h2 className='mb-4 text-2xl font-bold'>Department Overview</h2>
          <div className='space-y-2'>
            {faculties.map((dept: any) => (
              <Card key={dept.id} className='transition-colors hover:bg-accent'>
                <CardContent className='flex items-center justify-between p-4'>
                  <div>
                    <p className='font-medium'>{dept.name}</p>
                    <p className='text-sm text-muted-foreground'>
                      {dept._count?.courses || 0} courses • {dept._count?.users || 0} users
                    </p>
                  </div>
                  <Badge variant='outline'>Active</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Platform Statistics */}
      <div>
        <h2 className='mb-4 text-2xl font-bold'>Platform Statistics</h2>
        <div className='grid grid-cols-3 gap-4'>
          <Card>
            <CardContent className='p-4'>
              <p className='text-sm text-muted-foreground'>Departments</p>
              <p className='text-3xl font-bold'>{faculties.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <p className='text-sm text-muted-foreground'>Total Courses</p>
              <p className='text-3xl font-bold'>{analytics?.kpis?.totalCourses || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <p className='text-sm text-muted-foreground'>Completion Rate</p>
              <p className='text-3xl font-bold'>
                {analytics?.kpis?.completionRate ? `${Math.round(analytics.kpis.completionRate)}%` : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default SuperAdminDashboard
