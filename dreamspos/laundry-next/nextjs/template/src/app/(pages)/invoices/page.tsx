import { getPageMetadata } from "@/config/metadata";
import InvoicesClient from "./invoicesClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Invoices');
};
export default function Invoices(){
    return(
        <><InvoicesClient/></>
    )
}