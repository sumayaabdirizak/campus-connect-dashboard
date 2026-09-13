"use client";

import dynamic from "next/dynamic";

const OrdersComponent = dynamic(
  () => import("@/pages/orders/orders"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function OrdersClient(){
    return(
        <><OrdersComponent/></>
    )
}