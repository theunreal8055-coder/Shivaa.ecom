import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Users, ShoppingBag, Settings, UserCheck, MapPin, TrendingUp, Printer, ArrowLeft, Pencil, Trash2, Filter, DollarSign, Activity, UploadCloud, ChevronRight, CheckCircle2, DownloadCloud, AlertTriangle, Building2, Landmark, Package, ListChecks, FileText, FileSpreadsheet } from 'lucide-react';

// --- SYSTEM CONSTANTS ---
const INITIAL_CATEGORIES = ['Rings', 'Bangles', 'Necklaces', 'Earrings', 'Chains', 'Mangalsutra', 'Pendants', 'Bracelets', 'Coins', 'Bars', 'Stone', 'CZ', 'Paper Casting', 'Regular Casting'];
const METALS = ['Gold', 'Silver', 'Platinum', 'Both'];
const PURITIES = ['24K', '22K', '20K', '18K', '14K', '9K', '92.5 Silver'];
const SUPPLIER_TYPES = ['Manufacturer', 'Wholesaler', 'Distributor', 'Importer'];
const QUALITY_TIERS = ['Budget-friendly', 'Mid-range', 'Premium'];
const STATUSES = ['New', 'Contacted', 'Active', 'On Hold', 'Blacklisted', 'Top Wholesaler'];
const PRIORITIES = ['Normal', 'Urgent', 'Low Priority', 'High Priority', 'Important', 'High Quality Needed'];
const ORDER_STATUS = ['New', 'Processing', 'Confirmed', 'On Hold', 'Dispatched', 'Delivered', 'Cancelled', 'Delayed'];

// --- 51 REPORTS DATA STRUCTURE ---
const REPORT_CATEGORIES = [
  {
    id: 'cat1', title: 'I. Metal Stock, Purity & Reconciliation',
    reports: [
      { title: 'Pure Metal (24K Fine Equivalent) Conversion Statement', desc: 'Converts multi-karat inventory and order weights into standard pure 99.9% fine equivalents.' },
      { title: 'Metal-Wise Physical Stock Movement Register', desc: 'Tracks physical inward intake vs. outward deliveries for Gold and Silver.' },
      { title: 'Stone Deduction & Net-to-Gross Ratio Audit', desc: 'Details gross weight, stone deductions, and calculated stone percentage ratios.' },
      { title: 'Multi-Karatage Inventory Distribution Breakdown', desc: 'Aggregates total metal holdings and transactions categorized by specific purity grades.' },
      { title: 'Melting Loss & Yield Variance Report', desc: 'Compares gross casting intake against finished output to identify scrap losses.' },
      { title: 'Average Gram-Weight per Piece Benchmark', desc: 'Calculates average weight per piece across categories to monitor lightweighting trends.' },
      { title: 'Daily Metal Opening vs. Closing Balance Sheet', desc: 'A day-end reconciliation statement showing starting stock, purchases, sales, and closing balance.' },
      { title: 'Gold vs. Silver Turnover Comparison Statement', desc: 'Compares volume and turnover velocity between gold and silver product lines.' }
    ]
  },
  {
    id: 'cat2', title: 'II. Wastage & Making Charges Analytics',
    reports: [
      { title: 'Master Supplier Wastage Benchmark & Ranking', desc: 'Ranks all registered suppliers from lowest to highest wastage % per category.' },
      { title: 'Product Category Wastage Spread Matrix', desc: 'A category-wise table showing min, max, and average wastage charged across the market.' },
      { title: 'Client Agreed Wastage vs. Actual Billed Variance', desc: 'Flags discrepancies between pre-negotiated customer rate cards and actual order billing rates.' },
      { title: 'Wastage Arbitrage & Profit Spread Report', desc: 'Compares purchase wastage paid to suppliers against sales wastage charged to customers.' },
      { title: 'Making Charges vs. Wastage Trade-Off Analysis', desc: 'Evaluates total landed cost per gram when balancing fixed making charges against wastage percentages.' },
      { title: 'Manufacturing Technique Wastage Differential', desc: 'Compares wastage across different making types (e.g., Paper Casting vs. Regular Casting).' },
      { title: 'Stone-Setting & CZ Wastage Impact Analysis', desc: 'Measures the extra wastage and setting costs associated with stone-heavy jewellery.' },
      { title: 'Purity-Wise Wastage Fluctuation Audit', desc: 'Tracks how wastage variations behave across different purities (e.g., 22K vs. 18K).' }
    ]
  },
  {
    id: 'cat3', title: 'III. Supplier Procurement Management',
    reports: [
      { title: 'Supplier Master Directory & KYC/Banking Dossier', desc: 'A formal directory compiling company names, contacts, GSTIN, and verified bank credentials.' },
      { title: 'Vendor Procurement Volume & Metal Intake', desc: 'Summarizes total gram weight and transaction counts fulfilled by each vendor.' },
      { title: 'Supplier Quality & Reliability Scorecard', desc: 'Correlates vendor ratings, quality tiers, and fulfillment timelines.' },
      { title: 'Karigar Job-Work Dispatch vs. Receipt Reconciliation', desc: 'Tracks metal issued to karigars against finished ornaments received back.' },
      { title: 'Minimum Order Quantity (MOQ) Compliance Audit', desc: 'Tracks orders against supplier-mandated MOQs to optimize batch procurement sizing.' },
      { title: 'Supplier Settlement Mode Breakdown', desc: 'Categorizes vendor purchasing terms into Advance, Credit, and Cash settlement volumes.' },
      { title: 'Inactive & Dormant Supplier Review Report', desc: 'Lists suppliers with no transactions over 90+ days to clean up vendor databases.' }
    ]
  },
  {
    id: 'cat4', title: 'IV. Customer CRM & B2B Sales',
    reports: [
      { title: 'Client Master Directory & Banking/GSTIN Dossier', desc: 'A ready-to-print B2B customer registry containing legal entity names, GSTIN, and bank details.' },
      { title: 'Client-Specific Agreed Rate Card & Wastage Matrix', desc: 'A client-specific sheet detailing custom wastage terms agreed for specific items.' },
      { title: 'Customer Sales Volume & Turnover Ranking', desc: 'Ranks wholesale and retail clients by total gram purchases and financial turnover.' },
      { title: 'Customer Concentration & 80/20 Pareto Volume', desc: 'Identifies the top 20% of buyers generating 80% of total sales volume.' },
      { title: 'City-Wise & Regional Sales Distribution Report', desc: 'Groups sales volume by delivery destination to pinpoint high-growth regional markets.' },
      { title: 'Client Order Frequency & Dormant Buyer Escalation', desc: 'Highlights regular buyers who have not placed orders within their standard cycle.' },
      { title: 'Client Rate Deviation & Discount Audit', desc: 'Tracks instances where special discounts or reduced wastage rates were manually applied.' }
    ]
  },
  {
    id: 'cat5', title: 'V. Orders, Deals & Production Workflow',
    reports: [
      { title: 'Master Deal Ledger & Transaction History Register', desc: 'A chronological record of every purchase and sale entry with complete details.' },
      { title: 'Live Production Pipeline & Order Status Report', desc: 'Filters open orders by operational status.' },
      { title: 'VIP & Express Priority Workshop Manifest', desc: 'A filtered production punch-list displaying only high-priority orders.' },
      { title: 'Overdue & Delayed Order Escalation Register', desc: 'Lists orders past their committed delivery date, showing days overdue.' },
      { title: 'Place of Supply (POS) Order Fulfillment Report', desc: 'Tracks delivery locations across intrastate and interstate jurisdictions.' },
      { title: 'Official Job-Work / B2B Order Confirmation Voucher', desc: 'A single-order confirmation slip detailing specifications, weight breakdowns, and terms.' },
      { title: 'Piece-Count vs. Metal Volume Fulfillment Ratio', desc: 'Monitors whether order growth is driven by high-volume light goods or heavy sets.' },
      { title: 'Cancelled & On-Hold Orders Root-Cause Summary', desc: 'Logs all cancelled or paused deals with associated notes and remarks.' }
    ]
  },
  {
    id: 'cat6', title: 'VI. Financial, Advances & Cash Flow',
    reports: [
      { title: 'Net Metal Advance (Jama-Udhar) Balance Ledger', desc: 'Tracks outstanding pure/alloy metal advances given to suppliers vs. collected from customers.' },
      { title: 'Cash Advance & Float Liquidity Statement', desc: 'Monitors advance cash deposits received versus cash paid to workshops.' },
      { title: 'Combined Counterparty Balance Sheet', desc: 'Provides a consolidated balance of metal grams and rupee amounts owed to/by any party.' },
      { title: 'Daily Spot-Rate Valuation & Exposure Report', desc: 'Recalculates total open metal stock value against updated live market rates.' },
      { title: 'Credit Aging & Settlement Timeline Analysis', desc: 'Groups outstanding orders and receivables by aging brackets (0–15, 16–30, 30+ days).' },
      { title: 'Auxiliary Charges & Surcharges Summary', desc: 'Aggregates additional costs such as hallmark fees, rhodium plating, and freight.' }
    ]
  },
  {
    id: 'cat7', title: 'VII. Tax, Invoicing & Compliance',
    reports: [
      { title: 'Place of Supply & State-Wise Tax Summary', desc: 'Classifies transactions by state tax jurisdiction to assist with monthly GST reporting.' },
      { title: 'Monthly Inward vs. Outward Taxable Metal', desc: 'Summarizes taxable purchases versus sales values for input tax credit matching.' },
      { title: 'Physical Transit & Logistics Dispatch Manifest', desc: 'Accompanies outward shipments with piece counts, net weights, and consignee data.' },
      { title: 'High-Value Transaction Compliance Register', desc: 'Identifies high-value transactions requiring statutory reporting or PAN/GSTIN verification.' }
    ]
  },
  {
    id: 'cat8', title: 'VIII. Executive Strategic Intelligence',
    reports: [
      { title: 'Seasonal & Festive Demand Trend Report', desc: 'Compares quarterly category volume shifts (pre-Diwali, Akshaya Tritiya, wedding seasons).' },
      { title: 'Product Category Profitability & Margin Index', desc: 'Ranks product categories by net margin contribution after factoring in wastage.' },
      { title: 'Consolidated Enterprise Master Backup Dossier', desc: 'A complete archive combining supplier, client, rate cards, and deal ledgers into a single backup.' }
    ]
  }
];

