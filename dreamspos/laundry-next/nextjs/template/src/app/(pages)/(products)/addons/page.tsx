import { getPageMetadata } from "@/config/metadata";
import AddonsClient from "./addonsClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Addons');
};
export default function Addons(){
    return(
        <><AddonsClient/></>
    )
}