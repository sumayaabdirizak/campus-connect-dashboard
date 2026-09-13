import { getPageMetadata } from "@/config/metadata";
import DeliverySettingsClient from "./deliverySettingsClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Delivery Settings');
};
export default function DeliverySettings(){
    return(
        <><DeliverySettingsClient/></>
    )
}