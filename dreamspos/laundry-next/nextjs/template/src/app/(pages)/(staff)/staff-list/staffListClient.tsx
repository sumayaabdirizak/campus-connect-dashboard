"use client";

import dynamic from "next/dynamic";

const StaffListComponent = dynamic(
  () => import("@/pages/staff/staffList"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function StaffListClient(){
    return(
        <><StaffListComponent/></>
    )
}