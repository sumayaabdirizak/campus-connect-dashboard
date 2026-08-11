import { getPageMetadata } from "@/config/metadata";
import ForgotPasswordClient from "./forgotPasswordClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Forgot Password');
};
export default function ForgotPassword(){
    return(
        <><ForgotPasswordClient/></>
    )
}