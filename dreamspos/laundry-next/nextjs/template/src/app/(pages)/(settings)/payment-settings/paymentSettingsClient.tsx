"use client";

import dynamic from "next/dynamic";

const PaymentSettingsComponents = dynamic(
  () => import("@/pages/settings/payment-settings/paymentSettings"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function PaymentSettings(){
    return(
        <><PaymentSettingsComponents/></>
    )
}