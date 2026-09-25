import { asc, eq } from "drizzle-orm";
import { db, customers, inventoryItems, settings } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { InvoiceBuilder } from "@/components/invoice-builder";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const billType = type === "Estimate" ? "Estimate" : "GST";

  const [s] = await db().select().from(settings).limit(1);
  const custs = await db().select({
    id: customers.id, name: customers.name, phone: customers.phone, creditDays: customers.creditDays,
  }).from(customers).orderBy(asc(customers.name));
  const stock = await db().select({
    id: inventoryItems.id, name: inventoryItems.name, huid: inventoryItems.huid,
    metal: inventoryItems.metal, purity: inventoryItems.purity,
    netWt: inventoryItems.netWt, pieces: inventoryItems.pieces,
  }).from(inventoryItems).where(eq(inventoryItems.status, "In Stock")).orderBy(asc(inventoryItems.name));

  return (
    <div className="space-y-4">
      <PageHeader title={billType === "GST" ? "New GST Invoice" : "New Estimate"}
        sub={billType === "GST" ? `GST @ ${s?.gstPercent ?? 3}% (CGST + SGST)` : "No tax — estimate / kachha bill"} />
      <InvoiceBuilder
        initialType={billType}
        customersList={custs}
        stock={stock}
        goldRate={s?.goldRate ?? 7500}
        silverRate={s?.silverRate ?? 90}
        gstPercent={s?.gstPercent ?? 3}
      />
    </div>
  );
}
