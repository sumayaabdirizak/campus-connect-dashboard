import { getPageMetadata } from "@/config/metadata";
import IntegrationsSettingsClient from "./integrationsSettingsClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Integrations Settings');
};
export default function IntegrationsSettings(){
    return(
        <><IntegrationsSettingsClient/></>
    )
}