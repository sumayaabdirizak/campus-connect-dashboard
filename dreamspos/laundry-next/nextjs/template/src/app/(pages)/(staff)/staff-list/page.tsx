import { getPageMetadata } from "@/config/metadata";
import StaffListClient from "./staffListClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Staff List');
};
export default function StaffList(){
    return(
        <><StaffListClient/></>
    )
}