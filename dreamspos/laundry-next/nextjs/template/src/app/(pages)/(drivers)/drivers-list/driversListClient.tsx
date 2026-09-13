"use client";

import dynamic from "next/dynamic";

const DriversListComponent = dynamic(
  () => import("@/pages/drivers/driversList"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function DriversListClient(){
    return(
        <><DriversListComponent/></>
    )
}