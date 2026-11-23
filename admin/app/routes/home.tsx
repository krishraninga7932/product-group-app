import { redirect } from "react-router";
import type { Route } from "./+types/home";
import ProductGroupsPage from "./product-groups/_index";
import { useLoaderData } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Product Groups" },
    { name: "description", content: "Product Groups Page" },
  ];
}


export async function loader() {

  return redirect("/product-groups");

}

export default function Home() {
  return null;
}