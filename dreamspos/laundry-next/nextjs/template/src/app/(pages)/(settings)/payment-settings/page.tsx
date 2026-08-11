import { getPageMetadata } from "@/config/metadata";
import PaymentSettingsClient from "./paymentSettingsClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Payment Settings');
};
export default function PaymentSettings(){
    return(
        <><PaymentSettingsClient/></>
    )
}