import { getPageMetadata } from "@/config/metadata";
import EarningReportClient from "./earningReportClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Earning Report');
};
export default function EarningReport(){
    return(
        <><EarningReportClient/></>
    )
}