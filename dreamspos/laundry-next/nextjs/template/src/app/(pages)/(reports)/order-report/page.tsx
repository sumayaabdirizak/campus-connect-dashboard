import { getPageMetadata } from "@/config/metadata";
import OrderReportClient from "./orderReportClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Order Report');
};
export default function OrderReport(){
    return(
        <><OrderReportClient/></>
    )
}