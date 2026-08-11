import { getPageMetadata } from "@/config/metadata";
import StoreSettingsClient from "./storeSettingsClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Store Settings');
};
export default function StoreSettings(){
    return(
        <><StoreSettingsClient/></>
    )
}