"use client";

import dynamic from "next/dynamic";

const PrintSettingsComponents = dynamic(
  () => import("@/pages/settings/print-settings/printSettings"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function PrintSettings(){
    return(
        <><PrintSettingsComponents/></>
    )
}