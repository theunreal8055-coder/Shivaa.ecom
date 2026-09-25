import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, users } from "@/lib/db";
import { AuthCard } from "@/components/ui";
import { SetupForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [{ value }] = await db().select({ value: count() }).from(users);
  if (value > 0) redirect("/login");
  return (
    <AuthCard title="First-time setup" sub="Create the owner account for this shop. This screen appears only once.">
      <SetupForm />
    </AuthCard>
  );
}
