"use client";

import dynamic from "next/dynamic";

const NotificationsSettingsComponents = dynamic(
  () => import("@/pages/settings/notifications-settings/notificationsSettings"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function NotificationsSettings(){
    return(
        <><NotificationsSettingsComponents/></>
    )
}