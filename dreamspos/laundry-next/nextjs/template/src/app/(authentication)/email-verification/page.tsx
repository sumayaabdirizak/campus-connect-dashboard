import { getPageMetadata } from "@/config/metadata";
import EmailVerificationClient from "./emailVerificationClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Email Verification');
};
export default function EmailVerification(){
    return(
        <><EmailVerificationClient/></>
    )
}