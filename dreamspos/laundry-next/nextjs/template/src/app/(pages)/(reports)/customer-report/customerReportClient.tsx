"use client";

import dynamic from "next/dynamic";

const CustomerReportComponents = dynamic(
  () => import("@/pages/reports/customer-report"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function CustomerReportClient(){
    return(
        <><CustomerReportComponents/></>
    )
}