import { getPageMetadata } from "@/config/metadata";
import CustomersGridClient from "./customersGridClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Customers Grid');
};
export default function CustomersGrid(){
    return(
        <><CustomersGridClient/></>
    )
}