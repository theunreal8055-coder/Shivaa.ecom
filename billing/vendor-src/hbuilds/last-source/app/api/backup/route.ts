import { NextResponse } from "next/server";
import {
  db, settings, inventoryItems, customers, suppliers, artisans,
  invoices, metalInvoices, karigarJobs, expenses, ledgerEntries, auditLogs,
} from "@/lib/db";
import { getSession } from "@/lib/auth";
import { today } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    settingsRows, inventory, custs, sups, arts, invs, metal, jobs, exps, ledger, logs,
  ] = await Promise.all([
    db().select().from(settings),
    db().select().from(inventoryItems),
    db().select().from(customers),
    db().select().from(suppliers),
    db().select().from(artisans),
    db().select().from(invoices),
    db().select().from(metalInvoices),
    db().select().from(karigarJobs),
    db().select().from(expenses),
    db().select().from(ledgerEntries),
    db().select().from(auditLogs),
  ]);

  const payload = {
    app: "Shivaa Enterprise Vault",
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: settingsRows,
    inventory,
    customers: custs,
    suppliers: sups,
    artisans: arts,
    invoices: invs,
    metalInvoices: metal,
    karigarJobs: jobs,
    expenses: exps,
    ledgerEntries: ledger,
    auditLogs: logs,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="shivaa-backup-${today()}.json"`,
    },
  });
}
