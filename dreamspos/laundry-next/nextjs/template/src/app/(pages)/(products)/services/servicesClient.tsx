"use client";

import dynamic from "next/dynamic";

const ServicesComponent = dynamic(
  () => import("@/pages/products/services/services"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function ServicesClient(){
    return(
        <><ServicesComponent/></>
    )
}