import { getPageMetadata } from "@/config/metadata";
import RegisterClient from "./registerClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Register');
};
export default function Register(){
    return(
        <><RegisterClient/></>
    )
}