export const CATEGORIES = [
  "Rings", "Bangles", "Necklaces", "Earrings", "Chains", "Mangalsutra", "Pendants",
  "Bracelets", "Coins", "Bars", "Stone", "CZ", "Paper Casting", "Regular Casting",
  "Loose Diamonds", "Raw Metal",
];

export const PURITIES = [
  "24K (999)", "22K (916)", "20K (833)", "19K (791)", "18K (750)",
  "14K (585)", "9K (375)", "92.5 Silver",
];

export const PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"];

export const EXPENSE_CATEGORIES = [
  "General", "Rent", "Salary", "Electricity", "Karigar Labour", "Packaging",
  "Transport", "Hallmarking", "Tea & Misc", "Other",
];

/** Grouped number only — callers supply the ₹ symbol. */
export function inr(n: number | null | undefined, decimals = 0): string {
  const v = Number(n) || 0;
  return v.toLocaleString("en-IN", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** Grouped weight only — callers supply the "g" unit. */
export function gm(n: number | null | undefined): string {
  return (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

export function statusTone(status: string | null | undefined) {
  const s = (status || "").toLowerCase();
  if (s === "paid" || s === "completed" || s === "in stock") return "green";
  if (s === "partial" || s === "in progress" || s === "issued") return "amber";
  if (s === "unpaid" || s === "pending" || s === "sold") return s === "sold" ? "grey" : "red";
  return "grey";
}

export function num(v: FormDataEntryValue | null | undefined): number {
  const n = parseFloat(String(v ?? ""));
  return isNaN(n) ? 0 : n;
}

export function str(v: FormDataEntryValue | null | undefined): string {
  return String(v ?? "").trim();
}

export function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/** wa.me link — assumes Indian numbers, prefixes 91 when a bare 10-digit number is given */
export function waLink(phone: string, text: string): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10) digits = "91" + digits;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function invoiceWaText(o: {
  shopName: string; invNo: string; date: string; customerName: string;
  grandTotal: number; amountPaid: number; balanceDue: number;
}): string {
  const lines = [
    `*${o.shopName}*`,
    `Invoice ${o.invNo} • ${fmtDate(o.date)}`,
    `Dear ${o.customerName},`,
    `Bill amount: ₹${inr(o.grandTotal)}`,
    `Received: ₹${inr(o.amountPaid)}`,
  ];
  if (o.balanceDue > 0) lines.push(`Balance due: ₹${inr(o.balanceDue)}`);
  lines.push(`Thank you for shopping with us. 🙏`);
  return lines.join("\n");
}

export function khataWaText(o: { shopName: string; customerName: string; balance: number }): string {
  return [
    `*${o.shopName}*`,
    `Namaste ${o.customerName} ji,`,
    `A gentle reminder — your outstanding balance is *₹${inr(o.balance)}*.`,
    `Kindly clear it at your convenience. Thank you. 🙏`,
  ].join("\n");
}

/* ---------- Invoice math (mirrors the original Shivaa localStorage app) ---------- */

export type Totals = {
  subtotal: number; discountAmount: number; taxable: number; gstAmount: number;
  cgst: number; sgst: number; oldMetalDeduction: number; grandTotal: number;
  amountPaid: number; balanceDue: number;
};

export function computeInvoiceTotals(o: {
  itemTotals: number[]; discountType: string; discountValue: number;
  gstPercent: number; applyGst: boolean; oldMetalTotals: number[];
  roundOff: number; payments: number[];
}): Totals {
  const subtotal = o.itemTotals.reduce((s, n) => s + (n || 0), 0);
  const discountAmount = o.discountType === "₹"
    ? (o.discountValue || 0)
    : subtotal * ((o.discountValue || 0) / 100);
  const taxable = subtotal - discountAmount;
  const gstAmount = o.applyGst ? taxable * ((o.gstPercent || 3) / 100) : 0;
  const oldMetalDeduction = o.oldMetalTotals.reduce((s, n) => s + (n || 0), 0);
  const grandTotal = Math.round(taxable + gstAmount - oldMetalDeduction + (o.roundOff || 0));
  const amountPaid = o.payments.reduce((s, n) => s + (n || 0), 0);
  return {
    subtotal, discountAmount, taxable, gstAmount,
    cgst: gstAmount / 2, sgst: gstAmount / 2,
    oldMetalDeduction, grandTotal, amountPaid,
    balanceDue: Math.max(0, grandTotal - amountPaid),
  };
}

/* ---------- CSV ---------- */

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

/* ---------- Amount in words (Indian system) ---------- */

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return (TENS[Math.floor(n / 10)] + " " + ONES[n % 10]).trim();
}

export function amountInWords(amount: number): string {
  let n = Math.round(Math.abs(amount));
  if (n === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = Math.floor(n / 100); n %= 100;
  if (crore) parts.push(twoDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (hundred) parts.push(ONES[hundred] + " Hundred");
  if (n) parts.push(twoDigits(n));
  return parts.join(" ") + " Rupees Only";
}
