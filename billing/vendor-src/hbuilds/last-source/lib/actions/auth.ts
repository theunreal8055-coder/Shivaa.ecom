"use server";

import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, users, settings } from "@/lib/db";
import { createSession, destroySession, requireSession } from "@/lib/auth";
import { str } from "@/lib/utils";
import { logAudit, type ActionState } from "./helpers";

export async function setupOwner(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const [{ value: existing }] = await db().select({ value: count() }).from(users);
  if (existing > 0) redirect("/login");

  const name = str(fd.get("name"));
  const email = str(fd.get("email")).toLowerCase();
  const password = String(fd.get("password") || "");
  const shopName = str(fd.get("shopName")) || "Shivaa Jewellers";

  if (!email.includes("@")) return { ok: false, message: "Enter a valid email address." };
  if (password.length < 6) return { ok: false, message: "Password must be at least 6 characters." };

  const passwordHash = await bcrypt.hash(password, 10);
  // MySQL: no .returning() — the insert result carries insertId instead.
  const [userRes] = await db().insert(users).values({ email, passwordHash, name: name || "Owner" });
  const user = { id: userRes.insertId, email, name: name || "Owner" };
  // Postgres onConflictDoUpdate -> MySQL onDuplicateKeyUpdate.
  await db().insert(settings).values({ id: 1, shopName }).onDuplicateKeyUpdate({ set: { shopName } });
  await logAudit("Owner account created", "user", user.id, email);
  await createSession(user);
  redirect("/");
}

export async function login(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd.get("email")).toLowerCase();
  const password = String(fd.get("password") || "");
  const [user] = await db().select().from(users).where(eq(users.email, email));
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { ok: false, message: "Incorrect email or password." };
  }
  await createSession(user);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function changePassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSession();
  const current = String(fd.get("current") || "");
  const next = String(fd.get("next") || "");
  if (next.length < 6) return { ok: false, message: "New password must be at least 6 characters." };
  const [user] = await db().select().from(users).where(eq(users.id, session.userId));
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    return { ok: false, message: "Current password is incorrect." };
  }
  await db().update(users).set({ passwordHash: await bcrypt.hash(next, 10) }).where(eq(users.id, user.id));
  await logAudit("Password changed", "user", user.id);
  return { ok: true, message: "Password updated." };
}
