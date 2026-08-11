"use client";
import { all_routes } from "../../routes/all_routes";

const route = all_routes;
export interface SidebarItem {
  link: string;
  label: string;
  icon: string;
  relativeLinks?: string[];
}

export const sidebarItems: SidebarItem[] = [
  { link: route.dashboard, label: "Dashboard", icon: "icon-layout-dashboard", relativeLinks: [] },
  { link: route.posCreate, label: "POS", icon: "icon-monitor-smartphone", relativeLinks: [route.pos] },
  { link: route.orders, label: "Orders", icon: "icon-shopping-cart", relativeLinks: [] },
  { link: route.products, label: "Products", icon: "icon-package-2", relativeLinks: [route.services, route.category, route.addons] },
  { link: route.invoices, label: "Invoices", icon: "icon-badge-dollar-sign", relativeLinks: [] },
  { link: route.customers, label: "Customers", icon: "icon-user", relativeLinks: [route.customersGrid] },
  { link: route.driversList, label: "Drivers", icon: "icon-bike", relativeLinks: [route.driversGrid] },
  { link: route.staffList, label: "Staff", icon: "icon-users-round", relativeLinks: [route.staffGrid]},
  { link: route.earningReport, label: "Reports", icon: "icon-chart-bar-big", relativeLinks: [route.salesReport, route.orderReport, route.customerReport]},
  { link: route.storeSettings, label: "Settings", icon: "icon-settings", relativeLinks: [route.taxSettings, route.printSettings, route.paymentSettings, route.deliverySettings, route.rolesPermissions, route.permissionsSettings, route.notificationsSettings, route.integrationsSettings]}
];
