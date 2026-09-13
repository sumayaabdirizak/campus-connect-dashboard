import { getPageMetadata } from "@/config/metadata";
import ResetPasswordClient from "./resetPasswordClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Reset Password');
};
export default function ResetPassword(){
    return(
        <><ResetPasswordClient/></>
    )
}