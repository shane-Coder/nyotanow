import { redirect } from "next/navigation";
import { OCCASIONS } from "@/lib/occasions";

// /create has no occasion of its own; send people to the most common one.
// They can switch occasion inside the form without losing what they typed.
export default function CreateIndex() {
  redirect(`/create/${OCCASIONS[0].id}`);
}
