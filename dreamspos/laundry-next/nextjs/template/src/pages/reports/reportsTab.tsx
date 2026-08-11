

import Link from "next/link";
import { all_routes } from "../../routes/all_routes";
import { usePathname } from "next/navigation";

const ReportsNavTabs: React.FC = () => {
  const reportTabs = [
    { path: all_routes.earningReport, label: "Earning Report", icon: "icon-dollar-sign" },
    { path: all_routes.orderReport, label: "Order Report", icon: "icon-shopping-bag" },
    { path: all_routes.salesReport, label: "Sales Report", icon: "icon-chart-bar-big" },
    { path: all_routes.customerReport, label: "Customer Report", icon: "icon-user" },
  ];

  const pathname = usePathname();

  return (
    <ul className="nav nav-tabs nav-bordered border-0 report-tabs mb-4">
      {reportTabs.map((tab, index) => (
        <li className="nav-item" key={index}>
          <Link
          href={tab.path}
               className={`nav-link ${pathname === tab.path ? "active" : ""}`}
          >
            <span className="d-flex align-items-center">
              <i className={`${tab.icon} me-1`} />
              {tab.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default ReportsNavTabs;
