import { asc, eq } from "drizzle-orm";
import { db, customers, suppliers, inventoryItems } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { MetalBuilder } from "@/components/metal-builder";

export const dynamic = "force-dynamic";

export default async function NewMetalBillPage() {
  const custs = await db().select({ id: customers.id, name: customers.name }).from(customers).orderBy(asc(customers.name));
  const sups = await db().select({ id: suppliers.id, name: suppliers.name }).from(suppliers).orderBy(asc(suppliers.name));
  const stock = await db().select({
    id: inventoryItems.id, name: inventoryItems.name, huid: inventoryItems.huid,
    metal: inventoryItems.metal, purity: inventoryItems.purity, netWt: inventoryItems.netWt,
  }).from(inventoryItems).where(eq(inventoryItems.status, "In Stock")).orderBy(asc(inventoryItems.name));

  return (
    <div className="space-y-4">
      <PageHeader title="New Metal Bill" sub="Fine out = net + wastage% · Fine in = gross × tunch%" />
      <MetalBuilder customersList={custs} suppliersList={sups} stock={stock} />
    </div>
  );
}
