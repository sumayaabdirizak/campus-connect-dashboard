
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { all_routes } from "../../routes/all_routes";

const ProductsNavTabs: React.FC = () => {
  const reportTabs = [
    { path: all_routes.products, label: "Products", icon: "icon-box" },
    { path: all_routes.services, label: "Services", icon: "icon-sparkles" },
    { path: all_routes.category, label: "Categories", icon: "icon-circle-check-big" },
    { path: all_routes.addons, label: "Add Ons", icon: "icon-washing-machine" },
  ];

  const pathname = usePathname();

  return (
    <ul className="nav nav-tabs nav-tab-solid nav-solid-dark nav-tabs-rounded gap-2 mb-4">
      {reportTabs.map((tab, index) => (
        <li className="nav-item" key={index}>
          <Link
            href={tab.path}
            className={`nav-link ${pathname === tab.path ? "active" : ""}`}
          >
            <span className="d-flex align-items-center">
              <i className={`${tab.icon} me-2`} />
              {tab.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default ProductsNavTabs;
