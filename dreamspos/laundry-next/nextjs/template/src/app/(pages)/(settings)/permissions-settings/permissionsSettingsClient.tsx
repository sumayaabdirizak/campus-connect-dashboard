"use client";

import dynamic from "next/dynamic";

const PermissionsSettingsComponents = dynamic(
  () => import("@/pages/settings/permissions-settings/permissionsSettings"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function PermissionsSettings(){
    return(
        <><PermissionsSettingsComponents/></>
    )
}