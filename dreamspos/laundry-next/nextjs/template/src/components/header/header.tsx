"use client";
import React, { useEffect } from "react";
import { all_routes } from "../../routes/all_routes";
import ImageWithBasePath from "../image-with-base-path";
import { useTheme } from "../../core/context/ThemeContext";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface HeaderProps {
  title?: string;
  ordersCount?: number;
  showOrdersButton?: boolean;
  onMobileToggle?: () => void; // callback for mobile sidebar
}

const Header: React.FC<HeaderProps> = ({
  title = "Dashboard",
  ordersCount = 0,
  showOrdersButton = true,
  onMobileToggle,
}) => {
  const { state: themeState, updateTheme } = useTheme();
  const theme = themeState.theme;
  
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    updateTheme({ theme: newTheme });
  };

  const location = usePathname();

  const closeMenu = () => {
    document.documentElement.classList.remove("menu-opened");

    const mainWrapper = document.querySelector(".main-wrapper");
    mainWrapper?.classList.remove("slide-nav");

    const overlay = document.querySelector(".sidebar-overlay") as HTMLElement;
    overlay?.classList.remove("opened");
  };

  // Create overlay once
  useEffect(() => {
    let overlay = document.querySelector(".sidebar-overlay") as HTMLElement;

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "sidebar-overlay";
      document.body.appendChild(overlay);
    }

    overlay.addEventListener("click", closeMenu);

    return () => overlay.removeEventListener("click", closeMenu);
  }, []);

  const handleMobileToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    const html = document.documentElement;
    const mainWrapper = document.querySelector(".main-wrapper");
    const overlay = document.querySelector(".sidebar-overlay") as HTMLElement;

    html.classList.toggle("menu-opened");
    mainWrapper?.classList.toggle("slide-nav");
    overlay?.classList.toggle("opened");

    onMobileToggle?.();
  };

  useEffect(() => {
    closeMenu();
  }, [location]);

  useEffect(() => {
    const handleBodyClick = (e: MouseEvent) => {
      if (!document.documentElement.classList.contains("menu-opened")) return;

      const sidebar = document.querySelector(".sidebar");
      const mobileBtn = document.getElementById("mobile_btn");

      if (
        sidebar?.contains(e.target as Node) ||
        mobileBtn?.contains(e.target as Node)
      ) {
        return;
      }

      closeMenu();
    };

    document.addEventListener("click", handleBodyClick);
    return () => document.removeEventListener("click", handleBodyClick);
  }, []);

  return (
    <header className="navbar-header">
      <div className="topbar-menu">
        <div className="d-flex align-items-center gap-2">
          {/* Logo */}
          <Link href={all_routes.dashboard} className="logo">
            <span className="logo-light">
              <span className="logo-lg">
                <ImageWithBasePath src="assets/img/logo.svg" alt="logo" />
              </span>
              <span className="logo-sm">
                <ImageWithBasePath src="assets/img/logo-small.svg" alt="small logo" />
              </span>
            </span>
            <span className="logo-dark">
              <span className="logo-lg">
                <ImageWithBasePath src="assets/img/logo-white.svg" alt="dark logo" />
              </span>
            </span>
          </Link>

          {/* Page Title */}
          <div className="d-flex">
            <h3 className="mb-0">{title}</h3>
          </div>

          {/* Orders Button */}
          {showOrdersButton && (
            <div className="d-none d-lg-flex">
              <Link href={all_routes.orders} className="btn btn-num-orders">
                <i className="icon-shopping-cart me-2" />
                <span>No of Orders : {ordersCount}</span>
              </Link>
            </div>
          )}
        </div>

        <div className="d-flex align-items-center header-list">
          {/* Upgrade Button */}
          <div className="header-item d-none d-md-flex">
            <Link
              href="#"
              className="btn btn-sm btn-primary-gradient d-inline-flex align-items-center"
            >
              <i className="icon-crown me-1" />
              Upgrade
            </Link>
          </div>

          {/* Avatar List */}
          <div className="avatar-list-stacked avatar-group-sm d-none d-md-flex">
            <span className="avatar avatar-rounded">
              <ImageWithBasePath
                className="border border-white"
                src="assets/img/profiles/avatar-01.jpg"
                alt="user"
              />
            </span>
            <span className="avatar avatar-rounded">
              <ImageWithBasePath
                className="border border-white"
                src="assets/img/profiles/avatar-02.jpg"
                alt="user"
              />
            </span>
            <Link className="avatar bg-white avatar-rounded text-dark fs-16" href="#">
              +
            </Link>
          </div>

          {/* Notification Button */}
          <div className="header-item d-none d-md-flex">
            <div className="dropdown dropend">
              <Link
                href="#"
                className="topbar-link btn btn-icon"
                data-bs-toggle="dropdown"
                data-bs-auto-close="outside"
              >
                <i className="icon-bell fs-16" />
                <span className="position-absolute report-badge bg-success" />
              </Link>
              <div className="dropdown-menu dropdown-menu-xl notification-dropdown">
                <div className="d-flex align-items-center justify-content-between notification-header">
                  <h5 className="mb-0">Notifications</h5>
                  <Link href="#" className="link-primary">
                    Mark all as unread
                  </Link>
                </div>
                <div className="notification-body" data-simplebar="">
                  <div className="tab-pane fade show active" id="all-notification">
                    <div className="notification-list">
                      <h6 className="fs-14 fw-semibold mb-3">Today</h6>
                      {/* Item*/}
                      <div className="notification-item">
                        <div className="d-flex">
                          <div className="me-2 avatar avatar-rounded flex-shrink-0 badge-soft-purple border border-purple">
                            <i className="icon-shopping-cart" />
                          </div>
                          <div className="flex-grow-1">
                            <p className="mb-1">
                              New laundry order from
                              <span className="text-dark fw-medium"> David Belcher</span>{" "}
                              (5 items) pending.
                            </p>
                            <p className="fs-13 mb-0 d-inline-flex align-items-center">
                              <i className="icon-clock me-1" />
                              20 Min Ago
                            </p>
                            <div className="d-flex align-items-center gap-2 mt-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-primary rounded"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-white rounded"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Item*/}
                      <div className="notification-item">
                        <div className="d-flex">
                          <div className="me-2 avatar avatar-rounded flex-shrink-0 badge-soft-orange border border-orange">
                            <i className="icon-shopping-basket" />
                          </div>
                          <div className="flex-grow-1">
                            <p className="mb-1">
                              <span className="text-dark fw-medium">Order #568</span>{" "}
                              washing completed and moved to drying.
                            </p>
                            <p className="fs-13 mb-0 d-inline-flex align-items-center">
                              <i className="icon-clock me-1" />
                              35 Min Ago
                            </p>
                          </div>
                        </div>
                        <div className="notification-action">
                          <Link
                            href="#"
                            className="notification-read rounded-circle bg-success"
                            data-bs-toggle="tooltip"
                            title=""
                            data-bs-original-title="Make as Read"
                            aria-label="Make as Read"
                          />
                        </div>
                      </div>
                      {/* Item*/}
                      <div className="notification-item">
                        <div className="d-flex">
                          <div className="me-2 avatar avatar-rounded flex-shrink-0 badge-soft-primary border border-primary text-primary">
                            <i className="icon-badge-dollar-sign" />
                          </div>
                          <div className="flex-grow-1">
                            <p className="mb-1">
                              <span className="text-dark fw-medium">₹1,200</span> received
                              via UPI for Order
                              <span className="text-dark fw-medium"> #566</span>.
                            </p>
                            <p className="fs-13 mb-0 d-inline-flex align-items-center">
                              <i className="icon-clock me-1" />
                              40 Min Ago
                            </p>
                          </div>
                        </div>
                        <div className="notification-action">
                          <Link
                            href="#"
                            className="notification-read rounded-circle bg-success"
                            data-bs-toggle="tooltip"
                            title=""
                            data-bs-original-title="Make as Read"
                            aria-label="Make as Read"
                          />
                        </div>
                      </div>
                      {/* Item*/}
                      <div className="notification-item">
                        <div className="d-flex">
                          <div className="me-2 avatar avatar-rounded flex-shrink-0 badge-soft-pink border border-pink">
                            <i className="icon-baggage-claim" />
                          </div>
                          <div className="flex-grow-1">
                            <p className="mb-1">
                              <span className="text-dark fw-medium">Order #562</span>{" "}
                              ready for delivery
                            </p>
                            <p className="fs-13 mb-0 d-inline-flex align-items-center">
                              <i className="icon-clock me-1" />
                              45 Min Ago
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="notification-list">
                      <h6 className="fs-14 fw-semibold mb-3">Yesterday</h6>
                      {/* Item*/}
                      <div className="notification-item">
                        <div className="d-flex">
                          <div className="me-2 avatar avatar-rounded flex-shrink-0 badge-soft-success border border-success text-success">
                            <i className="icon-shopping-bag" />
                          </div>
                          <div className="flex-grow-1">
                            <p className="mb-1">
                              <span className="text-dark fw-medium">Order #560</span>{" "}
                              delivered successfully to customer.
                            </p>
                            <p className="fs-13 mb-0 d-inline-flex align-items-center">
                              <i className="icon-clock me-1" />1 Day Ago
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* Item*/}
                      <div className="notification-item">
                        <div className="d-flex">
                          <div className="me-2 avatar avatar-rounded flex-shrink-0 badge-soft-indigo border border-indigo text-indigo">
                            <i className="icon-inbox" />
                          </div>
                          <div className="flex-grow-1">
                            <p className="mb-1">
                              <span className="text-dark fw-medium">Order #562</span>{" "}
                              ironing completed and ready for packing.
                            </p>
                            <p className="fs-13 mb-0 d-inline-flex align-items-center">
                              <i className="icon-clock me-1" />1 Day Ago
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Settings */}
          <div className="header-item d-none d-md-flex">
            <Link
              href={all_routes.storeSettings}
              className="topbar-link btn btn-icon"
              aria-label="settings"
            >
              <i className="icon-settings fs-16" />
            </Link>
          </div>

          {/* Light/Dark Mode */}
          <div className="header-item">
            <button
              type="button"
              className={`topbar-link btn ${theme === "dark" ? "active" : ""}`}
              onClick={toggleTheme}
            >
              <i className={`icon-${theme === "dark" ? "sun" : "moon"} fs-16`}></i>
            </button>
          </div>

          {/* User Dropdown */}
          <div className="dropdown profile-dropdown d-flex align-items-center justify-content-center">
            <Link
              className="topbar-link avatar avatar-sm dropdown-toggle drop-arrow-none"
              href="#"
              data-bs-toggle="dropdown"
              data-bs-offset="0,22"
              aria-haspopup="false"
              aria-expanded="false"
            >
              <ImageWithBasePath
                src="assets/img/profiles/avatar-01.jpg"
                className="rounded-circle d-flex"
                alt="user-image"
              />
            </Link>
            <div className="dropdown-menu dropdown-menu-end dropdown-menu-md p-3">
              <div className="d-flex align-items-center justify-content-between bg-light rounded mb-3 p-3">
                <div className="d-flex align-items-center">
                  <span className="avatar avatar-sm flex-shrink-0">
                    <ImageWithBasePath
                      src="assets/img/profiles/avatar-01.jpg"
                      className="rounded-circle"
                      alt="user"
                    />
                  </span>
                  <div className="ms-2">
                    <h5 className="mb-1 fs-14">Shaun Farley</h5>
                    <span className="d-block fs-13">Manager</span>
                  </div>
                </div>
              </div>
              <Link href={all_routes.login} className="dropdown-item">
                <i className="ti ti-logout me-1 fs-17 align-middle text-danger" />
                <span className="align-middle text-danger">Sign Out</span>
              </Link>
            </div>
          </div>

          {/* Mobile Sidebar Button */}
          <button
            id="mobile_btn"
            className="mobile-btn d-lg-none"
            type="button"
            onClick={handleMobileToggle}
          >
            <i className="icon-menu" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
