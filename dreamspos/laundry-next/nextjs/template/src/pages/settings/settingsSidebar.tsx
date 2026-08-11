import Link from "next/link";
import { all_routes } from "../../routes/all_routes";
import { usePathname } from "next/navigation";

const SettingsSidebar: React.FC = () => {
  const menuItems = [
    { path: all_routes.storeSettings, label: "Store Settings", icon: "icon-warehouse" },
    { path: all_routes.taxSettings, label: "Tax", icon: "icon-diamond-percent" },
    { path: all_routes.printSettings, label: "Print", icon: "icon-printer" },
    { path: all_routes.paymentSettings, label: "Payment Types", icon: "icon-circle-dollar-sign" },
    { path: all_routes.deliverySettings, label: "Delivery", icon: "icon-bike" },
    { path: all_routes.permissionsSettings, label: "Roles & Permissions", icon: "icon-user-cog" },
    { path: all_routes.notificationsSettings, label: "Notifications", icon: "icon-bell" },
    { path: all_routes.integrationsSettings, label: "Integrations / API", icon: "icon-pin", isLast: true }
  ];

    const pathname = usePathname();

  return (
    <div className="settings-sidebar d-flex align-items-start">
      <ul className="nav flex-column nav-pills w-100">
        {menuItems.map((item, index) => (
          <li key={index}>
            <Link
              href={item.path}
               className={`nav-link ${pathname === item.path ? "active" : ""}`}
            >
              <i className={`${item.icon} me-2`} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SettingsSidebar;
