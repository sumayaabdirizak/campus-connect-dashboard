import { getPageMetadata } from "@/config/metadata";
import DashboardClient from "./dashboardClient";

// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Dashboard');
};

export default function Dashboard() {
  return <DashboardClient />;
}