import Link from "next/link";
import { desc, ilike } from "drizzle-orm";
import { db, customers, suppliers, artisans } from "@/lib/db";
import { deleteCustomer, deleteSupplier, deleteArtisan } from "@/lib/actions/parties";
import { Card, DeleteBtn, EmptyState, PageHeader, SearchBox } from "@/components/ui";
import { AddCustomerButton, AddSupplierButton, AddArtisanButton, EditCustomerButton, EditSupplierButton, EditArtisanButton } from "./forms";
import { BookUser } from "lucide-react";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "customers", label: "Customers" },
  { key: "suppliers", label: "Suppliers" },
  { key: "karigars", label: "Karigars" },
] as const;

export default async function PartiesPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const sp = await searchParams;
  const tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : "customers") as (typeof TABS)[number]["key"];
  const q = sp.q ?? "";

  const custRows = tab === "customers"
    ? await db().select().from(customers).where(q ? ilike(customers.name, `%${q}%`) : undefined).orderBy(desc(customers.id)).limit(500)
    : [];
  const supRows = tab === "suppliers"
    ? await db().select().from(suppliers).where(q ? ilike(suppliers.name, `%${q}%`) : undefined).orderBy(desc(suppliers.id)).limit(500)
    : [];
  const artRows = tab === "karigars"
    ? await db().select().from(artisans).where(q ? ilike(artisans.name, `%${q}%`) : undefined).orderBy(desc(artisans.id)).limit(500)
    : [];

  const addButton = tab === "customers" ? <AddCustomerButton /> : tab === "suppliers" ? <AddSupplierButton /> : <AddArtisanButton />;

  return (
    <div className="space-y-4">
      <PageHeader title="Parties" sub="Customers, suppliers & karigars" actions={addButton} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-edge bg-panel p-1">
          {TABS.map((t) => (
            <Link key={t.key} href={`/parties?tab=${t.key}`}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${tab === t.key ? "bg-gold text-vault" : "text-mut hover:text-ink"}`}>
              {t.label}
            </Link>
          ))}
        </div>
        <SearchBox placeholder={`Search ${tab}…`} defaultValue={q} extra={{ tab }} />
      </div>

      <Card>
        {tab === "customers" && (custRows.length === 0
          ? <EmptyState title="No customers" desc="Add customers to bill faster and track khata." />
          : (
            <div className="divide-y divide-edge/60 -mx-1">
              {custRows.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-1 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm">{c.name}</div>
                    <div className="text-[11px] text-mut truncate">
                      {[c.phone, c.city, c.pan ? `PAN ${c.pan}` : ""].filter(Boolean).join(" · ") || "—"}
                    </div>
                    {(c.creditLimit ?? 0) > 0 || (c.creditDays ?? 0) > 0 ? (
                      <div className="text-[11px] text-amber-300/90 mt-0.5">
                        Credit: ₹{(c.creditLimit ?? 0).toLocaleString("en-IN")} · {c.creditDays ?? 0} days
                      </div>
                    ) : null}
                  </div>
                  <Link href={`/khata/${c.id}`} title="Open khata"
                    className="rounded-lg border border-edge p-2 text-sky hover:border-sky/60 transition-colors">
                    <BookUser size={15} />
                  </Link>
                  <EditCustomerButton c={c} />
                  <DeleteBtn action={deleteCustomer.bind(null, c.id)} label={c.name} small />
                </div>
              ))}
            </div>
          ))}

        {tab === "suppliers" && (supRows.length === 0
          ? <EmptyState title="No suppliers" desc="Add bullion dealers and wholesalers here." />
          : (
            <div className="divide-y divide-edge/60 -mx-1">
              {supRows.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-1 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm">{s.name}{s.company ? <span className="text-mut font-semibold"> · {s.company}</span> : null}</div>
                    <div className="text-[11px] text-mut truncate">
                      {[s.phone, s.city, s.gstin ? `GSTIN ${s.gstin}` : ""].filter(Boolean).join(" · ") || "—"}
                    </div>
                    {s.accNumber ? <div className="text-[11px] text-mut">A/c {s.accNumber}{s.ifsc ? ` · ${s.ifsc}` : ""}</div> : null}
                  </div>
                  <EditSupplierButton s={s} />
                  <DeleteBtn action={deleteSupplier.bind(null, s.id)} label={s.name} small />
                </div>
              ))}
            </div>
          ))}

        {tab === "karigars" && (artRows.length === 0
          ? <EmptyState title="No karigars" desc="Add artisans to issue job work." />
          : (
            <div className="divide-y divide-edge/60 -mx-1">
              {artRows.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-1 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm">{a.name}</div>
                    <div className="text-[11px] text-mut truncate">
                      {[a.phone, a.specialization].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <EditArtisanButton a={a} />
                  <DeleteBtn action={deleteArtisan.bind(null, a.id)} label={a.name} small />
                </div>
              ))}
            </div>
          ))}
      </Card>
    </div>
  );
}
