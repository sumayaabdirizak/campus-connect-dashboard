'use client';

import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { RoleGuard } from '@/components/auth/role-guard';
import { usePathname } from 'next/navigation';
import { useAnnouncementSocket } from '@/features/announcements/api/use-announcement-socket';

import { InfobarProvider } from '@/components/ui/infobar';
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatRoute = pathname?.startsWith('/dashboard/chat');
  const isAnnouncementsRoute = pathname?.startsWith('/dashboard/announcements');
  const isCourseDetailRoute = Boolean(pathname?.match(/^\/dashboard\/courses\/[^/]+$/));
  const isAuditLogsRoute = pathname === '/dashboard/audit-logs';
  const isDeanUsersRoute = pathname === '/dashboard/dean/users';
  const isViewportFitRoute =
    isChatRoute ||
    isAnnouncementsRoute ||
    isCourseDetailRoute ||
    isAuditLogsRoute ||
    isDeanUsersRoute;

  useAnnouncementSocket({ enabled: true, playSound: false });

  return (
    <KBar>
      <RoleGuard>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset
            className={
              isViewportFitRoute
                ? 'h-dvh max-h-dvh min-h-0 min-w-0 overflow-hidden'
                : 'min-w-0'
            }
          >
            <Header />
            <main
              className={
                isChatRoute
                  ? 'flex min-h-0 min-w-0 flex-1 overflow-hidden p-2 md:p-3'
                  : isAuditLogsRoute
                    ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-1 md:p-1.5'
                  : isViewportFitRoute
                    ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4 md:p-6'
                    : 'min-w-0 overflow-x-hidden overflow-y-auto p-4 md:p-6'
              }
            >
              <InfobarProvider
                className={
                  isAuditLogsRoute
                    ? 'flex h-full min-h-0 w-full flex-col overflow-hidden !min-h-0'
                    : isViewportFitRoute && !isChatRoute
                      ? 'flex h-0 min-h-0 w-full flex-1 basis-0 flex-col overflow-hidden !min-h-0'
                      : undefined
                }
              >
                {children}
              </InfobarProvider>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </RoleGuard>
    </KBar>
  );
}
