'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar';
import { navGroups } from '@/config/nav-config';
import { useFilteredNavGroups } from '@/hooks/use-nav';

interface AppSidebarNavProps {
  unreadCount: number;
}

function isRouteActive(pathname: string, url: string): boolean {
  if (url === '/dashboard') return pathname === url;
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function AppSidebarNav({ unreadCount }: AppSidebarNavProps) {
  const pathname = usePathname();
  const filteredGroups = useFilteredNavGroups(navGroups);

  return (
    <nav aria-label='Dashboard navigation'>
      {filteredGroups.map((group) => (
        <SidebarGroup
          key={group.label || 'ungrouped'}
          className='px-2 py-1 group-data-[collapsible=icon]:px-0'
        >
          {group.label && (
            <SidebarGroupLabel className='mt-2 mb-1 h-6 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/45'>
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarMenu className='gap-1'>
            {group.items.map((item) => {
              const Icon = item.icon ? Icons[item.icon] : Icons.logo;
              const hasChildren = Boolean(item.items?.length);
              const childIsActive = item.items?.some((child) => isRouteActive(pathname, child.url));
              const itemIsActive = isRouteActive(pathname, item.url) || Boolean(childIsActive);

              if (hasChildren) {
                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={itemIsActive || item.isActive}
                    className='group/collapsible'
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={itemIsActive}
                          aria-label={`${item.title} menu`}
                          className='group/nav-button h-10 gap-2.5 rounded-xl border border-transparent px-2.5 font-medium text-sidebar-foreground/75 hover:border-sidebar-border/70 hover:bg-sidebar-accent/70 data-[active=true]:border-primary/15 data-[active=true]:bg-primary/10 data-[active=true]:text-primary group-data-[collapsible=icon]:justify-center'
                        >
                          <span className='flex size-7 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/55 transition-colors group-data-[active=true]/nav-button:bg-primary group-data-[active=true]/nav-button:text-primary-foreground'>
                            <Icon className='size-4' aria-hidden='true' />
                          </span>
                          <span>{item.title}</span>
                          <Icons.chevronRight
                            className='ml-auto size-4 text-sidebar-foreground/45 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90'
                            aria-hidden='true'
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className='my-1 ml-[1.35rem] gap-0.5 border-sidebar-border/70 py-1 pl-4'>
                          {item.items?.map((subItem) => {
                            const subItemIsActive = isRouteActive(pathname, subItem.url);
                            return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={subItemIsActive}
                                  className='relative h-8 rounded-lg px-2.5 text-[13px] text-sidebar-foreground/65 hover:bg-transparent hover:text-primary data-[active=true]:bg-transparent data-[active=true]:font-semibold data-[active=true]:text-primary before:absolute before:-left-[1.19rem] before:size-1.5 before:rounded-full before:bg-sidebar-border data-[active=true]:before:bg-primary'
                                >
                                  <Link href={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              }

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={itemIsActive}
                    className='group/nav-button h-10 gap-2.5 rounded-xl border border-transparent px-2.5 font-medium text-sidebar-foreground/75 hover:border-sidebar-border/70 hover:bg-sidebar-accent/70 data-[active=true]:border-primary/15 data-[active=true]:bg-primary/10 data-[active=true]:text-primary group-data-[collapsible=icon]:justify-center'
                  >
                    <Link href={item.url}>
                      <span className='flex size-7 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/55 transition-colors group-data-[active=true]/nav-button:bg-primary group-data-[active=true]/nav-button:text-primary-foreground'>
                        <Icon className='size-4' aria-hidden='true' />
                      </span>
                      <span>{item.title}</span>
                      {item.url === '/dashboard/announcements' && unreadCount > 0 && (
                        <span className='ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-5 text-destructive-foreground group-data-[collapsible=icon]:hidden'>
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
    </nav>
  );
}
