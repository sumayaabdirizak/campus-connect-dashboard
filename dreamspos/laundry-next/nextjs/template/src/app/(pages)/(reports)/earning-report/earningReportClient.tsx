"use client";

import dynamic from "next/dynamic";

const EarningReportComponents = dynamic(
  () => import("@/pages/reports/earningReport"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function earningReportClient(){
    return(
        <><EarningReportComponents /></>
    )
}