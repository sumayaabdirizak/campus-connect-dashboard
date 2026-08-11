import { getPageMetadata } from "@/config/metadata";
import OrdersClient from "./ordersClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Orders');
};
export default function Orders(){
    return(
        <><OrdersClient/></>
    )
}