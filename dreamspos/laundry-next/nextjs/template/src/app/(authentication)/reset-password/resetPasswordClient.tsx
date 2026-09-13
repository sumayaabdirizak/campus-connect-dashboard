"use client";

import dynamic from "next/dynamic";

const ResetPasswordComponent = dynamic(
  () => import("@/pages/authentication/resetPassword"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function ResetPasswordClient(){
    return(
        <><ResetPasswordComponent/></>
    )
}