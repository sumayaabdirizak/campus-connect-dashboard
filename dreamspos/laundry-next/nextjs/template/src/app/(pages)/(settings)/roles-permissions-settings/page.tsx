import { getPageMetadata } from "@/config/metadata";
import RolesPermissionsSettingsClient from "./rolesPermissionsSettingsClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Roles Permissions Settings');
};
export default function RolesPermissionsSettings(){
    return(
        <><RolesPermissionsSettingsClient/></>
    )
}