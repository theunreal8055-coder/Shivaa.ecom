import {
  pgTable, serial, text, integer, doublePrecision, timestamp, jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  shopName: text("shop_name").default("Shivaa Jewellers"),
  tagline: text("tagline").default("Fine Gold & Silver"),
  address: text("address").default(""),
  phone: text("phone").default(""),
  gstin: text("gstin").default(""),
  invoicePrefix: text("invoice_prefix").default("SHV"),
  gstPercent: doublePrecision("gst_percent").default(3),
  goldRate: doublePrecision("gold_rate").default(7500),
  silverRate: doublePrecision("silver_rate").default(90),
  ratesUpdatedAt: timestamp("rates_updated_at").defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  sku: text("sku").default(""),
  huid: text("huid").default(""),
  name: text("name").notNull(),
  category: text("category").default("Rings"),
  metal: text("metal").default("Gold"), // Gold | Silver
  purity: text("purity").default("22K (916)"),
  grossWt: doublePrecision("gross_wt").default(0),
  lessWt: doublePrecision("less_wt").default(0),
  stoneWt: doublePrecision("stone_wt").default(0),
  netWt: doublePrecision("net_wt").default(0),
  pieces: integer("pieces").default(1),
  stoneDetails: text("stone_details").default(""),
  status: text("status").default("In Stock"), // In Stock | Sold | Issued
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").default(""),
  email: text("email").default(""),
  address: text("address").default(""),
  city: text("city").default(""),
  pan: text("pan").default(""),
  aadhar: text("aadhar").default(""),
  creditLimit: doublePrecision("credit_limit").default(0),
  creditDays: integer("credit_days").default(0),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company").default(""),
  phone: text("phone").default(""),
  address: text("address").default(""),
  city: text("city").default(""),
  pan: text("pan").default(""),
  gstin: text("gstin").default(""),
  accName: text("acc_name").default(""),
  accNumber: text("acc_number").default(""),
  ifsc: text("ifsc").default(""),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const artisans = pgTable("artisans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").default(""),
  specialization: text("specialization").default(""),
  address: text("address").default(""),
  notes: text("notes").default(""),
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

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invNo: text("inv_no").notNull(),
  type: text("type").notNull(), // GST | Estimate
  customerId: integer("customer_id"),
  customerName: text("customer_name").default(""),
  customerPhone: text("customer_phone").default(""),
  date: text("date").notNull(),
  placeOfSupply: text("place_of_supply").default(""),
  items: jsonb("items").$type<InvoiceItem[]>().default([]),
  oldMetals: jsonb("old_metals").$type<OldMetalRow[]>().default([]),
  payments: jsonb("payments").$type<PaymentRow[]>().default([]),
  subtotal: doublePrecision("subtotal").default(0),
  discountType: text("discount_type").default("%"),
  discountValue: doublePrecision("discount_value").default(0),
  discountAmount: doublePrecision("discount_amount").default(0),
  taxable: doublePrecision("taxable").default(0),
  gstAmount: doublePrecision("gst_amount").default(0),
  oldMetalDeduction: doublePrecision("old_metal_deduction").default(0),
  roundOff: doublePrecision("round_off").default(0),
  grandTotal: doublePrecision("grand_total").default(0),
  amountPaid: doublePrecision("amount_paid").default(0),
  balanceDue: doublePrecision("balance_due").default(0),
  creditDays: integer("credit_days").default(0),
  status: text("status").default("Unpaid"), // Paid | Partial | Unpaid
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export type MetalOutRow = {
  inventoryId: number | null; name: string; metal: string; purity: string;
  netWt: number; wastage: number; fineWt: number;
};
export type MetalInRow = {
  metalType: string; name: string; gross: number; tunch: number; fineWt: number;
};

export const metalInvoices = pgTable("metal_invoices", {
  id: serial("id").primaryKey(),
  billNo: text("bill_no").notNull(),
  partyType: text("party_type").default("customer"), // customer | supplier | other
  partyId: integer("party_id"),
  partyName: text("party_name").default(""),
  date: text("date").notNull(),
  outProducts: jsonb("out_products").$type<MetalOutRow[]>().default([]),
  inMetals: jsonb("in_metals").$type<MetalInRow[]>().default([]),
  fineOutGold: doublePrecision("fine_out_gold").default(0),
  fineInGold: doublePrecision("fine_in_gold").default(0),
  balanceGold: doublePrecision("balance_gold").default(0),
  fineOutSilver: doublePrecision("fine_out_silver").default(0),
  fineInSilver: doublePrecision("fine_in_silver").default(0),
  balanceSilver: doublePrecision("balance_silver").default(0),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const karigarJobs = pgTable("karigar_jobs", {
  id: serial("id").primaryKey(),
  artisanId: integer("artisan_id"),
  artisanName: text("artisan_name").default(""),
  metal: text("metal").default("Gold"),
  category: text("category").default("Rings"),
  purity: text("purity").default("22K (916)"),
  issueDate: text("issue_date").notNull(),
  durationDays: integer("duration_days").default(15),
  labourCharges: doublePrecision("labour_charges").default(0),
  issuedWt: doublePrecision("issued_wt").default(0),
  lessWt: doublePrecision("less_wt").default(0),
  wastagePct: doublePrecision("wastage_pct").default(0),
  receivedWt: doublePrecision("received_wt").default(0),
  status: text("status").default("Pending"), // Pending | In Progress | Completed
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  category: text("category").default("General"),
  description: text("description").default(""),
  amount: doublePrecision("amount").default(0),
  paymentMode: text("payment_mode").default("Cash"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ledgerEntries = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  date: text("date").notNull(),
  type: text("type").notNull(), // debit (udhaar / owed to shop) | credit (received)
  amount: doublePrecision("amount").notNull(),
  mode: text("mode").default(""),
  refType: text("ref_type").default("manual"), // invoice | payment | manual
  refId: integer("ref_id"),
  note: text("note").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  entity: text("entity").default(""),
  entityId: integer("entity_id"),
  detail: text("detail").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});
