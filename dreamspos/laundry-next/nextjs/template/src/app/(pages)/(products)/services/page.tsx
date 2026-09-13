import { getPageMetadata } from "@/config/metadata";
import ServicesClient from "./servicesClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Services');
};
export default function Services(){
    return(
        <><ServicesClient/></>
    )
}