import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { UserProvider } from "@/lib/user-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <UserProvider user={user}>{children}</UserProvider>;
}
