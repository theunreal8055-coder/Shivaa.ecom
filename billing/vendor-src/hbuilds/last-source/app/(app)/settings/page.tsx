import { db, settings } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { RatesForm } from "@/components/rates-form";
import { ShopForm, PasswordForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [s] = await db().select().from(settings).limit(1);

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" sub="Shop profile, rates & security" />

      <div id="rates" className="scroll-mt-20">
        <Card title="Live Metal Rates">
          <RatesForm goldRate={s?.goldRate ?? 7500} silverRate={s?.silverRate ?? 90} />
          <p className="mt-3 text-[11px] text-mut">
            These rates pre-fill new invoice rows and drive stock valuation.
            {s?.ratesUpdatedAt ? ` Last updated ${new Date(s.ratesUpdatedAt).toLocaleString("en-IN")}.` : ""}
          </p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Card title="Shop Details">
          <ShopForm s={{
            shopName: s?.shopName ?? null, tagline: s?.tagline ?? null, address: s?.address ?? null,
            phone: s?.phone ?? null, gstin: s?.gstin ?? null,
            invoicePrefix: s?.invoicePrefix ?? null, gstPercent: s?.gstPercent ?? null,
          }} />
          <p className="mt-3 text-[11px] text-mut">This information is printed at the top of every invoice and metal bill.</p>
        </Card>

        <Card title="Change Password">
          <PasswordForm />
        </Card>
      </div>
    </div>
  );
}
