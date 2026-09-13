"use client";

import dynamic from "next/dynamic";

const ProductsComponent = dynamic(
  () => import("@/pages/products/products-list/productsList"),
  {
    ssr: false,
    loading: () => <p>Loading</p>,
  }
);
export default function ProductsClient(){
    return(
        <><ProductsComponent/></>
    )
}