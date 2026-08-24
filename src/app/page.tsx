import { redirect } from "next/navigation";
import { getCustomSession } from "@/lib/session";

export default async function Home() {
  const session = await getCustomSession();
  
  if (session?.role) {
    redirect(`/dashboard/${session.role}`);
  }
  
  redirect("/login");
}
