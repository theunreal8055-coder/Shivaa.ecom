import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { db, inventoryItems } from "@/lib/db";
import { deleteItem } from "@/lib/actions/inventory";
import { gm, statusTone } from "@/lib/utils";
import { Badge, Card, DeleteBtn, EmptyState, PageHeader, SearchBox } from "@/components/ui";
import { AddItemButton, EditItemButton } from "./item-form";

export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status = "" } = await searchParams;

  const conds: SQL[] = [];
  if (q) conds.push(or(like(inventoryItems.name, `%${q}%`), like(inventoryItems.huid, `%${q}%`), like(inventoryItems.sku, `%${q}%`))!);
  if (status) conds.push(eq(inventoryItems.status, status));

  const rows = await db().select().from(inventoryItems)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(inventoryItems.id)).limit(500);

  const [agg] = await db().select({
    inStock: sql<number>`coalesce(sum(case when status = 'In Stock' then 1 else 0 end), 0)`,
    total: sql<number>`count(*)`,
  }).from(inventoryItems);

  return (
    <div className="space-y-4">
      <PageHeader title="Inventory" sub={`${agg.inStock} in stock · ${agg.total} total items`} actions={<AddItemButton />} />

      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search name, HUID, SKU…" defaultValue={q} extra={status ? { status } : undefined} />
        <div className="flex gap-1.5">
          {["", "In Stock", "Sold", "Issued"].map((st) => (
            <a key={st || "all"} href={`/inventory?${new URLSearchParams({ ...(q ? { q } : {}), ...(st ? { status: st } : {}) })}`}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold border transition-colors ${status === st ? "border-gold text-gold bg-gold/10" : "border-edge text-mut hover:text-ink"}`}>
              {st || "All"}
            </a>
          ))}
        </div>
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No items found" desc={q || status ? "Try clearing your filters." : "Add your first stock item to get started."} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-mut border-b border-edge">
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3">Metal / Purity</th>
                    <th className="py-2 pr-3 text-right">Gross</th>
                    <th className="py-2 pr-3 text-right">Net</th>
                    <th className="py-2 pr-3 text-right">Pcs</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge/60">
                  {rows.map((it) => (
                    <tr key={it.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-3">
                        <div className="font-bold">{it.name}</div>
                        <div className="text-[11px] text-mut">{it.category}{it.huid ? ` · HUID ${it.huid}` : ""}{it.sku ? ` · ${it.sku}` : ""}</div>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-300">{it.metal} · {it.purity}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{gm(it.grossWt)}g</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums font-bold text-gold">{gm(it.netWt)}g</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{it.pieces}</td>
                      <td className="py-2.5 pr-3"><Badge tone={statusTone(it.status)}>{it.status}</Badge></td>
                      <td className="py-2.5">
                        <div className="flex justify-end gap-1">
                          <EditItemButton item={it} />
                          <DeleteBtn action={deleteItem.bind(null, it.id)} label={it.name} small />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-edge/60 -mx-1">
              {rows.map((it) => (
                <div key={it.id} className="flex items-center gap-3 px-1 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate">{it.name}</div>
                    <div className="text-[11px] text-mut truncate">
                      {it.metal} {it.purity} · {gm(it.netWt)}g net · {it.pieces} pc{(it.pieces ?? 1) > 1 ? "s" : ""}
                      {it.huid ? ` · ${it.huid}` : ""}
                    </div>
                    <div className="mt-1"><Badge tone={statusTone(it.status)}>{it.status}</Badge></div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <EditItemButton item={it} />
                    <DeleteBtn action={deleteItem.bind(null, it.id)} label={it.name} small />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
