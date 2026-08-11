"use client";

import dynamic from "next/dynamic";

const EmailVerificationComponent = dynamic(
  () => import("@/pages/authentication/emailVerification"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function EmailVerificationClient(){
    return(
        <><EmailVerificationComponent/></>
    )
}