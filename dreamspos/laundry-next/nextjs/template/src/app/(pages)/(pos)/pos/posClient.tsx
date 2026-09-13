"use client";

import dynamic from "next/dynamic";

const PosComponent = dynamic(
  () => import("@/pages/pos/pos"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function PosClient(){
    return(
        <><PosComponent/></>
    )
}