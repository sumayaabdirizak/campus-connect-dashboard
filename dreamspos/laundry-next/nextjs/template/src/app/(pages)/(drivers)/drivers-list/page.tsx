import { getPageMetadata } from "@/config/metadata";
import DriversListClient from "./driversListClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Drivers List');
};
export default function DriversList(){
    return(
        <><DriversListClient/></>
    )
}