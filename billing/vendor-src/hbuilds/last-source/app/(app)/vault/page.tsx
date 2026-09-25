import { desc, sql } from "drizzle-orm";
import { Download, ShieldCheck } from "lucide-react";
import {
  db, auditLogs, inventoryItems, customers, suppliers, invoices,
  metalInvoices, karigarJobs, expenses, ledgerEntries,
} from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { ImportForm } from "./import-form";
import type { PgTable } from "drizzle-orm/pg-core";

export const dynamic = "force-dynamic";

async function countOf(table: PgTable) {
  const [row] = await db().select({ c: sql<number>`count(*)` }).from(table);
  return Number(row.c);
}

export default async function VaultPage() {
  const [inv, cust, sup, bills, metal, jobs, exp, ledger] = await Promise.all([
    countOf(inventoryItems), countOf(customers), countOf(suppliers), countOf(invoices),
    countOf(metalInvoices), countOf(karigarJobs), countOf(expenses), countOf(ledgerEntries),
  ]);

  const logs = await db().select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(25);

  const stats = [
    { label: "Inventory items", value: inv },
    { label: "Customers", value: cust },
    { label: "Suppliers", value: sup },
    { label: "Invoices", value: bills },
    { label: "Metal bills", value: metal },
    { label: "Karigar jobs", value: jobs },
    { label: "Expenses", value: exp },
    { label: "Khata entries", value: ledger },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Secure Vault" sub="Backup, restore & activity log" />

      <Card title="Data Summary">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-edge bg-panel2 px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-mut">{s.label}</div>
              <div className="text-lg font-extrabold text-gold tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Download Backup">
          <p className="text-sm text-mut mb-3">
            A single JSON file containing every record in your vault. Keep a copy on your phone or Google Drive.
          </p>
          <a href="/api/backup"
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-extrabold text-vault hover:brightness-110 transition-all">
            <Download size={16} /> Download JSON Backup
          </a>
        </Card>

        <Card title="Restore / Import">
          <ImportForm />
        </Card>
      </div>

      <Card title="Activity Log">
        {logs.length === 0 ? (
          <p className="text-sm text-mut">No activity recorded yet.</p>
        ) : (
          <div className="divide-y divide-edge/60 -mx-1">
            {logs.map((l) => (
              <div key={l.id} className="flex items-start gap-3 px-1 py-2.5">
                <ShieldCheck size={15} className="text-gold shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold">{l.action}</div>
                  {l.detail && <div className="text-[11px] text-mut truncate">{l.detail}</div>}
                </div>
                <div className="text-[10px] text-mut shrink-0">
                  {l.createdAt ? new Date(l.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
