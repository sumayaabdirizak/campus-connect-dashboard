"use client";

import dynamic from "next/dynamic";

const TaxSettingsComponents = dynamic(
  () => import("@/pages/settings/tax-settings/taxSettings"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function TaxSettingsClient(){
    return(
        <><TaxSettingsComponents/></>
    )
}