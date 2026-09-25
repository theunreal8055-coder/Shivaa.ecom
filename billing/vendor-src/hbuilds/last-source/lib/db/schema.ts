import {
  mysqlTable, int, varchar, double, timestamp, json,
} from "drizzle-orm/mysql-core";

/* ─────────────────────────────────────────────────────────────────────────
   MySQL port of the billing schema (was drizzle-orm/pg-core).

   Three Postgres-isms had to change, and every one is deliberate:

   1. serial        -> int().autoincrement()
   2. text          -> varchar(n).  MySQL TEXT/BLOB columns CANNOT carry a
      DEFAULT, and almost every text column here has one. varchar also gives
      us a usable UNIQUE index on users.email (MySQL needs a key length for
      TEXT, so a unique TEXT column would have to be a prefix index).
      191 is used for email: 191 x 4 bytes (utf8mb4) = 764, safely inside
      InnoDB's 767-byte index-key limit.
   3. jsonb         -> json, and the .default([]) is DROPPED because MySQL
      JSON columns cannot have a DEFAULT either. This is safe: both insert
      sites (lib/actions/invoices.ts, lib/actions/metal.ts) always pass the
      arrays explicitly, and they call .map() on them immediately after, so
      an undefined value would already have thrown under Postgres too.

   doublePrecision -> double is a straight rename.
   timestamp().defaultNow() is unchanged and behaves the same.
   ───────────────────────────────────────────────────────────────────────── */

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = mysqlTable("settings", {
  id: int("id").primaryKey().default(1),
  shopName: varchar("shop_name", { length: 255 }).default("Shivaa Jewellers"),
  tagline: varchar("tagline", { length: 255 }).default("Fine Gold & Silver"),
  address: varchar("address", { length: 500 }).default(""),
  phone: varchar("phone", { length: 255 }).default(""),
  gstin: varchar("gstin", { length: 255 }).default(""),
  invoicePrefix: varchar("invoice_prefix", { length: 255 }).default("SHV"),
  gstPercent: double("gst_percent").default(3),
  goldRate: double("gold_rate").default(7500),
  silverRate: double("silver_rate").default(90),
  ratesUpdatedAt: timestamp("rates_updated_at").defaultNow(),
});

