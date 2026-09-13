"use client";
import React, { useCallback, useEffect, useRef } from "react";
import { all_routes } from "../../routes/all_routes";
import ImageWithBasePath from "../image-with-base-path";
import { sidebarItems, type SidebarItem } from "./sidebarData";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface SidebarProps {
  isCollapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = () => {
  const location = usePathname();

  // Memoize the isActive function to prevent unnecessary recalculations
  const isActive = useCallback((path: string, relatives?: string[]) => {
    const current = location || '';
    if (current === path || current.startsWith(`${path}/`)) return true;
    return relatives?.some((r) => current === r || current.startsWith(`${r}/`)) || false;
  }, [location]);



  return (
    <div className="sidebar">
      <div className="twocol-mini">
        {/* Logo */}
        <Link 
          href={all_routes.dashboard} 
          className="logo-small"
          aria-label="Dashboard"
        >
          <ImageWithBasePath 
            src="assets/img/logo-small.svg" 
            alt="Logo" 
          />
        </Link>

        <div className="sidebar-left">
          <div 
            
            className="nav flex-column align-items-center sidebar-nav simplebar-scrollable-y"
            data-simplebar="init"
            aria-label="Main navigation"
          >
            <div className="simplebar-wrapper" style={{ margin: 0 }}>
              <div className="simplebar-height-auto-observer-wrapper">
                <div className="simplebar-height-auto-observer"></div>
              </div>
              <div className="simplebar-mask">
                <div className="simplebar-offset" style={{ right: 0, bottom: 0 }}>
                  <div 
                    className="simplebar-content-wrapper" 
                    tabIndex={0} 
                    role="region" 
                    aria-label="scrollable content"
                    style={{ height: '100%', overflow: 'hidden scroll' }}
                  >
                    <div className="simplebar-content" style={{ padding: 0 }}>
                      {sidebarItems.map((item: SidebarItem) => {
                        const isItemActive = isActive(item.link, item.relativeLinks);
                        const isSettings = item.link === all_routes.storeSettings;
                        
                        return (
                          <Link
                            key={item.link}
                            href={item.link}
                            className={`nav-link ${isItemActive ? "active" : ""} ${
                              isSettings ? "d-md-none d-lg-none" : ""
                            }`}
                            aria-current={isItemActive ? "page" : undefined}
                          >
                            <i className={item.icon}></i>
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="simplebar-placeholder" style={{ width: '52px', height: '477px' }}></div>
            </div>
            <div className="simplebar-track simplebar-horizontal" style={{ visibility: 'hidden' }}>
              <div className="simplebar-scrollbar" style={{ width: 0, display: 'none' }}></div>
            </div>
            <div className="simplebar-track simplebar-vertical" style={{ visibility: 'visible' }}>
              <div className="simplebar-scrollbar" style={{ height: '175px', display: 'block', transform: 'translate3d(0px, 0px, 0px)' }}></div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <Link 
          href={all_routes.login} 
          className="sidebar-log-out"
          aria-label="Sign out"
          title="Sign out"
        >
          <i className="icon-log-out"></i>
        </Link>
      </div>
    </div>
  );
};

export default React.memo(Sidebar);
