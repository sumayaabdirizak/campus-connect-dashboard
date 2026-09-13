"use client";

import dynamic from "next/dynamic";

const RegisterComponent = dynamic(
  () => import("@/pages/authentication/register"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function RegisterClient(){
    return(
        <><RegisterComponent/></>
    )
}