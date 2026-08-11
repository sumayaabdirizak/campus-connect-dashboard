"use client";

import dynamic from "next/dynamic";

const DeliverySettingsComponents = dynamic(
  () => import("@/pages/settings/delivery-settings/deliverySettings"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function StoreSettingsClient(){
    return(
        <><DeliverySettingsComponents/></>
    )
}