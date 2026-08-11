"use client";

import dynamic from "next/dynamic";

const StaffGridComponent = dynamic(
  () => import("@/pages/staff/staffGrid"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function StaffGridClient(){
    return(
        <><StaffGridComponent/></>
    )
}