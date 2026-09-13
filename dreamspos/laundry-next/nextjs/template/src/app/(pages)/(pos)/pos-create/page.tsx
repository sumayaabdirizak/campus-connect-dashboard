import { getPageMetadata } from "@/config/metadata";
import PosCreateClient from "./posCreateClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('POS Create');
};
export default function PosCreate(){
    return(
        <><PosCreateClient/></>
    )
}