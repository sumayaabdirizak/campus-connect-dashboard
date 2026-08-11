"use client";

import dynamic from "next/dynamic";

const ForgotPasswordComponent = dynamic(
  () => import("@/pages/authentication/forgotPassword"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function ForgotPasswordClient(){
    return(
        <><ForgotPasswordComponent/></>
    )
}