import { getPageMetadata } from "@/config/metadata";
import NotificationsSettingsClient from "./notificationsSettingsClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Notifications Settings');
};
export default function NotificationsSettings(){
    return(
        <><NotificationsSettingsClient/></>
    )
}