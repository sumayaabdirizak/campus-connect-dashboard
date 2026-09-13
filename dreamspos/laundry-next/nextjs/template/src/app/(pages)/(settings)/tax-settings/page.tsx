import { getPageMetadata } from "@/config/metadata";
import TaxSettingsClient from "./taxSettingsClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Tax Settings');
};
export default function TaxSettings(){
    return(
        <><TaxSettingsClient/></>
    )
}