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
  const isFixedScrollShell = isChatRoute || isAnnouncementsRoute;

  useAnnouncementSocket({ enabled: true, playSound: false });

  return (
    <KBar>
      <RoleGuard>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset className={isFixedScrollShell ? 'h-dvh max-h-dvh min-h-0 overflow-hidden' : undefined}>
            <Header />
            <main
              className={
                isChatRoute
                  ? 'flex min-h-0 flex-1 overflow-hidden p-2 md:p-3'
                  : isAnnouncementsRoute
                    ? 'flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6'
                    : 'overflow-auto p-4 md:p-6'
              }
            >
              <InfobarProvider
                className={isAnnouncementsRoute ? 'flex h-full min-h-0 flex-1 flex-col' : undefined}
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
