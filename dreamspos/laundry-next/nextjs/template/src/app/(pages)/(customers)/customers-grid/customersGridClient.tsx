"use client";

import dynamic from "next/dynamic";

const CustomerGridComponent = dynamic(
  () => import("@/pages/customer/customerGrid"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function CustomersGridClient(){
    return(
        <><CustomerGridComponent/></>
    )
}