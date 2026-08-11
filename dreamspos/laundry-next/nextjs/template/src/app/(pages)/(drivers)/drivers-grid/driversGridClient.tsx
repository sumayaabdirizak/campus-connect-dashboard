"use client";

import dynamic from "next/dynamic";

const DriversGridComponent = dynamic(
  () => import("@/pages/drivers/driversGrid"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function DriversGridClient(){
    return(
        <><DriversGridComponent/></>
    )
}