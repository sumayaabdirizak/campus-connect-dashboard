import { getPageMetadata } from "@/config/metadata";
import SalesReportClient from "./salesReportClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Sales Report');
};
export default function SalesReport(){
    return(
        <><SalesReportClient/></>
    )
}