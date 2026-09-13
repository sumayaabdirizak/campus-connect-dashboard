"use client";

import dynamic from "next/dynamic";

const CustomerListComponent = dynamic(
  () => import("@/pages/customer/customerList"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function CustomersListClient(){
    return(
        <><CustomerListComponent/></>
    )
}