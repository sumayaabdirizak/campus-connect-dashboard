"use client";

import dynamic from "next/dynamic";

const DashboardComponent = dynamic(
  () => import("@/pages/dashboard/dashboard"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function DashboardClient() {
  return (
    <>
      <DashboardComponent />
    </>
  );
}