export const inventoryItems = mysqlTable("inventory_items", {
  id: int("id").autoincrement().primaryKey(),
  sku: varchar("sku", { length: 255 }).default(""),
  huid: varchar("huid", { length: 255 }).default(""),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).default("Rings"),
  metal: varchar("metal", { length: 255 }).default("Gold"), // Gold | Silver
  purity: varchar("purity", { length: 255 }).default("22K (916)"),
  grossWt: double("gross_wt").default(0),
  lessWt: double("less_wt").default(0),
  stoneWt: double("stone_wt").default(0),
  netWt: double("net_wt").default(0),
  pieces: int("pieces").default(1),
  stoneDetails: varchar("stone_details", { length: 500 }).default(""),
  status: varchar("status", { length: 255 }).default("In Stock"), // In Stock | Sold | Issued
  notes: varchar("notes", { length: 500 }).default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 255 }).default(""),
  email: varchar("email", { length: 255 }).default(""),
  address: varchar("address", { length: 500 }).default(""),
  city: varchar("city", { length: 255 }).default(""),
  pan: varchar("pan", { length: 255 }).default(""),
  aadhar: varchar("aadhar", { length: 255 }).default(""),
  creditLimit: double("credit_limit").default(0),
  creditDays: int("credit_days").default(0),
  notes: varchar("notes", { length: 500 }).default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }).default(""),
  phone: varchar("phone", { length: 255 }).default(""),
  address: varchar("address", { length: 500 }).default(""),
  city: varchar("city", { length: 255 }).default(""),
  pan: varchar("pan", { length: 255 }).default(""),
  gstin: varchar("gstin", { length: 255 }).default(""),
  accName: varchar("acc_name", { length: 255 }).default(""),
  accNumber: varchar("acc_number", { length: 255 }).default(""),
  ifsc: varchar("ifsc", { length: 255 }).default(""),
  notes: varchar("notes", { length: 500 }).default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const artisans = mysqlTable("artisans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 255 }).default(""),
  specialization: varchar("specialization", { length: 255 }).default(""),
  address: varchar("address", { length: 500 }).default(""),
  notes: varchar("notes", { length: 500 }).default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export type InvoiceItem = {
  inventoryId: number | null;
  name: string; huid: string; metal: string; purity: string;
  netWt: number; pieces: number; rate: number; making: number; totalCost: number;
};
export type OldMetalRow = {
  metalType: string; name: string; tunch: number; givenWt: number;
  netWt: number; rate: number; totalCost: number;
};
export type PaymentRow = { amount: number; mode: string };

export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invNo: varchar("inv_no", { length: 255 }).notNull(),
  type: varchar("type", { length: 255 }).notNull(), // GST | Estimate
  customerId: int("customer_id"),
  customerName: varchar("customer_name", { length: 255 }).default(""),
  customerPhone: varchar("customer_phone", { length: 255 }).default(""),
  date: varchar("date", { length: 255 }).notNull(),
  placeOfSupply: varchar("place_of_supply", { length: 255 }).default(""),
  items: json("items").$type<InvoiceItem[]>(),
  oldMetals: json("old_metals").$type<OldMetalRow[]>(),
  payments: json("payments").$type<PaymentRow[]>(),
  subtotal: double("subtotal").default(0),
  discountType: varchar("discount_type", { length: 255 }).default("%"),
  discountValue: double("discount_value").default(0),
  discountAmount: double("discount_amount").default(0),
  taxable: double("taxable").default(0),
  gstAmount: double("gst_amount").default(0),
  oldMetalDeduction: double("old_metal_deduction").default(0),
  roundOff: double("round_off").default(0),
  grandTotal: double("grand_total").default(0),
  amountPaid: double("amount_paid").default(0),
  balanceDue: double("balance_due").default(0),
  creditDays: int("credit_days").default(0),
  status: varchar("status", { length: 255 }).default("Unpaid"), // Paid | Partial | Unpaid
  notes: varchar("notes", { length: 500 }).default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export type MetalOutRow = {
  inventoryId: number | null; name: string; metal: string; purity: string;
  netWt: number; wastage: number; fineWt: number;
};
export type MetalInRow = {
  metalType: string; name: string; gross: number; tunch: number; fineWt: number;
};

export const metalInvoices = mysqlTable("metal_invoices", {
  id: int("id").autoincrement().primaryKey(),
  billNo: varchar("bill_no", { length: 255 }).notNull(),
  partyType: varchar("party_type", { length: 255 }).default("customer"), // customer | supplier | other
  partyId: int("party_id"),
  partyName: varchar("party_name", { length: 255 }).default(""),
  date: varchar("date", { length: 255 }).notNull(),
  outProducts: json("out_products").$type<MetalOutRow[]>(),
  inMetals: json("in_metals").$type<MetalInRow[]>(),
  fineOutGold: double("fine_out_gold").default(0),
  fineInGold: double("fine_in_gold").default(0),
  balanceGold: double("balance_gold").default(0),
  fineOutSilver: double("fine_out_silver").default(0),
  fineInSilver: double("fine_in_silver").default(0),
  balanceSilver: double("balance_silver").default(0),
  notes: varchar("notes", { length: 500 }).default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const karigarJobs = mysqlTable("karigar_jobs", {
  id: int("id").autoincrement().primaryKey(),
  artisanId: int("artisan_id"),
  artisanName: varchar("artisan_name", { length: 255 }).default(""),
  metal: varchar("metal", { length: 255 }).default("Gold"),
  category: varchar("category", { length: 255 }).default("Rings"),
  purity: varchar("purity", { length: 255 }).default("22K (916)"),
  issueDate: varchar("issue_date", { length: 255 }).notNull(),
  durationDays: int("duration_days").default(15),
  labourCharges: double("labour_charges").default(0),
  issuedWt: double("issued_wt").default(0),
  lessWt: double("less_wt").default(0),
  wastagePct: double("wastage_pct").default(0),
  receivedWt: double("received_wt").default(0),
  status: varchar("status", { length: 255 }).default("Pending"), // Pending | In Progress | Completed
  notes: varchar("notes", { length: 500 }).default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).default("General"),
  description: varchar("description", { length: 500 }).default(""),
  amount: double("amount").default(0),
  paymentMode: varchar("payment_mode", { length: 255 }).default("Cash"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ledgerEntries = mysqlTable("ledger_entries", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customer_id").notNull(),
  date: varchar("date", { length: 255 }).notNull(),
  type: varchar("type", { length: 255 }).notNull(), // debit (udhaar / owed to shop) | credit (received)
  amount: double("amount").notNull(),
  mode: varchar("mode", { length: 255 }).default(""),
  refType: varchar("ref_type", { length: 255 }).default("manual"), // invoice | payment | manual
  refId: int("ref_id"),
  note: varchar("note", { length: 500 }).default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  action: varchar("action", { length: 255 }).notNull(),
  entity: varchar("entity", { length: 255 }).default(""),
  entityId: int("entity_id"),
  detail: varchar("detail", { length: 500 }).default(""),
  createdAt: timestamp("created_at").defaultNow(),
});
