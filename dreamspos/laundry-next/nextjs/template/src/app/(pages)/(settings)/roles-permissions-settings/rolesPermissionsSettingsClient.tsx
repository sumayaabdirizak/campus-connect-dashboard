"use client";

import dynamic from "next/dynamic";

const RolesPermissionsSettingsComponents = dynamic(
  () => import("@/pages/settings/permissions-settings/RolesPermissionsSettings"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function RolesPermissionsSettings(){
    return(
        <><RolesPermissionsSettingsComponents/></>
    )
}