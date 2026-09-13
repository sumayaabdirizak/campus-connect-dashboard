"use client";

import dynamic from "next/dynamic";

const PosCreateComponent = dynamic(
  () => import("@/pages/pos/posCreate"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function DashboardClient(){
    return(
        <><PosCreateComponent/></>
    )
}