// --- LOCAL STORAGE HOOK ---
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading localStorage', error);
      return initialValue;
    }
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(storedValue)); } catch (error) { console.error('Error setting localStorage', error); }
  }, [key, storedValue]);
  return [storedValue, setStoredValue];
}

// --- UTILITY: CSV EXPORT ---
const exportToCSV = (data, filenamePrefix) => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = data.map(row => headers.map(fieldName => `"${String(row[fieldName] || '').replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Shivaa_${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

// --- CUSTOM DELETE MODAL ---
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 print:hidden transition-opacity duration-200">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-100 transform transition-all">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-5"><AlertTriangle size={28} /></div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-5 py-2.5 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20 transition-all">Delete Record</button>
        </div>
      </div>
    </div>
  );
};

export default function ShivaaERP() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // -- PERSISTENT LOCAL DATABASE STATE --
  const [categories, setCategories] = useLocalStorage('shivaa_categories', INITIAL_CATEGORIES);
  const [liveRates, setLiveRates] = useLocalStorage('shivaa_rates', { gold: 7500, silver: 90 });
  
  const [suppliers, setSuppliers] = useLocalStorage('shivaa_suppliers', [
    { id: 1, company: 'Annoraa Creations', contact: 'Suken Rathod', phone: '+91-9819448086', city: 'Mumbai', pin: '400002', gst: '27AAAAA0000A1Z5', accName: 'Annoraa Creations Pvt Ltd', accNumber: '000123456789', ifsc: 'HDFC0000001', branch: 'Zaveri Bazar', metal: 'Gold', type: 'Manufacturer', quality: 'Premium', status: 'Top Wholesaler', notes: 'Top tier B2B partner.' }
  ]);
  const [supplierProducts, setSupplierProducts] = useLocalStorage('shivaa_supplier_products', [
    { id: 101, entityId: 1, type: 'supplier', category: 'Rings', purity: '22K', wastage: 1.75, makingType: 'Paper Casting' },
    { id: 102, entityId: 1, type: 'supplier', category: 'Necklaces', purity: '22K', wastage: 3.5, makingType: 'Antique' }
  ]);

  const [customers, setCustomers] = useLocalStorage('shivaa_customers', [
    { id: 1, company: 'Laxmi Jewellers', contact: 'Ramesh', phone: '9876543211', city: 'Bikaner', pin: '334001', gst: '08BBBBB1111B1Z2', accName: 'Laxmi Jewellers', accNumber: '987654321000', ifsc: 'SBIN0001234', branch: 'Main Branch', notes: 'High volume buyer.' }
  ]);
  const [customerRates, setCustomerRates] = useLocalStorage('shivaa_customer_rates', [
    { id: 201, entityId: 1, type: 'customer', category: 'Necklaces', productName: 'Heavy Antique Bridal Sets', wastage: 5.0 }
  ]);

  const [orders, setOrders] = useLocalStorage('shivaa_orders', [
    { id: 301, orderName: 'Diwali Stock', orderType: 'Purchase', entityId: 1, category: 'Necklaces', metal: 'Gold', purity: '22K', pieces: '5', placeOfSupply: 'Mumbai', orderDate: '2026-08-14', deliveryDate: '2026-08-20', grossWt: 250, stoneWt: 20, netWt: 230, fineWt: 230, wastageDecided: 3.5, rate: 7500, makingCharges: 0, advanceMetal: 50, advanceCash: 100000, priority: 'Important', status: 'Delivered' }
  ]);

  // -- LOGIC --
  const dashboardStats = useMemo(() => {
    let gp = 0, gs = 0, sp = 0, ss = 0, completedOrders = 0;
    orders.forEach(o => {
      if (o.status === 'Delivered' || o.status === 'Completed') completedOrders++;
      const wt = parseFloat(o.fineWt || 0);
      if (o.metal === 'Gold') { if (o.orderType === 'Purchase') gp += wt; if (o.orderType === 'Sale') gs += wt; }
      if (o.metal === 'Silver') { if (o.orderType === 'Purchase') sp += wt; if (o.orderType === 'Sale') ss += wt; }
    });
    return { goldPurchased: gp, goldSold: gs, goldTurnover: gp + gs, silverPurchased: sp, silverSold: ss, silverTurnover: sp + ss, completedOrders, totalSuppliers: suppliers.length, totalCustomers: customers.length };
  }, [orders, suppliers, customers]);

  const formatINR = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  const triggerPDFPrint = () => window.print();

  const NAV_ITEMS = [
    { id: 'dashboard', icon: Activity, label: 'Hub' },
    { id: 'suppliers', icon: Building2, label: 'Suppliers' },
    { id: 'orders', icon: ListChecks, label: 'Ledger' },
    { id: 'customers', icon: UserCheck, label: 'Customers' },
    { id: 'reports', icon: FileText, label: 'Reports' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 antialiased pb-20 lg:pb-0">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F8FAFC; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; border: 2px solid #F8FAFC; }
        ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
        @media print { 
          @page { size: landscape; margin: 12mm; }
          body { background: white; }
          .app-ui { display: none !important; } 
          .print-report-engine { display: block !important; width: 100%; color: black; font-family: sans-serif; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px; }
          th, td { border: 1px solid #E2E8F0; padding: 10px; text-align: left; }
          th { background-color: #F8FAFC; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; }
          h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
          h2 { font-size: 16px; font-weight: 700; margin-top: 24px; margin-bottom: 12px; color: #0F172A; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px; }
          h3 { font-size: 14px; font-weight: 700; background: #F8FAFC; padding: 8px; margin-bottom: 12px; border-radius: 4px; border: 1px solid #E2E8F0; }
          .page-break { page-break-before: always; }
        }
      `}} />

      {/* --- PRINT ONLY REPORT ENGINE --- */}
      <div className="hidden print-report-engine">
        <div className="mb-8 border-b-4 border-amber-500 pb-6">
          <h1>Shivaa Enterprise Management</h1>
          <p style={{ color: '#64748B' }}>Master Database Export • Generated: {new Date().toLocaleDateString()}</p>
        </div>
        
        <h2>1. Supplier Directory & Product Matrices</h2>
        {suppliers.map(sup => (
          <div key={sup.id} className="mb-8">
            <h3>{sup.company} <span style={{ fontWeight: 'normal', color: '#64748B', fontSize: '12px' }}>({sup.status} | {sup.type})</span></h3>
            <p style={{ fontSize: '12px', marginBottom: '4px' }}><strong>Contact:</strong> {sup.contact} | {sup.phone} | {sup.city}, {sup.pin} | <strong>GST:</strong> {sup.gst}</p>
            <p style={{ fontSize: '12px', marginBottom: '12px', color: '#475569' }}><strong>Bank Details:</strong> {sup.accName} | A/C: {sup.accNumber} | IFSC: {sup.ifsc} | Branch: {sup.branch}</p>
            <table>
              <thead><tr><th>Category</th><th>Type</th><th>Purity</th><th>Wastage %</th></tr></thead>
              <tbody>
                {supplierProducts.filter(p=>p.entityId===sup.id).map(p => (
                  <tr key={p.id}><td>{p.category}</td><td>{p.makingType}</td><td>{p.purity}</td><td>{p.wastage}%</td></tr>
                ))}
                {supplierProducts.filter(p=>p.entityId===sup.id).length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94A3B8' }}>No products mapped.</td></tr>}
              </tbody>
            </table>
          </div>
        ))}

        <div className="page-break"></div>
        <h2>2. Deal Ledger (Orders)</h2>
        <table>
          <thead><tr><th>Order Ref</th><th>Type</th><th>Party</th><th>Product Details</th><th>Weights</th><th>Wastage %</th><th>Rate</th><th>Status</th></tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={{ fontWeight: 'bold' }}>{o.orderName}</td><td>{o.orderType}</td>
                <td>{o.orderType === 'Purchase' ? suppliers.find(s=>s.id === o.entityId)?.company : customers.find(c=>c.id === o.entityId)?.company}</td>
                <td>{o.metal} {o.category} | {o.pieces} pcs | {o.purity}</td>
                <td>Gross: {o.grossWt}g | Net: {o.netWt}g</td>
                <td>{o.wastageDecided}%</td><td>₹{o.rate || '-'}</td><td>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="page-break"></div>
        <h2>3. Customer CRM & Agreed Rates</h2>
        {customers.map(cust => (
          <div key={cust.id} className="mb-8">
            <h3>{cust.company}</h3>
            <p style={{ fontSize: '12px', marginBottom: '4px' }}><strong>Contact:</strong> {cust.contact} | {cust.phone} | {cust.city}, {cust.pin} | <strong>GST:</strong> {cust.gst}</p>
            <p style={{ fontSize: '12px', marginBottom: '12px', color: '#475569' }}><strong>Bank Details:</strong> {cust.accName} | A/C: {cust.accNumber} | IFSC: {cust.ifsc} | Branch: {cust.branch}</p>
            <table>
              <thead><tr><th>Category</th><th>Product Name / Specs</th><th>Agreed Wastage %</th></tr></thead>
              <tbody>
                {customerRates.filter(r=>r.entityId===cust.id).map(r => (
                  <tr key={r.id}><td>{r.category}</td><td>{r.productName || '-'}</td><td>{r.wastage}%</td></tr>
                ))}
                {customerRates.filter(r=>r.entityId===cust.id).length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', color: '#94A3B8' }}>No rates mapped.</td></tr>}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      {/* --- END PRINT ENGINE --- */}

      <div className="flex h-screen overflow-hidden app-ui">
        
        {/* --- PREMIUM SIDEBAR (Desktop) --- */}
        <aside className="hidden lg:flex flex-col w-[280px] h-full bg-white border-r border-slate-200 shadow-[2px_0_10px_rgba(0,0,0,0.02)] shrink-0 z-10">
          <div className="px-8 py-7 flex items-center gap-4 border-b border-slate-100">
            <div className="flex items-center justify-center w-11 h-11 bg-amber-500 rounded-xl text-white font-black text-xl shadow-[0_4px_12px_rgba(245,158,11,0.3)] shrink-0">S</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shivaa</h1>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-0.5 opacity-90">Enterprise</p>
            </div>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            <p className="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Modules</p>
            {NAV_ITEMS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} 
                className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === tab.id ? 'bg-amber-50 text-amber-700 shadow-[inset_4px_0_0_0_#f59e0b]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}>
                <tab.icon size={20} className={activeTab === tab.id ? 'text-amber-500' : 'text-slate-400'} /> {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* --- MAIN WORKSPACE --- */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#F8FAFC]">
          <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-40 shrink-0">
            <h2 className="text-xl font-bold text-slate-800 capitalize tracking-tight flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              {activeTab.replace('-', ' ')}
            </h2>
            <button onClick={triggerPDFPrint} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
              <Printer size={16} className="text-slate-400"/> <span className="hidden sm:inline">Export PDF Report</span>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 pb-32 lg:pb-10">
            <div className="max-w-[85rem] mx-auto w-full">
              
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* GOLD METRICS */}
                  <div className="bg-white p-6 sm:p-8 rounded-[1.5rem] border border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-6">
                       <h3 className="font-bold text-slate-900 text-2xl flex items-center gap-3 tracking-tight">
                         <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold shadow-md shadow-amber-500/20">Au</div> Gold Exchange
                       </h3>
                       <div className="flex items-center gap-3 bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-200">
                         <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Live Rate:</span>
                         <span className="font-bold text-slate-400">₹</span>
                         <input type="number" value={liveRates.gold} onChange={e => setLiveRates({...liveRates, gold: Number(e.target.value)})} className="w-24 font-bold text-xl bg-transparent focus:outline-none text-slate-900 text-right" />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mb-1.5">Purchased Volume</p>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{dashboardStats.goldPurchased} <span className="text-sm sm:text-base text-slate-400 font-medium">g</span></p>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mb-1.5">Sold Volume</p>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{dashboardStats.goldSold} <span className="text-sm sm:text-base text-slate-400 font-medium">g</span></p>
                      </div>
                      <div className="bg-slate-900 p-5 rounded-2xl shadow-lg shadow-slate-900/10 text-white flex flex-col justify-center border border-slate-800 col-span-2 sm:col-span-1">
                        <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mb-1.5">Gross Physical</p>
                        <p className="text-2xl sm:text-3xl font-bold tracking-tight">{dashboardStats.goldTurnover} <span className="text-sm sm:text-base text-slate-500 font-medium">g</span></p>
                      </div>
                      <div className="col-span-2 bg-white p-6 rounded-2xl border border-slate-200 flex flex-col justify-center shadow-sm">
                        <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-widest mb-1.5">Market Valuation (INR)</p>
                        <p className="text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight">{formatINR(dashboardStats.goldTurnover * liveRates.gold)}</p>
                      </div>
                    </div>
                  </div>

                  {/* SILVER METRICS */}
                  <div className="bg-white p-6 sm:p-8 rounded-[1.5rem] border border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-6">
                       <h3 className="font-bold text-slate-900 text-2xl flex items-center gap-3 tracking-tight">
                         <div className="w-10 h-10 rounded-xl bg-slate-500 flex items-center justify-center text-white font-bold shadow-md shadow-slate-500/20">Ag</div> Silver Exchange
                       </h3>
                       <div className="flex items-center gap-3 bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-200">
                         <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Live Rate:</span>
                         <span className="font-bold text-slate-400">₹</span>
                         <input type="number" value={liveRates.silver} onChange={e => setLiveRates({...liveRates, silver: Number(e.target.value)})} className="w-24 font-bold text-xl bg-transparent focus:outline-none text-slate-900 text-right" />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mb-1.5">Purchased Volume</p>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{dashboardStats.silverPurchased} <span className="text-sm sm:text-base text-slate-400 font-medium">g</span></p>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mb-1.5">Sold Volume</p>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{dashboardStats.silverSold} <span className="text-sm sm:text-base text-slate-400 font-medium">g</span></p>
                      </div>
                      <div className="bg-slate-900 p-5 rounded-2xl shadow-lg shadow-slate-900/10 text-white flex flex-col justify-center border border-slate-800 col-span-2 sm:col-span-1">
                        <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mb-1.5">Gross Physical</p>
                        <p className="text-2xl sm:text-3xl font-bold tracking-tight">{dashboardStats.silverTurnover} <span className="text-sm sm:text-base text-slate-500 font-medium">g</span></p>
                      </div>
                      <div className="col-span-2 bg-white p-6 rounded-2xl border border-slate-200 flex flex-col justify-center shadow-sm">
                        <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-widest mb-1.5">Market Valuation (INR)</p>
                        <p className="text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight">{formatINR(dashboardStats.silverTurnover * liveRates.silver)}</p>
                      </div>
                    </div>
                  </div>

                  {/* INTERACTIVE NAVIGATION CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    <button onClick={() => setActiveTab('orders')} className="bg-white p-8 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-200 hover:shadow-md transition-all text-left w-full group">
                      <div><p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Completed Deals</p><p className="text-4xl font-bold text-slate-900 tracking-tight">{dashboardStats.completedOrders}</p></div>
                      <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"><ListChecks size={28}/></div>
                    </button>
                    <button onClick={() => setActiveTab('suppliers')} className="bg-white p-8 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center justify-between hover:border-amber-200 hover:shadow-md transition-all text-left w-full group">
                      <div><p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Active Suppliers</p><p className="text-4xl font-bold text-slate-900 tracking-tight">{dashboardStats.totalSuppliers}</p></div>
                      <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"><Building2 size={28}/></div>
                    </button>
                    <button onClick={() => setActiveTab('customers')} className="bg-white p-8 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center justify-between hover:border-emerald-200 hover:shadow-md transition-all text-left w-full group">
                      <div><p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Total Customers</p><p className="text-4xl font-bold text-slate-900 tracking-tight">{dashboardStats.totalCustomers}</p></div>
                      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"><UserCheck size={28}/></div>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'suppliers' && <SupplierModule suppliers={suppliers} setSuppliers={setSuppliers} products={supplierProducts} setProducts={setSupplierProducts} />}
              {activeTab === 'orders' && <OrderModule orders={orders} setOrders={setOrders} suppliers={suppliers} customers={customers} categories={categories} />}
              {activeTab === 'customers' && <CustomerModule customers={customers} setCustomers={setCustomers} rates={customerRates} setRates={setCustomerRates} />}
              {activeTab === 'reports' && <ReportsModule orders={orders} suppliers={suppliers} customers={customers} />}
              
              {activeTab === 'settings' && (
                <div className="max-w-4xl bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200 p-8 sm:p-12">
                  <h2 className="text-3xl font-bold text-slate-900 mb-8 tracking-tight border-b border-slate-100 pb-6">System Architecture</h2>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-5">Product Categories Taxonomy</h3>
                    <div className="flex flex-wrap gap-3 mb-8">
                      {categories.map((cat, i) => <span key={i} className="bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200">{cat}</span>)}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 no-print max-w-lg">
                      <input type="text" id="newCat" placeholder="Define new category..." className="flex-1 px-5 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm font-medium" />
                      <button onClick={() => {
                        const val = document.getElementById('newCat').value;
                        if(val) { setCategories([...categories, val]); document.getElementById('newCat').value='';}
                      }} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all text-sm shadow-md shadow-slate-900/10">Inject Category</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* --- TABLET / MOBILE BOTTOM NAVIGATION BAR --- */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 flex justify-around items-center px-2 py-3 pb-safe app-ui">
        {NAV_ITEMS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center w-16 gap-1 transition-all ${activeTab === tab.id ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <div className={`p-1.5 rounded-full ${activeTab === tab.id ? 'bg-amber-50' : 'bg-transparent'}`}>
              <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider truncate w-full text-center">{tab.label}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}

// ---------------------------------------------------------------------------
// REPORT CENTER MODULE
// ---------------------------------------------------------------------------
function ReportsModule({ orders, suppliers, customers }) {
  const [activeCategory, setActiveCategory] = useState(REPORT_CATEGORIES[0].id);

  const handleExportPDF = () => window.print();

  const handleExportCSV = (reportTitle) => {
    if (activeCategory === 'cat1' || activeCategory === 'cat5' || activeCategory === 'cat6') exportToCSV(orders, reportTitle.substring(0, 15));
    else if (activeCategory === 'cat2' || activeCategory === 'cat3') exportToCSV(suppliers, reportTitle.substring(0, 15));
    else exportToCSV(customers, reportTitle.substring(0, 15));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Category Sidebar */}
      <div className="w-full lg:w-1/3 xl:w-1/4 shrink-0 space-y-2 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0">
        <h3 className="hidden lg:block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-2">Report Domains</h3>
        {REPORT_CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className={`text-left px-5 py-4 rounded-[1.25rem] font-bold text-sm transition-all duration-200 whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink ${
              activeCategory === cat.id ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm'
            }`}>
            {cat.title}
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="flex-1">
        <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200 p-6 md:p-10">
          <div className="border-b border-slate-100 pb-6 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{REPORT_CATEGORIES.find(c => c.id === activeCategory)?.title}</h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">Select a specific report below to generate standard documentation or extract raw CSV data.</p>
          </div>
          <div className="space-y-4">
            {REPORT_CATEGORIES.find(c => c.id === activeCategory)?.reports.map((rep, idx) => (
              <div key={idx} className="p-6 rounded-[1.5rem] border border-slate-200 hover:border-amber-200 hover:shadow-md transition-all duration-300 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  <h4 className="text-base font-bold text-slate-900">{rep.title}</h4>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{rep.desc}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => handleExportCSV(rep.title)} className="bg-white border border-slate-200 text-slate-600 p-3 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm" title="Download Raw CSV">
                    <FileSpreadsheet size={18} />
                  </button>
                  <button onClick={handleExportPDF} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors shadow-md flex items-center gap-2">
                    <Printer size={16}/> Gen PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUPPLIER MODULE
// ---------------------------------------------------------------------------
function SupplierModule({ suppliers, setSuppliers, products, setProducts }) {
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const fileImportRef = useRef(null);
  const [filterQuality, setFilterQuality] = useState('All');
  const [sortWastage, setSortWastage] = useState('none');

  const emptyForm = { company: '', contact: '', phone: '', city: '', pin: '', gst: '', accNumber: '', ifsc: '', branch: '', accName: '', type: 'Wholesaler', quality: 'Premium', status: 'New', notes: '' };
  const [formData, setFormData] = useState(emptyForm);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [newProd, setNewProd] = useState({ category: INITIAL_CATEGORIES[0], purity: '22K', makingType: 'Plain', wastage: '', otherCost: '' });

  const filteredSuppliers = useMemo(() => {
    let res = [...suppliers];
    if (filterQuality !== 'All') res = res.filter(s => s.quality === filterQuality);
    return res;
  }, [suppliers, filterQuality]);

  const handleEdit = (sup) => { 
    setFormData(sup); setEditingId(sup.id); 
    setPendingProducts(products.filter(p => p.entityId === sup.id && p.type === 'supplier'));
    setView('form'); 
  };
  
  const triggerDelete = (id) => setDeleteModal({ isOpen: true, id });
  const confirmDelete = () => { setSuppliers(suppliers.filter(s => s.id !== deleteModal.id)); setDeleteModal({ isOpen: false, id: null }); };

  const handleSave = (e) => {
    e.preventDefault();
    const saveId = editingId || Date.now();
    if (editingId) setSuppliers(suppliers.map(s => s.id === saveId ? { ...formData, id: saveId } : s));
    else setSuppliers([{ ...formData, id: saveId }, ...suppliers]);
    
    const otherProducts = products.filter(p => p.entityId !== saveId || p.type !== 'supplier');
    const updatedProducts = pendingProducts.map(p => ({ ...p, entityId: saveId, type: 'supplier', id: p.id || Date.now() + Math.random() }));
    setProducts([...updatedProducts, ...otherProducts]);
    setView('list');
  };

  const addPendingProduct = () => {
    if(!newProd.wastage) return;
    setPendingProducts([...pendingProducts, { ...newProd, id: Date.now() }]);
    setNewProd({ category: INITIAL_CATEGORIES[0], purity: '22K', makingType: 'Plain', wastage: '', otherCost: '' });
  };

  const handleCsvImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const rows = evt.target.result.split('\n').filter(row => row.trim() !== '');
      if (rows.length < 2) return;
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      const newSups = rows.slice(1).map((row, index) => {
        const values = row.split(',').map(v => v.trim());
        let obj = { ...emptyForm, id: Date.now() + index };
        headers.forEach((h, i) => {
          if (h.includes('company') || h.includes('name')) obj.company = values[i];
          else if (h.includes('contact')) obj.contact = values[i];
          else if (h.includes('phone')) obj.phone = values[i];
          else if (h.includes('city')) obj.city = values[i];
        });
        if (!obj.company) obj.company = `Imported Supplier ${index+1}`; return obj;
      });
      setSuppliers([...newSups, ...suppliers]); 
    };
    reader.readAsText(file); e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <ConfirmModal isOpen={deleteModal.isOpen} title="Delete Supplier Record?" message="This will permanently remove the supplier from your database. Proceed?" onCancel={() => setDeleteModal({ isOpen: false, id: null })} onConfirm={confirmDelete} />
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 no-print pb-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Supplier Matrix</h2>
        {view === 'list' ? (
          <div className="flex flex-wrap gap-3 items-center">
            <input type="file" accept=".csv" ref={fileImportRef} onChange={handleCsvImport} className="hidden" />
            <button onClick={() => fileImportRef.current.click()} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"><UploadCloud size={16}/> <span className="hidden sm:inline">Import CSV</span></button>
            <button onClick={() => exportToCSV(suppliers, 'Suppliers')} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"><DownloadCloud size={16}/> <span className="hidden sm:inline">Export CSV</span></button>
            <button onClick={() => { setEditingId(null); setFormData(emptyForm); setPendingProducts([]); setView('form'); }} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-md shadow-amber-500/20 transition-all"><Plus size={16} /> <span className="hidden sm:inline">Onboard Supplier</span><span className="sm:hidden">New</span></button>
          </div>
        ) : <button onClick={() => setView('list')} className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"><ArrowLeft size={16} /> Back</button>}
      </div>

      {view === 'list' && (
        <div className="flex flex-wrap gap-4 mb-6 bg-white px-4 sm:px-6 py-4 rounded-[1.5rem] border border-slate-200 shadow-sm no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Filter size={16}/></div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest hidden sm:inline">Filter Quality:</span>
            <select value={filterQuality} onChange={e=>setFilterQuality(e.target.value)} className="text-sm font-bold border-none bg-transparent focus:ring-0 cursor-pointer text-slate-800">
              <option>All Tiers</option>{QUALITY_TIERS.map(q => <option key={q}>{q}</option>)}
            </select>
          </div>
          <div className="hidden sm:block w-px h-8 bg-slate-100"></div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-500"><TrendingUp size={16}/></div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest hidden sm:inline">Analyze Wastage:</span>
            <select value={sortWastage} onChange={e=>setSortWastage(e.target.value)} className="text-sm font-bold border-none bg-transparent focus:ring-0 cursor-pointer text-amber-600">
              <option value="none">Standard View</option>
              <option value="asc">Lowest to Highest Rate</option>
              <option value="desc">Highest to Lowest Rate</option>
            </select>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="bg-white rounded-[1.5rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              {sortWastage === 'none' ? (
                <tr><th className="px-6 py-5 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Corporate Profile</th><th className="px-6 py-5 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Banking & Tax</th><th className="px-6 py-5 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Classification</th><th className="px-6 py-5 text-right font-bold text-slate-500 text-[11px] uppercase tracking-widest no-print">Actions</th></tr>
              ) : (
                <tr><th className="px-6 py-5 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Supplier Name</th><th className="px-6 py-5 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Product Config</th><th className="px-6 py-5 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Wastage %</th><th className="px-6 py-5 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Quality Tier</th></tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortWastage === 'none' ? (
                filteredSuppliers.map(sup => (
                  <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-900 text-lg">{sup.company}</p>
                      <p className="text-sm text-slate-600 mt-1 font-medium">{sup.contact} • {sup.phone}</p>
                      <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider">{sup.city}, {sup.pin}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-semibold text-slate-800">GST: <span className="font-medium text-slate-600">{sup.gst || 'N/A'}</span></p>
                      <p className="text-sm text-slate-600 mt-1 font-medium">{sup.accName}</p>
                      <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider">A/C: {sup.accNumber} • IFSC: {sup.ifsc}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/50 text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1.5 inline-block shadow-sm">{sup.status}</span><br/>
                      <span className="text-xs font-semibold text-slate-500">{sup.quality} | {sup.type}</span>
                    </td>
                    <td className="px-6 py-5 text-right no-print">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(sup)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"><Pencil size={18}/></button>
                        <button onClick={() => triggerDelete(sup.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                [...products].filter(p => p.type==='supplier').sort((a,b) => sortWastage === 'asc' ? a.wastage - b.wastage : b.wastage - a.wastage).map(p => {
                  const sup = suppliers.find(s => s.id === p.entityId);
                  if (!sup || (filterQuality !== 'All' && sup.quality !== filterQuality)) return null;
                  return (
                    <tr key={p.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-6 py-5"><p className="font-bold text-slate-900 text-base">{sup.company}</p><p className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">{sup.city}</p></td>
                      <td className="px-6 py-5"><p className="font-semibold text-slate-800 text-sm">{p.category} <span className="font-normal text-slate-500">({p.makingType})</span></p><span className="text-[10px] font-bold text-amber-700 bg-amber-100/50 border border-amber-200/50 px-2 py-0.5 rounded mt-1.5 inline-block">{p.purity}</span></td>
                      <td className="px-6 py-5"><span className="text-xl font-bold text-amber-600 tracking-tight">{p.wastage}%</span></td>
                      <td className="px-6 py-5"><span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 inline-block shadow-sm">{sup.quality}</span></td>
                    </tr>
                  );
                })
              )}
              {sortWastage === 'none' && filteredSuppliers.length === 0 && <tr><td colSpan="4" className="p-12 text-center text-slate-400 font-medium">No records matching criteria.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {view === 'form' && (
        <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 md:p-12 rounded-[2rem] border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-8 sm:space-y-10">
          <div className="border-b border-slate-100 pb-6 mb-8"><h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{editingId ? 'Edit Supplier Profile' : 'Onboard New Partner'}</h3></div>
          
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2"><Building2 size={16}/> 1. Corporate Identity</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="sm:col-span-2"><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Company Name</label><input required value={formData.company} onChange={e=>setFormData({...formData, company:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-semibold" /></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Contact Person</label><input required value={formData.contact} onChange={e=>setFormData({...formData, contact:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Phone</label><input required value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">City</label><input required value={formData.city} onChange={e=>setFormData({...formData, city:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Pin Code</label><input value={formData.pin} onChange={e=>setFormData({...formData, pin:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 mt-8 border-t border-slate-100 pt-8"><Landmark size={16}/> 2. Financial Routing</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">GST Number</label><input value={formData.gst} onChange={e=>setFormData({...formData, gst:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
              <div className="sm:col-span-2"><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Account Name</label><input value={formData.accName} onChange={e=>setFormData({...formData, accName:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Account Number</label><input value={formData.accNumber} onChange={e=>setFormData({...formData, accNumber:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">IFSC Code</label><input value={formData.ifsc} onChange={e=>setFormData({...formData, ifsc:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Branch</label><input value={formData.branch} onChange={e=>setFormData({...formData, branch:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 mt-8 border-t border-slate-100 pt-8"><ListChecks size={16}/> 3. Vendor Classification</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Type</label><select value={formData.type} onChange={e=>setFormData({...formData, type:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium appearance-none cursor-pointer">{SUPPLIER_TYPES.map(m=><option key={m}>{m}</option>)}</select></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Tier</label><select value={formData.quality} onChange={e=>setFormData({...formData, quality:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium appearance-none cursor-pointer">{QUALITY_TIERS.map(m=><option key={m}>{m}</option>)}</select></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Status</label><select value={formData.status} onChange={e=>setFormData({...formData, status:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium appearance-none cursor-pointer">{STATUSES.map(m=><option key={m}>{m}</option>)}</select></div>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 mt-8 border-t border-slate-100 pt-8"><Package size={16}/> 4. Rate Configurations</h4>
            <div className="border border-slate-200 rounded-[1.5rem] p-6 mb-6 bg-slate-50/50 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                <div className="col-span-2 md:col-span-1"><label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Category</label><select value={newProd.category} onChange={e=>setNewProd({...newProd, category:e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-medium appearance-none cursor-pointer">{INITIAL_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                <div><label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Purity</label><select value={newProd.purity} onChange={e=>setNewProd({...newProd, purity:e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-medium appearance-none cursor-pointer">{PURITIES.map(p=><option key={p}>{p}</option>)}</select></div>
                <div><label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Spec/Type</label><input value={newProd.makingType} onChange={e=>setNewProd({...newProd, makingType:e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-medium" placeholder="Antique" /></div>
                <div><label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Wastage %</label><input type="number" step="0.01" value={newProd.wastage} onChange={e=>setNewProd({...newProd, wastage:e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-bold shadow-inner" /></div>
                <div><label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Fixed Cost</label><input value={newProd.otherCost} onChange={e=>setNewProd({...newProd, otherCost:e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-medium" placeholder="₹/g" /></div>
                <div className="col-span-2 md:col-span-1"><button type="button" onClick={addPendingProduct} className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-md text-sm uppercase tracking-wider">Add Rule</button></div>
              </div>
            </div>
            
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm block">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="flex w-full">
                    <th className="px-6 py-4 w-1/2 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Product Details</th>
                    <th className="px-6 py-4 w-1/3 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Wastage Config</th>
                    <th className="px-6 py-4 w-1/6 text-right font-bold text-slate-500 text-[11px] uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 flex flex-col w-full">
                  {pendingProducts.map(p => (
                    <tr key={p.id} className="flex w-full items-center hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 w-1/2">
                        <div className="flex items-center gap-3">
                           <span className="font-bold text-slate-800 text-sm">{p.category} <span className="font-normal text-slate-500">({p.makingType})</span></span>
                           <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded uppercase tracking-widest">{p.purity}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 w-1/3"><span className="text-lg font-black text-amber-600 tracking-tight">{p.wastage}%</span></td>
                      <td className="px-6 py-4 w-1/6 text-right"><button type="button" onClick={() => setPendingProducts(pendingProducts.filter(x=>x.id!==p.id))} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors inline-flex justify-center"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                  {pendingProducts.length === 0 && <tr className="flex w-full"><td colSpan="3" className="px-6 py-8 text-center text-slate-400 text-xs font-semibold uppercase tracking-widest w-full">Matrix Empty</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-8"><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Internal Notes</label><textarea value={formData.notes} onChange={e=>setFormData({...formData, notes:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" rows="2"></textarea></div>

          <div className="pt-8 flex justify-end"><button type="submit" className="bg-amber-500 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 w-full sm:w-auto justify-center"><CheckCircle2 size={18}/> {editingId ? 'Commit Update' : 'Finalize Record'}</button></div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ORDER MODULE
// ---------------------------------------------------------------------------
function OrderModule({ orders, setOrders, suppliers, customers, categories }) {
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const emptyForm = { orderName: '', orderType: 'Purchase', entityId: '', metal: 'Gold', category: INITIAL_CATEGORIES[0], pieces: '', purity: '22K', priority: 'Normal', status: 'New', placeOfSupply: '', orderDate: new Date().toISOString().split('T')[0], deliveryDate: '', grossWt: '', stoneWt: '', netWt: '', wastageDecided: '', rate: '', makingCharges: '', advanceMetal: '', advanceCash: '' };
  const [nf, setNf] = useState(emptyForm);

  const handleSave = (e) => {
    e.preventDefault();
    const g = parseFloat(nf.grossWt) || 0; const s = parseFloat(nf.stoneWt) || 0; const n = g - s;
    const orderData = { ...nf, entityId: parseInt(nf.entityId), grossWt: g, stoneWt: s, netWt: n, fineWt: n };
    if (editingId) setOrders(orders.map(o => o.id === editingId ? { ...orderData, id: editingId } : o));
    else setOrders([{ ...orderData, id: Date.now() }, ...orders]);
    setView('list');
  };
  
  const editOrder = (o) => { setNf(o); setEditingId(o.id); setView('form'); };
  const triggerDelete = (id) => setDeleteModal({ isOpen: true, id });
  const confirmDelete = () => { setOrders(orders.filter(o => o.id !== deleteModal.id)); setDeleteModal({ isOpen: false, id: null }); };

  return (
    <div className="space-y-6">
      <ConfirmModal isOpen={deleteModal.isOpen} title="Delete Ledger Entry?" message="This removes the transaction permanently from financial records." onCancel={() => setDeleteModal({ isOpen: false, id: null })} onConfirm={confirmDelete} />
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 no-print pb-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Deal Ledger</h2>
        {view === 'list' ? (
          <div className="flex gap-4 items-center">
             <button onClick={() => exportToCSV(orders, 'Orders')} className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"><DownloadCloud size={16}/> <span className="hidden sm:inline">Export CSV</span></button>
             <button onClick={() => { setEditingId(null); setNf(emptyForm); setView('form'); }} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-md shadow-amber-500/20 transition-all"><Plus size={16}/> <span className="hidden sm:inline">Record Deal</span><span className="sm:hidden">New</span></button>
          </div>
        ) : <button onClick={() => setView('list')} className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"><ArrowLeft size={16} /> Back</button>}
      </div>

      {view === 'list' && (
        <div className="bg-white rounded-[1.5rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr><th className="px-6 py-5 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Transaction ID</th><th className="px-6 py-5 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Counterparty</th><th className="px-6 py-5 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Asset Specifics</th><th className="px-6 py-5 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Status Flow</th><th className="px-6 py-5 text-right font-bold text-slate-500 text-[11px] uppercase tracking-widest no-print">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-bold text-slate-900 text-lg tracking-tight">{o.orderName}</p>
                    <span className={`inline-block mt-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${o.orderType==='Purchase'?'bg-blue-50 border-blue-200/50 text-blue-700':'bg-emerald-50 border-emerald-200/50 text-emerald-700'}`}>{o.orderType}</span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-semibold text-slate-800 text-base">{o.orderType === 'Purchase' ? suppliers.find(s=>s.id === o.entityId)?.company : customers.find(c=>c.id === o.entityId)?.company}</p>
                    <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider">POS: {o.placeOfSupply || 'N/A'}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-bold text-slate-800">{o.metal} <span className="font-medium text-slate-500">| {o.category}</span></p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{o.pieces} Pcs • {o.purity}</p>
                    <p className="font-black text-amber-600 text-xl tracking-tight mt-1.5">{o.netWt}g <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-md ml-2 text-amber-700 relative bottom-0.5">W: {o.wastageDecided}%</span></p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest mb-1.5 inline-block shadow-sm ${o.status==='Delivered'?'bg-emerald-50 text-emerald-700 border-emerald-200/50': o.status==='Cancelled'?'bg-red-50 text-red-700 border-red-200/50' : 'bg-amber-50 text-amber-700 border-amber-200/50'}`}>{o.status}</span><br/>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Due: {o.deliveryDate}</span>
                  </td>
                  <td className="px-6 py-5 text-right no-print">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={() => editOrder(o)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"><Pencil size={18}/></button>
                       <button onClick={() => triggerDelete(o.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-slate-400 font-medium">No ledger entries recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {view === 'form' && (
        <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 md:p-12 rounded-[2rem] border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-8 sm:space-y-10">
          <div className="border-b border-slate-100 pb-6 mb-8"><h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{editingId ? 'Update Entry' : 'Record Transaction'}</h3></div>
          
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2"><Building2 size={16}/> 1. Counterparty Assignment</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Flow Type *</label><select required value={nf.orderType} onChange={e=>setNf({...nf, orderType:e.target.value, entityId:''})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold appearance-none cursor-pointer"><option>Purchase</option><option>Sale</option></select></div>
              <div className="sm:col-span-2 lg:col-span-3"><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Reference ID / Label *</label><input required value={nf.orderName} onChange={e=>setNf({...nf, orderName:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold" /></div>
              <div className="sm:col-span-2"><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">{nf.orderType==='Purchase'?'Vendor Partner':'Client Partner'} *</label><select required value={nf.entityId} onChange={e=>setNf({...nf, entityId:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-semibold appearance-none cursor-pointer"><option value="">-- Select --</option>{nf.orderType==='Purchase' ? suppliers.map(s=><option key={s.id} value={s.id}>{s.company}</option>) : customers.map(c=><option key={c.id} value={c.id}>{c.company}</option>)}</select></div>
              <div className="sm:col-span-2"><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Place of Supply</label><input value={nf.placeOfSupply} onChange={e=>setNf({...nf, placeOfSupply:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 mt-8 border-t border-slate-100 pt-8"><Package size={16}/> 2. Asset Specifics</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Metal Base</label><select value={nf.metal} onChange={e=>setNf({...nf, metal:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium appearance-none cursor-pointer"><option>Gold</option><option>Silver</option></select></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Category</label><select value={nf.category} onChange={e=>setNf({...nf, category:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium appearance-none cursor-pointer">{categories.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Purity Scale</label><select value={nf.purity} onChange={e=>setNf({...nf, purity:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium appearance-none cursor-pointer">{PURITIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Quantity (Pcs)</label><input type="number" value={nf.pieces} onChange={e=>setNf({...nf, pieces:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 mt-8 border-t border-slate-100 pt-8"><Activity size={16}/> 3. Valuations & Logistics</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 p-6 sm:p-8 rounded-[1.5rem] border border-amber-200 bg-amber-50/40 shadow-inner">
              <div><label className="block text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2 ml-1">Gross Wt (g) *</label><input required type="number" step="0.01" value={nf.grossWt} onChange={e=>setNf({...nf, grossWt:e.target.value})} className="w-full px-5 py-3.5 bg-white border border-amber-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-black shadow-sm" /></div>
              <div><label className="block text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2 ml-1">Stone / Extra (g)</label><input type="number" step="0.01" value={nf.stoneWt} onChange={e=>setNf({...nf, stoneWt:e.target.value})} className="w-full px-5 py-3.5 bg-white border border-amber-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-semibold shadow-sm" /></div>
              <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Net Wt (Auto)</label><input disabled value={nf.grossWt ? (nf.grossWt - (nf.stoneWt||0)).toFixed(2) : ''} className="w-full px-5 py-3.5 bg-slate-100 border border-transparent text-slate-700 rounded-xl font-black cursor-not-allowed" /></div>
              <div><label className="block text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2 ml-1">Wastage % *</label><input required type="number" step="0.01" value={nf.wastageDecided} onChange={e=>setNf({...nf, wastageDecided:e.target.value})} className="w-full px-5 py-3.5 bg-white border border-amber-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-black shadow-sm" /></div>
              
              <div className="col-span-full border-t border-amber-200/50 my-2"></div>

              <div><label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 ml-1">Fixed Rate (₹)</label><input type="number" value={nf.rate} onChange={e=>setNf({...nf, rate:e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium shadow-sm" /></div>
              <div><label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 ml-1">Making Chg (₹)</label><input type="number" value={nf.makingCharges} onChange={e=>setNf({...nf, makingCharges:e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium shadow-sm" /></div>
              <div><label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 ml-1">Advance Metal (g)</label><input type="number" step="0.01" value={nf.advanceMetal} onChange={e=>setNf({...nf, advanceMetal:e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium shadow-sm" /></div>
              <div><label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 ml-1">Advance Cash (₹)</label><input type="number" value={nf.advanceCash} onChange={e=>setNf({...nf, advanceCash:e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium shadow-sm" /></div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-6">
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Order Date</label><input type="date" value={nf.orderDate} onChange={e=>setNf({...nf, orderDate:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Delivery Due *</label><input required type="date" value={nf.deliveryDate} onChange={e=>setNf({...nf, deliveryDate:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold shadow-inner" /></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Priority</label><select value={nf.priority} onChange={e=>setNf({...nf, priority:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium appearance-none cursor-pointer">{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Workflow Status</label><select value={nf.status} onChange={e=>setNf({...nf, status:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold text-amber-700 appearance-none cursor-pointer">{ORDER_STATUS.map(p=><option key={p}>{p}</option>)}</select></div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex justify-end"><button type="submit" className="bg-amber-500 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 w-full sm:w-auto justify-center"><CheckCircle2 size={18}/> Commit Ledger Entry</button></div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CUSTOMER MODULE
// ---------------------------------------------------------------------------
function CustomerModule({ customers, setCustomers, rates, setRates }) {
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const emptyForm = { company: '', contact: '', phone: '', city: '', pin: '', gst: '', accNumber: '', ifsc: '', branch: '', accName: '', notes: '' };
  const [formData, setFormData] = useState(emptyForm);
  
  const [pendingRates, setPendingRates] = useState([]);
  const [newRate, setNewRate] = useState({ category: INITIAL_CATEGORIES[0], productName: '', wastage: '' });

  const handleEdit = (cust) => { 
    setFormData(cust); setEditingId(cust.id); 
    setPendingRates(rates.filter(r => r.entityId === cust.id && r.type === 'customer'));
    setView('form'); 
  };
  
  const triggerDelete = (id) => setDeleteModal({ isOpen: true, id });
  const confirmDelete = () => { setCustomers(customers.filter(c => c.id !== deleteModal.id)); setDeleteModal({ isOpen: false, id: null }); };

  const handleSave = (e) => {
    e.preventDefault();
    const saveId = editingId || Date.now();
    if (editingId) setCustomers(customers.map(c => c.id === saveId ? { ...formData, id: saveId } : c));
    else setCustomers([{ ...formData, id: saveId }, ...customers]);
    
    const otherRates = rates.filter(r => r.entityId !== saveId || r.type !== 'customer');
    const updatedRates = pendingRates.map(r => ({ ...r, entityId: saveId, type: 'customer', id: r.id || Date.now() + Math.random() }));
    setRates([...updatedRates, ...otherRates]);
    setView('list');
  };

  const addPendingRate = () => {
    if(!newRate.wastage) return;
    setPendingRates([...pendingRates, { ...newRate, id: Date.now() }]);
    setNewRate({ category: INITIAL_CATEGORIES[0], productName: '', wastage: '' });
  };

  return (
    <div className="space-y-6">
      <ConfirmModal isOpen={deleteModal.isOpen} title="Delete Client Record?" message="This will permanently remove the client and their rate rules. Proceed?" onCancel={() => setDeleteModal({ isOpen: false, id: null })} onConfirm={confirmDelete} />
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 no-print pb-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Client Matrix</h2>
        {view === 'list' ? (
          <div className="flex gap-4 items-center">
             <button onClick={() => exportToCSV(customers, 'Customers')} className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"><DownloadCloud size={16}/> <span className="hidden sm:inline">Export CSV</span></button>
             <button onClick={() => { setEditingId(null); setFormData(emptyForm); setPendingRates([]); setView('form'); }} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-md shadow-amber-500/20 transition-all"><Plus size={16}/> <span className="hidden sm:inline">Onboard Client</span><span className="sm:hidden">New</span></button>
          </div>
        ) : <button onClick={() => setView('list')} className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"><ArrowLeft size={16} /> Back</button>}
      </div>

      {view === 'list' && (
        <div className="bg-white rounded-[1.5rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200 overflow-x-auto mt-6">
          <table className="w-full text-sm text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr><th className="px-6 py-5 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Client Profile</th><th className="px-6 py-5 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Banking & Tax Config</th><th className="px-6 py-5 text-right font-bold text-slate-500 text-[11px] uppercase tracking-widest no-print">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-bold text-slate-900 text-lg">{c.company}</p>
                    <p className="text-sm text-slate-600 mt-1 font-medium">{c.contact} • {c.phone}</p>
                    <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider">{c.city}, {c.pin}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-semibold text-slate-800">GST: <span className="font-medium text-slate-600">{c.gst || 'N/A'}</span></p>
                    <p className="text-sm text-slate-600 mt-1 font-medium">{c.accName}</p>
                    <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider">A/C: {c.accNumber} • IFSC: {c.ifsc}</p>
                  </td>
                  <td className="px-6 py-5 text-right no-print">
                     <div className="flex items-center justify-end gap-2">
                       <button onClick={() => handleEdit(c)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"><Pencil size={18}/></button>
                       <button onClick={() => triggerDelete(c.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"><Trash2 size={18}/></button>
                     </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan="3" className="p-12 text-center text-slate-400 font-medium">No client records found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {view === 'form' && (
        <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 md:p-12 rounded-[2rem] border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-8 sm:space-y-10">
           <div className="border-b border-slate-100 pb-6 mb-8"><h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{editingId ? 'Edit Client Config' : 'Onboard New Client'}</h3></div>
           
           <div>
             <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2"><UserCheck size={16}/> 1. Identity & Location</h4>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
               <div className="sm:col-span-2"><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Company / Retailer Name *</label><input required value={formData.company} onChange={e=>setFormData({...formData, company:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-semibold" /></div>
               <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Contact Person *</label><input required value={formData.contact} onChange={e=>setFormData({...formData, contact:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
               <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Phone Number *</label><input required value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
               <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">City</label><input value={formData.city} onChange={e=>setFormData({...formData, city:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
               <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Pin Code</label><input value={formData.pin} onChange={e=>setFormData({...formData, pin:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
             </div>
           </div>

           <div>
             <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 mt-8 border-t border-slate-100 pt-8"><Landmark size={16}/> 2. Financial Routing</h4>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
               <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">GST Number</label><input value={formData.gst} onChange={e=>setFormData({...formData, gst:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
               <div className="sm:col-span-2"><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Account Name</label><input value={formData.accName} onChange={e=>setFormData({...formData, accName:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
               <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Account Number</label><input value={formData.accNumber} onChange={e=>setFormData({...formData, accNumber:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
               <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">IFSC Code</label><input value={formData.ifsc} onChange={e=>setFormData({...formData, ifsc:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
               <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 ml-1">Branch Name</label><input value={formData.branch} onChange={e=>setFormData({...formData, branch:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" /></div>
             </div>
           </div>

           <div>
             <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 mt-8 border-t border-slate-100 pt-8"><DollarSign size={16}/> 3. Agreed Margins</h4>
             <div className="border border-slate-200 rounded-[1.5rem] p-6 mb-6 bg-slate-50/50 shadow-sm">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                 <div><label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Category Setup</label><select value={newRate.category} onChange={e=>setNewRate({...newRate, category:e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-medium appearance-none cursor-pointer">{INITIAL_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                 <div className="md:col-span-2"><label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Product Description / Specs</label><input type="text" placeholder="e.g. Heavy Antique Sets" value={newRate.productName} onChange={e=>setNewRate({...newRate, productName:e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-medium" /></div>
                 <div><label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Agreed Margin %</label><input type="number" step="0.01" value={newRate.wastage} onChange={e=>setNewRate({...newRate, wastage:e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-bold shadow-inner" /></div>
                 <div className="col-span-2 md:col-span-4 mt-2"><button type="button" onClick={addPendingRate} className="w-full bg-slate-900 text-white px-4 py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-md text-sm uppercase tracking-wider">Inject Margin Rule</button></div>
               </div>
             </div>
             
             <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm block">
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 border-b border-slate-200">
                   <tr className="flex w-full">
                     <th className="px-6 py-4 w-1/2 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Product Details</th>
                     <th className="px-6 py-4 w-1/3 font-bold text-slate-500 text-[11px] uppercase tracking-widest">Wastage Config</th>
                     <th className="px-6 py-4 w-1/6 text-right font-bold text-slate-500 text-[11px] uppercase tracking-widest">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 flex flex-col w-full">
                   {pendingRates.map(r => (
                     <tr key={r.id} className="flex w-full items-center hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4 w-1/2">
                         <div className="flex items-center gap-2">
                           <span className="font-bold text-slate-800 text-sm">{r.category} {r.productName && <span className="font-normal text-slate-500">({r.productName})</span>}</span>
                         </div>
                       </td>
                       <td className="px-6 py-4 w-1/3"><span className="text-lg font-black text-amber-600 tracking-tight">{r.wastage}%</span></td>
                       <td className="px-6 py-4 w-1/6 text-right"><button type="button" onClick={() => setPendingRates(pendingRates.filter(x=>x.id!==r.id))} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors inline-flex justify-center"><Trash2 size={16}/></button></td>
                     </tr>
                   ))}
                   {pendingRates.length === 0 && <tr className="flex w-full"><td colSpan="3" className="px-6 py-8 text-center w-full text-slate-400 text-xs font-semibold uppercase tracking-widest">Matrix Empty</td></tr>}
                 </tbody>
               </table>
             </div>
           </div>

           <div className="mt-8 border-t border-slate-100 pt-8"><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Internal Notes</label><textarea value={formData.notes} onChange={e=>setFormData({...formData, notes:e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" rows="2"></textarea></div>
           
           <div className="pt-8 flex justify-end"><button type="submit" className="bg-amber-500 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 w-full sm:w-auto justify-center"><CheckCircle2 size={18}/> Finalize Record</button></div>
        </form>
      )}
    </div>
  );
}