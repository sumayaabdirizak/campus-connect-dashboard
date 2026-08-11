"use client";

import dynamic from "next/dynamic";

const SalesReport = dynamic(
  () => import("@/pages/reports/salesReport"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function SalesReportClient(){
    return(
        <><SalesReport /></>
    )
}