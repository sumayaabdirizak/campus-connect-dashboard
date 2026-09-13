import { getPageMetadata } from "@/config/metadata";
import PermissionsSettingsClient from "./permissionsSettingsClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Permissions Settings');
};
export default function PermissionsSettings(){
    return(
        <><PermissionsSettingsClient/></>
    )
}