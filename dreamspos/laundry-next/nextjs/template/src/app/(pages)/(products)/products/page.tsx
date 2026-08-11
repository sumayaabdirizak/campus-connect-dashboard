import { getPageMetadata } from "@/config/metadata";
import ProductsClient from "./productsClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Products');
};
export default function Products(){
    return(
        <><ProductsClient/></>
    )
}