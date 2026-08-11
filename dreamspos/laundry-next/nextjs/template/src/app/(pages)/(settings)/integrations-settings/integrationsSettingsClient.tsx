"use client";

import dynamic from "next/dynamic";

const IntegrationsSettingsComponents = dynamic(
  () => import("@/pages/settings/integrations-settings/integrationsSettings"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function IntegrationsSettingsClient(){
    return(
        <><IntegrationsSettingsComponents/></>
    )
}