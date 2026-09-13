'use client';

import KBar from '@/components/kbar';
import { PharmacyShell } from '@/features/layout/components/pharmacy/pharmacy-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { usePathname } from 'next/navigation';
import { useAnnouncementSocket } from '@/lib/announcements/queries/use-announcement-socket';
import { useDiscussionRealtime } from '@/lib/discussions/queries/use-discussion-realtime';
import { useProactiveSessionRefresh } from '@/lib/use-proactive-session-refresh';

import { InfobarProvider } from '@/features/ui/components/infobar';
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessagesRoute = pathname === '/dashboard/messages';
  const isAnnouncementsRoute = pathname?.startsWith('/dashboard/announcements');
  const isCourseDetailRoute = Boolean(pathname?.match(/^\/dashboard\/courses\/[^/]+$/));
  const isDeanUsersRoute =
    pathname === '/dashboard/dean/students' || pathname === '/dashboard/dean/lecturers';
  const isDeanClubsRoute = pathname === '/dashboard/dean/clubs';
  const isClubsDiscoverRoute = pathname === '/dashboard/clubs';
  const isClubDetailRoute = Boolean(pathname?.match(/^\/dashboard\/clubs\/[^/]+$/));
  const isClubManageRoute = Boolean(pathname?.match(/^\/dashboard\/clubs\/[^/]+\/manage$/));
  const isViewportFitRoute =
    isMessagesRoute ||
    isAnnouncementsRoute ||
    isCourseDetailRoute ||
    isDeanUsersRoute ||
    isDeanClubsRoute ||
    isClubsDiscoverRoute ||
    isClubDetailRoute ||
    isClubManageRoute;

  useAnnouncementSocket({ enabled: true, playSound: false });
  useDiscussionRealtime(true);
  useProactiveSessionRefresh(true);

  return (
    <KBar>
      <RoleGuard>
        <PharmacyShell>
          <main
            className={
              isMessagesRoute
                ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2 md:p-3'
                : isCourseDetailRoute
                    ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-4 md:px-5 md:pb-5 md:pt-5'
                    : isViewportFitRoute
                      ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4 md:p-5'
                      : 'min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-5'
            }
          >
            <InfobarProvider
              className={
                isViewportFitRoute && !isMessagesRoute
                  ? 'flex h-0 min-h-0 w-full min-w-0 flex-1 basis-0 flex-col overflow-hidden !min-h-0'
                  : isMessagesRoute
                    ? 'flex h-0 min-h-0 w-full min-w-0 flex-1 basis-0 flex-col overflow-hidden !min-h-0'
                    : 'min-w-0 w-full'
              }
            >
              {children}
            </InfobarProvider>
          </main>
        </PharmacyShell>
      </RoleGuard>
    </KBar>
  );
}

