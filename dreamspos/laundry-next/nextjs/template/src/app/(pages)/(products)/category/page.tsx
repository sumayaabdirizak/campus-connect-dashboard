import { getPageMetadata } from "@/config/metadata";
import CategoryClient from "./categoryClient";
// This runs on the server
export const generateMetadata = () => {
  return getPageMetadata('Category');
};
export default function Category(){
    return(
        <><CategoryClient/></>
    )
}