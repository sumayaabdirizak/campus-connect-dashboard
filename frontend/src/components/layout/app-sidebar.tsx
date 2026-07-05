'use client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail
} from '@/components/ui/sidebar';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { navGroups } from '@/config/nav-config';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useAuthStore } from '@/lib/auth-store';
import { confirmLogout, showToast } from '@/lib/notifications';
import { useFilteredNavGroups } from '@/hooks/use-nav';
import { useAnnouncementUnreadCount } from '@/features/announcements/api/queries';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { Icons } from '../icons';

export default function AppSidebar() {
  const pathname = usePathname();
  const { isOpen } = useMediaQuery();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const filteredGroups = useFilteredNavGroups(navGroups);
  const { data: unreadData } = useAnnouncementUnreadCount();
  const unreadCount = unreadData?.unreadCount ?? 0;

  React.useEffect(() => {
    // Side effects based on sidebar state changes
  }, [isOpen]);

  const handleLogout = async () => {
    if (!(await confirmLogout())) return;
    logout();
    showToast('success', 'Signed out successfully');
    router.push('/auth/sign-in');
  };

  return (
    <Sidebar collapsible='icon' data-sidebar='root'>
      <SidebarHeader className='border-b border-sidebar-border/60 group-data-[collapsible=icon]:pt-4'>
        <div className='flex items-center gap-3 px-2 py-2'>
          <div className='flex aspect-square size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm'>
            <Icons.logo className='size-4' />
          </div>
          <div className='grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden'>
            <span className='truncate text-sm font-semibold'>Campus Connect</span>
            <span className='truncate text-[11px] text-muted-foreground'>Academic Platform</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className='overflow-x-hidden'>
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label || 'ungrouped'} className='py-0'>
            {group.label && (
              <SidebarGroupLabel className='mt-2 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/50'>
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon =
                  item.icon && Icons[item.icon as keyof typeof Icons]
                    ? Icons[item.icon as keyof typeof Icons]
                    : Icons.logo;
                const SafeIcon = Icon || Icons.logo;

                return item?.items && item?.items?.length > 0 ? (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={item.isActive}
                    className='group/collapsible'
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title} isActive={pathname === item.url}>
                          {item.icon && <SafeIcon />}
                          <span>{item.title}</span>
                          <Icons.chevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={pathname === item.url}
                    >
                      <Link href={item.url}>
                        <SafeIcon />
                        <span>{item.title}</span>
                        {item.url === '/dashboard/announcements' && unreadCount > 0 && (
                          <span className='ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-5 text-white'>
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className='border-t border-sidebar-border/60'>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size='lg'
                  className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                >
                  {user && (
                    <UserAvatarProfile className='h-8 w-8 rounded-lg' showInfo user={user} />
                  )}
                  {Icons.chevronsDown || Icons.chevronDown
                    ? React.createElement(Icons.chevronsDown || Icons.chevronDown, {
                        className: 'ml-auto size-4'
                      })
                    : null}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                side='bottom'
                align='end'
                sideOffset={4}
              >
                <DropdownMenuLabel className='p-0 font-normal'>
                  <div className='px-1 py-1.5'>
                    {user && (
                      <UserAvatarProfile className='h-8 w-8 rounded-lg' showInfo user={user} />
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                    {Icons.account && <Icons.account className='mr-2 h-4 w-4' />}
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/notifications')}>
                    {Icons.notification && <Icons.notification className='mr-2 h-4 w-4' />}
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  {Icons.logout && <Icons.logout className='mr-2 h-4 w-4' />}
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
