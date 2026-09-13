"use client";

import dynamic from "next/dynamic";

const CategoriesComponent = dynamic(
  () => import("@/pages/products/categories/categories"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function CategoryClient(){
    return(
        <><CategoriesComponent/></>
    )
}