import { getPageMetadata } from "@/config/metadata";
import CustomersListClient from "./customersListClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Customers List');
};
export default function CustomersList(){
    return(
        <><CustomersListClient/></>
    )
}