"use client";

import dynamic from "next/dynamic";

const OTPComponent = dynamic(
  () => import("@/pages/authentication/otp"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function OtpClient(){
    return(
        <><OTPComponent/></>
    )
}