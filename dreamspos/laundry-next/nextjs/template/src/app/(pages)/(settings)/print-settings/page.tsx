import { getPageMetadata } from "@/config/metadata";
import PrintSettingsClient from "./printSettingsClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Print Settings');
};
export default function PrintSettings(){
    return(
        <><PrintSettingsClient/></>
    )
}