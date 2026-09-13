"use client";

import dynamic from "next/dynamic";

const OrderReport = dynamic(
  () => import("@/pages/reports/orderReport"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function OrderReportClient(){
    return(
        <><OrderReport /></>
    )
}