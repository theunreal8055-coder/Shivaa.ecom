import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import {
  db, inventoryItems, customers, suppliers, invoices,
  metalInvoices, karigarJobs, expenses, ledgerEntries,
} from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toCsv, today } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ entity: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entity } = await params;
  let rows: Record<string, unknown>[] = [];

  switch (entity) {
    case "inventory": {
      const data = await db().select().from(inventoryItems).orderBy(asc(inventoryItems.id));
      rows = data.map((i) => ({
        SKU: i.sku, HUID: i.huid, Name: i.name, Category: i.category, Metal: i.metal, Purity: i.purity,
        GrossWt: i.grossWt, LessWt: i.lessWt, StoneWt: i.stoneWt, NetWt: i.netWt,
        Pieces: i.pieces, Status: i.status, Notes: i.notes,
      }));
      break;
    }
    case "customers": {
      const data = await db().select().from(customers).orderBy(asc(customers.id));
      rows = data.map((c) => ({
        Name: c.name, Phone: c.phone, Email: c.email, City: c.city, Address: c.address,
        PAN: c.pan, Aadhar: c.aadhar, CreditLimit: c.creditLimit, CreditDays: c.creditDays, Notes: c.notes,
      }));
      break;
    }
    case "suppliers": {
      const data = await db().select().from(suppliers).orderBy(asc(suppliers.id));
      rows = data.map((s) => ({
        Name: s.name, Company: s.company, Phone: s.phone, City: s.city, Address: s.address,
        PAN: s.pan, GSTIN: s.gstin, AccountName: s.accName, AccountNumber: s.accNumber, IFSC: s.ifsc,
      }));
      break;
    }
    case "invoices": {
      const data = await db().select().from(invoices).orderBy(asc(invoices.id));
      rows = data.map((i) => ({
        InvoiceNo: i.invNo, Type: i.type, Date: i.date, Customer: i.customerName, Phone: i.customerPhone,
        Subtotal: i.subtotal, Discount: i.discountAmount, Taxable: i.taxable, GST: i.gstAmount,
        OldMetal: i.oldMetalDeduction, RoundOff: i.roundOff, GrandTotal: i.grandTotal,
        Paid: i.amountPaid, BalanceDue: i.balanceDue, Status: i.status,
      }));
      break;
    }
    case "expenses": {
      const data = await db().select().from(expenses).orderBy(asc(expenses.id));
      rows = data.map((e) => ({
        Date: e.date, Category: e.category, Description: e.description, Amount: e.amount, Mode: e.paymentMode,
      }));
      break;
    }
    case "khata": {
      const data = await db()
        .select({
          Customer: customers.name, Phone: customers.phone, Date: ledgerEntries.date,
          Type: ledgerEntries.type, Amount: ledgerEntries.amount, Mode: ledgerEntries.mode,
          Reference: ledgerEntries.refType, Note: ledgerEntries.note,
        })
        .from(ledgerEntries)
        .leftJoin(customers, eq(customers.id, ledgerEntries.customerId))
        .orderBy(asc(ledgerEntries.customerId), asc(ledgerEntries.date));
      rows = data;
      break;
    }
    case "karigar": {
      const data = await db().select().from(karigarJobs).orderBy(asc(karigarJobs.id));
      rows = data.map((j) => ({
        Karigar: j.artisanName, Metal: j.metal, Category: j.category, Purity: j.purity,
        IssueDate: j.issueDate, DurationDays: j.durationDays, IssuedWt: j.issuedWt, LessWt: j.lessWt,
        WastagePct: j.wastagePct, ReceivedWt: j.receivedWt, Labour: j.labourCharges, Status: j.status,
      }));
      break;
    }
    case "metal": {
      const data = await db().select().from(metalInvoices).orderBy(asc(metalInvoices.id));
      rows = data.map((m) => ({
        BillNo: m.billNo, Date: m.date, PartyType: m.partyType, Party: m.partyName,
        FineOutGold: m.fineOutGold, FineInGold: m.fineInGold, BalanceGold: m.balanceGold,
        FineOutSilver: m.fineOutSilver, FineInSilver: m.fineInSilver, BalanceSilver: m.balanceSilver,
      }));
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  }

  const csv = rows.length ? toCsv(rows) : "No records";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shivaa-${entity}-${today()}.csv"`,
    },
  });
}
