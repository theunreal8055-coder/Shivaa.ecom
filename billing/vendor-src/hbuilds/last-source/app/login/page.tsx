import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, users } from "@/lib/db";
import { AuthCard } from "@/components/ui";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const [{ value }] = await db().select({ value: count() }).from(users);
  if (value === 0) redirect("/setup");
  return (
    <AuthCard title="Owner sign in" sub="Enter your email and password to continue.">
      <LoginForm />
    </AuthCard>
  );
}
