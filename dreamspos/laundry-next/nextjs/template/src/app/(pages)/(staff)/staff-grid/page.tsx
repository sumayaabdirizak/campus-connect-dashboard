import { getPageMetadata } from "@/config/metadata";
import StaffGridClient from "./staffGridClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Staff Grid');
};
export default function StaffGrid(){
    return(
        <><StaffGridClient/></>
    )
}