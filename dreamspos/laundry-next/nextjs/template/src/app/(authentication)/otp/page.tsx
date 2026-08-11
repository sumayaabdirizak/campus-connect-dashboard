import { getPageMetadata } from "@/config/metadata";
import OtpClient from "./otpClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('OTP');
};
export default function Otp(){
    return(
        <><OtpClient/></>
    )
}