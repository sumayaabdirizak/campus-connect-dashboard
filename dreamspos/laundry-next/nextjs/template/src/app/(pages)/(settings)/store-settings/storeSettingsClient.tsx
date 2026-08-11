"use client";

import dynamic from "next/dynamic";

const StoreSettingsComponents = dynamic(
  () => import("@/pages/settings/storeSettings"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function StoreSettingsClient(){
    return(
        <><StoreSettingsComponents/></>
    )
}