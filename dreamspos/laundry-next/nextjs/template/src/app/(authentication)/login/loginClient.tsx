"use client";

import dynamic from "next/dynamic";

const LoginComponent = dynamic(
  () => import("@/pages/authentication/login"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function LoginClient(){
    return(
        <><LoginComponent/></>
    )
}