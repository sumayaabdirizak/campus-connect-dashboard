import { getPageMetadata } from "@/config/metadata";
import DriversGridClient from "./driversGridClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Drivers Grid');
};
export default function DriversGrid(){
    return(
        <><DriversGridClient/></>
    )
}