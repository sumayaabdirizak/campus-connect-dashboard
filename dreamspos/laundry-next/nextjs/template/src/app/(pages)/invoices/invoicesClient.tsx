"use client";

import dynamic from "next/dynamic";

const InvoicesComponent = dynamic(
  () => import("@/pages/invoices/invoices"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function InvoicesClient(){
    return(
        <><InvoicesComponent/></>
    )
}