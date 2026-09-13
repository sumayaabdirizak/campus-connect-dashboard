import { getPageMetadata } from "@/config/metadata";
import CustomerReportClient from "./customerReportClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Customer Report');
};
export default function CustomerReport(){
    return(
        <><CustomerReportClient/></>
    )
}