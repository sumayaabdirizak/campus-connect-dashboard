"use client";

import dynamic from "next/dynamic";

const AddonsComponent = dynamic(
  () => import("@/pages/products/addons/addons"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function AddonsClient(){
    return(
        <><AddonsComponent/></>
    )
}