<?php
/**
 * Shivaa Jewels — Billing · report engine
 *
 * The 51 reports below are the catalogue from shivaa_erp.tsx. That file
 * defined them as titles only; here 34 of them are actually computed from
 * live data, and the other 17 are listed with the reason they cannot be
 * produced yet rather than being faked.
 *
 * Every engine returns ['columns' => [...], 'rows' => [[...]], 'note' => '']
 * and only ever runs SELECT statements.
 */
declare(strict_types=1);

const BILLING_REPORT_CATALOGUE = [
  'cat1' => [
    'title' => 'I. Metal Stock, Purity & Reconciliation',
    'reports' => [
      'r1_1' => ['t' => 'Pure Metal (24K Fine Equivalent) Conversion Statement', 'd' => 'Converts multi-karat inventory and order weights into standard pure 99.9% fine equivalents.', 'live' => true],
      'r1_2' => ['t' => 'Metal-Wise Physical Stock Movement Register', 'd' => 'Tracks physical inward intake vs. outward deliveries for Gold and Silver.', 'live' => true],
      'r1_3' => ['t' => 'Stone Deduction & Net-to-Gross Ratio Audit', 'd' => 'Details gross weight, stone deductions, and calculated stone percentage ratios.', 'live' => true],
      'r1_4' => ['t' => 'Multi-Karatage Inventory Distribution Breakdown', 'd' => 'Aggregates total metal holdings and transactions categorized by specific purity grades.', 'live' => true],
      'r1_5' => ['t' => 'Melting Loss & Yield Variance Report', 'd' => 'Compares gross casting intake against finished output to identify scrap losses.', 'live' => false, 'why' => 'needs casting intake vs finished output'],
      'r1_6' => ['t' => 'Average Gram-Weight per Piece Benchmark', 'd' => 'Calculates average weight per piece across categories to monitor lightweighting trends.', 'live' => true],
      'r1_7' => ['t' => 'Daily Metal Opening vs. Closing Balance Sheet', 'd' => 'A day-end reconciliation statement showing starting stock, purchases, sales, and closing balance.', 'live' => false, 'why' => 'needs a daily closing snapshot'],
      'r1_8' => ['t' => 'Gold vs. Silver Turnover Comparison Statement', 'd' => 'Compares volume and turnover velocity between gold and silver product lines.', 'live' => true],
    ],
  ],
  'cat2' => [
    'title' => 'II. Wastage & Making Charges Analytics',
    'reports' => [
      'r2_1' => ['t' => 'Master Supplier Wastage Benchmark & Ranking', 'd' => 'Ranks all registered suppliers from lowest to highest wastage % per category.', 'live' => true],
      'r2_2' => ['t' => 'Product Category Wastage Spread Matrix', 'd' => 'A category-wise table showing min, max, and average wastage charged across the market.', 'live' => true],
      'r2_3' => ['t' => 'Client Agreed Wastage vs. Actual Billed Variance', 'd' => 'Flags discrepancies between pre-negotiated customer rate cards and actual order billing rates.', 'live' => false, 'why' => 'bills do not carry a wastage figure'],
      'r2_4' => ['t' => 'Wastage Arbitrage & Profit Spread Report', 'd' => 'Compares purchase wastage paid to suppliers against sales wastage charged to customers.', 'live' => false, 'why' => 'needs wastage charged to clients on bills'],
      'r2_5' => ['t' => 'Making Charges vs. Wastage Trade-Off Analysis', 'd' => 'Evaluates total landed cost per gram when balancing fixed making charges against wastage percentages.', 'live' => false, 'why' => 'needs landed cost per gram'],
      'r2_6' => ['t' => 'Manufacturing Technique Wastage Differential', 'd' => 'Compares wastage across different making types (e.g., Paper Casting vs. Regular Casting).', 'live' => true],
      'r2_7' => ['t' => 'Stone-Setting & CZ Wastage Impact Analysis', 'd' => 'Measures the extra wastage and setting costs associated with stone-heavy jewellery.', 'live' => false, 'why' => 'needs a stone-heavy flag on items'],
      'r2_8' => ['t' => 'Purity-Wise Wastage Fluctuation Audit', 'd' => 'Tracks how wastage variations behave across different purities (e.g., 22K vs. 18K).', 'live' => true],
    ],
  ],
  'cat3' => [
    'title' => 'III. Supplier Procurement Management',
    'reports' => [
      'r3_1' => ['t' => 'Supplier Master Directory & KYC/Banking Dossier', 'd' => 'A formal directory compiling company names, contacts, GSTIN, and verified bank credentials.', 'live' => true],
      'r3_2' => ['t' => 'Vendor Procurement Volume & Metal Intake', 'd' => 'Summarizes total gram weight and transaction counts fulfilled by each vendor.', 'live' => true],
      'r3_3' => ['t' => 'Supplier Quality & Reliability Scorecard', 'd' => 'Correlates vendor ratings, quality tiers, and fulfillment timelines.', 'live' => false, 'why' => 'needs fulfilment timelines and vendor ratings'],
      'r3_4' => ['t' => 'Karigar Job-Work Dispatch vs. Receipt Reconciliation', 'd' => 'Tracks metal issued to karigars against finished ornaments received back.', 'live' => true],
      'r3_5' => ['t' => 'Minimum Order Quantity (MOQ) Compliance Audit', 'd' => 'Tracks orders against supplier-mandated MOQs to optimize batch procurement sizing.', 'live' => false, 'why' => 'no MOQ field on suppliers'],
      'r3_6' => ['t' => 'Supplier Settlement Mode Breakdown', 'd' => 'Categorizes vendor purchasing terms into Advance, Credit, and Cash settlement volumes.', 'live' => false, 'why' => 'no settlement-mode field on suppliers'],
      'r3_7' => ['t' => 'Inactive & Dormant Supplier Review Report', 'd' => 'Lists suppliers with no transactions over 90+ days to clean up vendor databases.', 'live' => true],
    ],
  ],
  'cat4' => [
    'title' => 'IV. Customer CRM & B2B Sales',
    'reports' => [
      'r4_1' => ['t' => 'Client Master Directory & Banking/GSTIN Dossier', 'd' => 'A ready-to-print B2B customer registry containing legal entity names, GSTIN, and bank details.', 'live' => true],
      'r4_2' => ['t' => 'Client-Specific Agreed Rate Card & Wastage Matrix', 'd' => 'A client-specific sheet detailing custom wastage terms agreed for specific items.', 'live' => true],
      'r4_3' => ['t' => 'Customer Sales Volume & Turnover Ranking', 'd' => 'Ranks wholesale and retail clients by total gram purchases and financial turnover.', 'live' => true],
      'r4_4' => ['t' => 'Customer Concentration & 80/20 Pareto Volume', 'd' => 'Identifies the top 20% of buyers generating 80% of total sales volume.', 'live' => true],
      'r4_5' => ['t' => 'City-Wise & Regional Sales Distribution Report', 'd' => 'Groups sales volume by delivery destination to pinpoint high-growth regional markets.', 'live' => true],
      'r4_6' => ['t' => 'Client Order Frequency & Dormant Buyer Escalation', 'd' => 'Highlights regular buyers who have not placed orders within their standard cycle.', 'live' => false, 'why' => 'needs an agreed order cycle per client'],
      'r4_7' => ['t' => 'Client Rate Deviation & Discount Audit', 'd' => 'Tracks instances where special discounts or reduced wastage rates were manually applied.', 'live' => false, 'why' => 'needs billed wastage to compare against the card'],
    ],
  ],
  'cat5' => [
    'title' => 'V. Orders, Deals & Production Workflow',
    'reports' => [
      'r5_1' => ['t' => 'Master Deal Ledger & Transaction History Register', 'd' => 'A chronological record of every purchase and sale entry with complete details.', 'live' => true],
      'r5_2' => ['t' => 'Live Production Pipeline & Order Status Report', 'd' => 'Filters open orders by operational status.', 'live' => true],
      'r5_3' => ['t' => 'VIP & Express Priority Workshop Manifest', 'd' => 'A filtered production punch-list displaying only high-priority orders.', 'live' => true],
      'r5_4' => ['t' => 'Overdue & Delayed Order Escalation Register', 'd' => 'Lists orders past their committed delivery date, showing days overdue.', 'live' => true],
      'r5_5' => ['t' => 'Place of Supply (POS) Order Fulfillment Report', 'd' => 'Tracks delivery locations across intrastate and interstate jurisdictions.', 'live' => true],
      'r5_6' => ['t' => 'Official Job-Work / B2B Order Confirmation Voucher', 'd' => 'A single-order confirmation slip detailing specifications, weight breakdowns, and terms.', 'live' => false, 'why' => 'a printable voucher, not a data report'],
      'r5_7' => ['t' => 'Piece-Count vs. Metal Volume Fulfillment Ratio', 'd' => 'Monitors whether order growth is driven by high-volume light goods or heavy sets.', 'live' => true],
      'r5_8' => ['t' => 'Cancelled & On-Hold Orders Root-Cause Summary', 'd' => 'Logs all cancelled or paused deals with associated notes and remarks.', 'live' => true],
    ],
  ],
  'cat6' => [
    'title' => 'VI. Financial, Advances & Cash Flow',
    'reports' => [
      'r6_1' => ['t' => 'Net Metal Advance (Jama-Udhar) Balance Ledger', 'd' => 'Tracks outstanding pure/alloy metal advances given to suppliers vs. collected from customers.', 'live' => true],
      'r6_2' => ['t' => 'Cash Advance & Float Liquidity Statement', 'd' => 'Monitors advance cash deposits received versus cash paid to workshops.', 'live' => true],
      'r6_3' => ['t' => 'Combined Counterparty Balance Sheet', 'd' => 'Provides a consolidated balance of metal grams and rupee amounts owed to/by any party.', 'live' => false, 'why' => 'needs metal and rupee balances on one party'],
      'r6_4' => ['t' => 'Daily Spot-Rate Valuation & Exposure Report', 'd' => 'Recalculates total open metal stock value against updated live market rates.', 'live' => true],
      'r6_5' => ['t' => 'Credit Aging & Settlement Timeline Analysis', 'd' => 'Groups outstanding orders and receivables by aging brackets (0–15, 16–30, 30+ days).', 'live' => true],
      'r6_6' => ['t' => 'Auxiliary Charges & Surcharges Summary', 'd' => 'Aggregates additional costs such as hallmark fees, rhodium plating, and freight.', 'live' => false, 'why' => 'no surcharge lines are captured'],
    ],
  ],
  'cat7' => [
    'title' => 'VII. Tax, Invoicing & Compliance',
    'reports' => [
      'r7_1' => ['t' => 'Place of Supply & State-Wise Tax Summary', 'd' => 'Classifies transactions by state tax jurisdiction to assist with monthly GST reporting.', 'live' => true],
      'r7_2' => ['t' => 'Monthly Inward vs. Outward Taxable Metal', 'd' => 'Summarizes taxable purchases versus sales values for input tax credit matching.', 'live' => true],
      'r7_3' => ['t' => 'Physical Transit & Logistics Dispatch Manifest', 'd' => 'Accompanies outward shipments with piece counts, net weights, and consignee data.', 'live' => false, 'why' => 'no logistics or dispatch data'],
      'r7_4' => ['t' => 'High-Value Transaction Compliance Register', 'd' => 'Identifies high-value transactions requiring statutory reporting or PAN/GSTIN verification.', 'live' => true],
    ],
  ],
  'cat8' => [
    'title' => 'VIII. Executive Strategic Intelligence',
    'reports' => [
      'r8_1' => ['t' => 'Seasonal & Festive Demand Trend Report', 'd' => 'Compares quarterly category volume shifts (pre-Diwali, Akshaya Tritiya, wedding seasons).', 'live' => false, 'why' => 'needs several quarters of history'],
      'r8_2' => ['t' => 'Product Category Profitability & Margin Index', 'd' => 'Ranks product categories by net margin contribution after factoring in wastage.', 'live' => false, 'why' => 'needs purchase cost against sale price'],
      'r8_3' => ['t' => 'Consolidated Enterprise Master Backup Dossier', 'd' => 'A complete archive combining supplier, client, rate cards, and deal ledgers into a single backup.', 'live' => true],
    ],
  ],
];

/** Fine-metal factor. Prefers the exact fineness table; still understands
 *  legacy "22K (916)" labels so rows saved before v3 keep valuing correctly. */
function billing_fine_factor(string $purity): float {
  $p = trim($purity);
  if (isset(BILLING_FINENESS[$p])) return BILLING_FINENESS[$p];
  if (preg_match('/\((\d{3})\)/', $p, $m)) return ((int)$m[1]) / 1000;
  if (preg_match('/(\d{1,2})K/i', $p, $m) && isset(BILLING_FINENESS[$m[1] . 'K'])) {
    return BILLING_FINENESS[$m[1] . 'K'];
  }
  if (stripos($p, 'silver') !== false) return 0.925;
  return 1.0;
}

function billing_q(PDO $pdo, string $sql, array $args = []): array {
  $st = $pdo->prepare($sql);
  $st->execute($args);
  return $st->fetchAll();
}

function billing_rep(PDO $pdo, string $id): array {
  $gold  = (float)($pdo->query('SELECT `gold_rate` FROM `billing_settings` WHERE `id`=1')->fetchColumn() ?: 0);
  $silver = (float)($pdo->query('SELECT `silver_rate` FROM `billing_settings` WHERE `id`=1')->fetchColumn() ?: 0);

  switch ($id) {

  /* ── I. Metal stock, purity & reconciliation ─────────────────────────── */
  case 'r1_1': {
    $rows = billing_q($pdo, "SELECT `metal`,`purity`, COUNT(*) n,
        COALESCE(SUM(`net_wt`*`physical_pcs`),0) net,
        COALESCE(SUM(`physical_grams`),0) tray
        FROM `billing_items` GROUP BY `metal`,`purity` ORDER BY `metal`,`purity`");
    $out = [];
    foreach ($rows as $r) {
      $f = billing_fine_factor((string)$r['purity']);
      $out[] = [$r['metal'], $r['purity'], (int)$r['n'], round((float)$r['tray'], 3),
                round((float)$r['tray'] * $f, 3), $f];
    }
    return ['columns' => ['Metal', 'Purity', 'Designs', 'Grams in shop', 'Fine (24K) g', 'Factor'], 'rows' => $out];
  }
  case 'r1_2': {
    $rows = billing_q($pdo, "SELECT i.`metal`, l.`channel`, COUNT(*) n,
        COALESCE(SUM(l.`delta_pcs`),0) pcs, COALESCE(SUM(l.`delta_grams`),0) g
        FROM `billing_stock_ledger` l LEFT JOIN `billing_items` i ON i.`id`=l.`item_id`
        GROUP BY i.`metal`, l.`channel` ORDER BY i.`metal`, l.`channel`");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['metal'] ?: '—', $r['channel'], (int)$r['n'],
      (int)$r['pcs'], round((float)$r['g'], 3)];
    return ['columns' => ['Metal', 'Channel', 'Movements', 'Pieces ±', 'Grams ±'], 'rows' => $out];
  }
  case 'r1_3': {
    $rows = billing_q($pdo, "SELECT `name`,`category`,`gross_wt`,`stone_wt`,`less_wt`,`net_wt`
        FROM `billing_items` ORDER BY (`stone_wt`/NULLIF(`gross_wt`,0)) DESC LIMIT 500");
    $out = [];
    foreach ($rows as $r) {
      $g = (float)$r['gross_wt'];
      $out[] = [$r['name'], $r['category'], round($g, 3), round((float)$r['stone_wt'], 3),
        round((float)$r['less_wt'], 3), round((float)$r['net_wt'], 3),
        $g > 0 ? round((float)$r['stone_wt'] / $g * 100, 2) . '%' : '—'];
    }
    return ['columns' => ['Item', 'Category', 'Gross g', 'Stone g', 'Less g', 'Net g', 'Stone %'], 'rows' => $out];
  }
  case 'r1_4': {
    $rows = billing_q($pdo, "SELECT `metal`,`purity`, COUNT(*) n,
        COALESCE(SUM(`physical_pcs`),0) pcs, COALESCE(SUM(`physical_grams`),0) g
        FROM `billing_items` GROUP BY `metal`,`purity` ORDER BY g DESC");
    $out = [];
    foreach ($rows as $r) {
      $rate = stripos((string)$r['metal'], 'silver') !== false ? $silver : $gold;
      $out[] = [$r['metal'], $r['purity'], (int)$r['n'], (int)$r['pcs'],
        round((float)$r['g'], 3), round((float)$r['g'] * $rate, 2)];
    }
    return ['columns' => ['Metal', 'Purity', 'Designs', 'Pieces', 'Grams', 'Value at today\'s rate'], 'rows' => $out];
  }
  case 'r1_6': {
    $rows = billing_q($pdo, "SELECT `category`, COUNT(*) n,
        COALESCE(SUM(`physical_pcs`),0) pcs, COALESCE(SUM(`physical_grams`),0) g
        FROM `billing_items` GROUP BY `category` ORDER BY `category`");
    $out = [];
    foreach ($rows as $r) {
      $pcs = (int)$r['pcs'];
      $out[] = [$r['category'], (int)$r['n'], $pcs, round((float)$r['g'], 3),
        $pcs > 0 ? round((float)$r['g'] / $pcs, 3) : 0];
    }
    return ['columns' => ['Category', 'Designs', 'Pieces', 'Grams', 'Avg g / piece'], 'rows' => $out];
  }
  case 'r1_8': {
    $inv = billing_q($pdo, "SELECT `metal`, COUNT(*) n, COALESCE(SUM(`physical_pcs`),0) pcs,
        COALESCE(SUM(`physical_grams`),0) g FROM `billing_items` GROUP BY `metal`");
    $buy = billing_q($pdo, "SELECT `metal`, COUNT(*) n, COALESCE(SUM(`net_wt`),0) g,
        COALESCE(SUM(`net_wt`*`rate`),0) v FROM `billing_orders` WHERE `order_type`='Purchase' GROUP BY `metal`");
    $out = [];
    foreach ($inv as $r) {
      $b = null;
      foreach ($buy as $x) if ($x['metal'] === $r['metal']) $b = $x;
      $rate = stripos((string)$r['metal'], 'silver') !== false ? $silver : $gold;
      $out[] = [$r['metal'], (int)$r['n'], (int)$r['pcs'], round((float)$r['g'], 3),
        round((float)$r['g'] * $rate, 2), $b ? round((float)$b['g'], 3) : 0,
        $b ? round((float)$b['v'], 2) : 0];
    }
    return ['columns' => ['Metal', 'Designs', 'Pieces held', 'Grams held', 'Holding value',
      'Grams purchased', 'Purchase value'], 'rows' => $out];
  }

  /* ── II. Wastage & making analytics ──────────────────────────────────── */
  case 'r2_1': {
    $rows = billing_q($pdo, "SELECT s.`company`, s.`quality`, COUNT(rc.`id`) n,
        ROUND(AVG(rc.`wastage_pct`),2) avg_w, MIN(rc.`wastage_pct`) mn, MAX(rc.`wastage_pct`) mx
        FROM `billing_rate_cards` rc JOIN `billing_suppliers` s ON s.`id`=rc.`entity_id`
        WHERE rc.`entity_type`='supplier'
        GROUP BY s.`id`, s.`company`, s.`quality` ORDER BY avg_w ASC");
    $out = []; $rank = 0;
    foreach ($rows as $r) $out[] = [++$rank, $r['company'], $r['quality'], (int)$r['n'],
      (float)$r['mn'], (float)$r['mx'], (float)$r['avg_w']];
    return ['columns' => ['Rank', 'Supplier', 'Quality', 'Entries', 'Min %', 'Max %', 'Avg wastage %'],
            'rows' => $out, 'note' => 'Ranked best (lowest wastage) first.'];
  }
  case 'r2_2': {
    $rows = billing_q($pdo, "SELECT `category`, COUNT(*) n, MIN(`wastage_pct`) mn,
        MAX(`wastage_pct`) mx, ROUND(AVG(`wastage_pct`),2) av, ROUND(AVG(`other_cost`),2) oc
        FROM `billing_rate_cards` GROUP BY `category` ORDER BY av DESC");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['category'], (int)$r['n'], (float)$r['mn'],
      (float)$r['mx'], (float)$r['av'], round((float)$r['mx'] - (float)$r['mn'], 2), (float)$r['oc']];
    return ['columns' => ['Category', 'Entries', 'Min %', 'Max %', 'Avg %', 'Spread', 'Avg other cost'], 'rows' => $out];
  }
  case 'r2_6': {
    $rows = billing_q($pdo, "SELECT `making_type`, COUNT(*) n, ROUND(AVG(`wastage_pct`),2) av,
        ROUND(AVG(`other_cost`),2) oc FROM `billing_rate_cards`
        GROUP BY `making_type` ORDER BY av ASC");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['making_type'], (int)$r['n'], (float)$r['av'], (float)$r['oc']];
    return ['columns' => ['Making type', 'Entries', 'Avg wastage %', 'Avg other cost'], 'rows' => $out];
  }
  case 'r2_8': {
    $rows = billing_q($pdo, "SELECT `purity`, COUNT(*) n, MIN(`wastage_pct`) mn,
        MAX(`wastage_pct`) mx, ROUND(AVG(`wastage_pct`),2) av FROM `billing_rate_cards`
        GROUP BY `purity` ORDER BY `purity`");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['purity'], (int)$r['n'], (float)$r['mn'], (float)$r['mx'],
      (float)$r['av'], round((float)$r['mx'] - (float)$r['mn'], 2)];
    return ['columns' => ['Purity', 'Entries', 'Min %', 'Max %', 'Avg %', 'Fluctuation'], 'rows' => $out];
  }

  /* ── III. Supplier procurement ───────────────────────────────────────── */
  case 'r3_1': {
    $rows = billing_q($pdo, "SELECT * FROM `billing_suppliers` ORDER BY `company`");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['company'], $r['contact'], $r['phone'], $r['city'],
      $r['gst'], $r['supplier_type'], $r['quality'], $r['status'],
      $r['acc_name'], $r['acc_number'], $r['ifsc'], $r['branch']];
    return ['columns' => ['Company', 'Contact', 'Phone', 'City', 'GSTIN', 'Type', 'Quality',
      'Status', 'A/c name', 'A/c number', 'IFSC', 'Branch'], 'rows' => $out];
  }
  case 'r3_2': {
    $rows = billing_q($pdo, "SELECT `entity_name`, COUNT(*) n, COALESCE(SUM(`pieces`),0) pcs,
        COALESCE(SUM(`net_wt`),0) g, COALESCE(SUM(`net_wt`*`rate`),0) v,
        ROUND(AVG(`wastage_decided`),2) w
        FROM `billing_orders` WHERE `order_type`='Purchase'
        GROUP BY `entity_id`,`entity_name` ORDER BY g DESC");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['entity_name'], (int)$r['n'], (int)$r['pcs'],
      round((float)$r['g'], 3), round((float)$r['v'], 2), (float)$r['w']];
    return ['columns' => ['Vendor', 'Orders', 'Pieces', 'Net grams', 'Value', 'Avg wastage %'], 'rows' => $out];
  }
  case 'r3_4': {
    $rows = billing_q($pdo, "SELECT `artisan_name`, COUNT(*) n,
        COALESCE(SUM(`issued_wt`),0) out_wt, COALESCE(SUM(`received_wt`),0) in_wt,
        ROUND(AVG(`wastage_pct`),2) w, COALESCE(SUM(`labour_charges`),0) lab
        FROM `billing_karigar_jobs` GROUP BY `party_id`,`artisan_name` ORDER BY `artisan_name`");
    $out = [];
    foreach ($rows as $r) {
      $o = (float)$r['out_wt']; $i = (float)$r['in_wt'];
      $out[] = [$r['artisan_name'], (int)$r['n'], round($o, 3), round($i, 3),
        round($o - $i, 3), $o > 0 ? round(($o - $i) / $o * 100, 2) . '%' : '—', round((float)$r['lab'], 2)];
    }
    return ['columns' => ['Karigar', 'Jobs', 'Issued g', 'Received g', 'Balance g', 'Loss %', 'Labour ₹'], 'rows' => $out];
  }
  case 'r3_7': {
    $rows = billing_q($pdo, "SELECT s.`company`, s.`status`,
        MAX(o.`order_date`) last_order, DATEDIFF(CURDATE(), MAX(o.`order_date`)) days
        FROM `billing_suppliers` s LEFT JOIN `billing_orders` o
          ON o.`entity_id`=s.`id` AND o.`order_type`='Purchase'
        GROUP BY s.`id`, s.`company`, s.`status`
        HAVING last_order IS NULL OR days > 90 ORDER BY days DESC");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['company'], $r['status'],
      $r['last_order'] ?: 'never', $r['days'] === null ? '—' : (int)$r['days']];
    return ['columns' => ['Supplier', 'Status', 'Last order', 'Days since'], 'rows' => $out];
  }

  /* ── IV. Customer CRM & B2B sales ────────────────────────────────────── */
  case 'r4_1': {
    $rows = billing_q($pdo, "SELECT * FROM `billing_parties`
        WHERE `kind` IN ('customer','jeweller') ORDER BY `kind`,`name`");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['kind'], $r['name'], $r['phone'], $r['email'],
      $r['city'], $r['state_code'], $r['gstin'], $r['pan'], (int)$r['credit_days'],
      round((float)$r['credit_limit'], 2), $r['bank_name'], $r['acc_number'], $r['ifsc']];
    return ['columns' => ['Kind', 'Name', 'Phone', 'Email', 'City', 'State', 'GSTIN', 'PAN',
      'Credit days', 'Credit limit', 'Bank', 'A/c', 'IFSC'], 'rows' => $out];
  }
  case 'r4_2': {
    $rows = billing_q($pdo, "SELECT p.`name`, rc.`category`, rc.`purity`, rc.`making_type`,
        rc.`wastage_pct`, rc.`other_cost` FROM `billing_rate_cards` rc
        JOIN `billing_parties` p ON p.`id`=rc.`entity_id`
        WHERE rc.`entity_type`='customer' ORDER BY p.`name`, rc.`category`");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['name'], $r['category'], $r['purity'],
      $r['making_type'], (float)$r['wastage_pct'], (float)$r['other_cost']];
    return ['columns' => ['Client', 'Category', 'Purity', 'Making type', 'Wastage %', 'Other cost'], 'rows' => $out];
  }
  case 'r4_3': {
    $rows = billing_q($pdo, "SELECT `party_name`, COUNT(*) n,
        COALESCE(SUM(`grand_total`),0) v, COALESCE(SUM(`balance_due`),0) due
        FROM `billing_bills` WHERE `doc_type`='GST'
        GROUP BY `party_id`,`party_name` ORDER BY v DESC");
    $out = []; $rank = 0;
    foreach ($rows as $r) $out[] = [++$rank, $r['party_name'], (int)$r['n'],
      round((float)$r['v'], 2), round((float)$r['due'], 2)];
    return ['columns' => ['Rank', 'Client', 'Bills', 'Turnover ₹', 'Outstanding ₹'], 'rows' => $out];
  }
  case 'r4_4': {
    $rows = billing_q($pdo, "SELECT `party_name`, COALESCE(SUM(`grand_total`),0) v
        FROM `billing_bills` WHERE `doc_type`='GST' GROUP BY `party_id`,`party_name` ORDER BY v DESC");
    $total = 0.0; foreach ($rows as $r) $total += (float)$r['v'];
    $out = []; $cum = 0.0; $rank = 0;
    foreach ($rows as $r) {
      $cum += (float)$r['v']; $rank++;
      $out[] = [$rank, $r['party_name'], round((float)$r['v'], 2),
        $total > 0 ? round((float)$r['v'] / $total * 100, 2) . '%' : '—',
        $total > 0 ? round($cum / $total * 100, 2) . '%' : '—'];
    }
    return ['columns' => ['Rank', 'Client', 'Turnover ₹', 'Share', 'Cumulative'], 'rows' => $out,
            'note' => $total > 0
              ? 'Top ' . max(1, (int)ceil(count($rows) * 0.2)) . ' of ' . count($rows)
                . ' clients carry the bulk of turnover.'
              : 'No billed turnover yet.'];
  }
  case 'r4_5': {
    $rows = billing_q($pdo, "SELECT COALESCE(NULLIF(p.`city`,''),'(not recorded)') city,
        COUNT(b.`id`) n, COALESCE(SUM(b.`grand_total`),0) v
        FROM `billing_bills` b LEFT JOIN `billing_parties` p ON p.`id`=b.`party_id`
        WHERE b.`doc_type`='GST' GROUP BY city ORDER BY v DESC");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['city'], (int)$r['n'], round((float)$r['v'], 2)];
    return ['columns' => ['City', 'Bills', 'Turnover ₹'], 'rows' => $out];
  }

  /* ── V. Orders, deals & production ───────────────────────────────────── */
  case 'r5_1': {
    $rows = billing_q($pdo, "SELECT * FROM `billing_orders` ORDER BY `order_date` DESC, `id` DESC LIMIT 1000");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['order_date'], $r['order_type'], $r['order_name'],
      $r['entity_name'], $r['metal'], $r['category'], $r['purity'], (int)$r['pieces'],
      round((float)$r['net_wt'], 3), round((float)$r['rate'], 2),
      round((float)$r['net_wt'] * (float)$r['rate'], 2), $r['status']];
    return ['columns' => ['Date', 'Type', 'Order', 'Party', 'Metal', 'Category', 'Purity',
      'Pcs', 'Net g', 'Rate', 'Value ₹', 'Status'], 'rows' => $out];
  }
  case 'r5_2': {
    $rows = billing_q($pdo, "SELECT `status`, COUNT(*) n, COALESCE(SUM(`pieces`),0) pcs,
        COALESCE(SUM(`net_wt`),0) g FROM `billing_orders`
        WHERE `status` NOT IN ('Delivered','Cancelled')
        GROUP BY `status` ORDER BY n DESC");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['status'], (int)$r['n'], (int)$r['pcs'], round((float)$r['g'], 3)];
    return ['columns' => ['Status', 'Orders', 'Pieces', 'Net grams'], 'rows' => $out,
            'note' => 'Delivered and cancelled orders are excluded.'];
  }
  case 'r5_3': {
    $rows = billing_q($pdo, "SELECT * FROM `billing_orders`
        WHERE `priority` IN ('Urgent','High Priority','Important','High Quality Needed')
          AND `status` NOT IN ('Delivered','Cancelled')
        ORDER BY FIELD(`priority`,'Urgent','High Priority','Important','High Quality Needed'), `delivery_date`");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['priority'], $r['order_name'], $r['entity_name'],
      $r['category'], (int)$r['pieces'], round((float)$r['net_wt'], 3),
      $r['delivery_date'] ?: '—', $r['status']];
    return ['columns' => ['Priority', 'Order', 'Party', 'Category', 'Pcs', 'Net g', 'Due', 'Status'], 'rows' => $out];
  }
  case 'r5_4': {
    $rows = billing_q($pdo, "SELECT *, DATEDIFF(CURDATE(), `delivery_date`) days
        FROM `billing_orders`
        WHERE `delivery_date` IS NOT NULL AND `delivery_date` < CURDATE()
          AND `status` NOT IN ('Delivered','Cancelled') ORDER BY days DESC");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['order_name'], $r['entity_name'], $r['delivery_date'],
      (int)$r['days'], $r['status'], $r['priority']];
    return ['columns' => ['Order', 'Party', 'Promised', 'Days overdue', 'Status', 'Priority'], 'rows' => $out];
  }
  case 'r5_5': {
    $rows = billing_q($pdo, "SELECT COALESCE(NULLIF(`place_of_supply`,''),'(not recorded)') pos,
        COUNT(*) n, COALESCE(SUM(`pieces`),0) pcs, COALESCE(SUM(`net_wt`),0) g,
        SUM(`status`='Delivered') done FROM `billing_orders`
        GROUP BY pos ORDER BY n DESC");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['pos'], (int)$r['n'], (int)$r['pcs'],
      round((float)$r['g'], 3), (int)$r['done']];
    return ['columns' => ['Place of supply', 'Orders', 'Pieces', 'Net grams', 'Delivered'], 'rows' => $out];
  }
  case 'r5_7': {
    $rows = billing_q($pdo, "SELECT `category`, COUNT(*) n, COALESCE(SUM(`pieces`),0) pcs,
        COALESCE(SUM(`net_wt`),0) g FROM `billing_orders` GROUP BY `category` ORDER BY g DESC");
    $out = [];
    foreach ($rows as $r) {
      $pcs = (int)$r['pcs'];
      $out[] = [$r['category'], (int)$r['n'], $pcs, round((float)$r['g'], 3),
        $pcs > 0 ? round((float)$r['g'] / $pcs, 3) : 0];
    }
    return ['columns' => ['Category', 'Orders', 'Pieces', 'Net grams', 'Avg g / piece'],
            'rows' => $out, 'note' => 'A falling average means growth is coming from light goods.'];
  }
  case 'r5_8': {
    $rows = billing_q($pdo, "SELECT * FROM `billing_orders`
        WHERE `status` IN ('Cancelled','On Hold','Delayed') ORDER BY `status`,`order_date` DESC");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['status'], $r['order_name'], $r['entity_name'],
      $r['order_date'], round((float)$r['net_wt'], 3),
      round((float)$r['net_wt'] * (float)$r['rate'], 2), $r['notes'] ?: '—'];
    return ['columns' => ['Status', 'Order', 'Party', 'Date', 'Net g', 'Value ₹', 'Note'], 'rows' => $out];
  }

  /* ── VI. Financial, advances & cash flow ─────────────────────────────── */
  case 'r6_1': {
    $rows = billing_q($pdo, "SELECT `entity_name`, COUNT(*) n,
        COALESCE(SUM(`advance_metal`),0) adv FROM `billing_orders`
        WHERE `advance_metal` <> 0 GROUP BY `entity_id`,`entity_name`
        ORDER BY ABS(adv) DESC");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['entity_name'], (int)$r['n'], round((float)$r['adv'], 3)];
    return ['columns' => ['Party', 'Orders', 'Metal advance (g)'], 'rows' => $out,
            'note' => 'Positive means metal given out and still to be returned.'];
  }
  case 'r6_2': {
    $rows = billing_q($pdo, "SELECT `entity_name`, COUNT(*) n,
        COALESCE(SUM(`advance_cash`),0) cash FROM `billing_orders`
        WHERE `advance_cash` <> 0 GROUP BY `entity_id`,`entity_name` ORDER BY cash DESC");
    $out = []; $tot = 0.0;
    foreach ($rows as $r) { $tot += (float)$r['cash'];
      $out[] = [$r['entity_name'], (int)$r['n'], round((float)$r['cash'], 2)]; }
    return ['columns' => ['Party', 'Orders', 'Cash advance ₹'], 'rows' => $out,
            'note' => 'Total cash advanced: ₹' . number_format($tot, 2)];
  }
  case 'r6_4': {
    $rows = billing_q($pdo, "SELECT `metal`, COALESCE(SUM(`physical_grams`),0) g,
        COALESCE(SUM(`online_stock`),0) online FROM `billing_items` GROUP BY `metal`");
    $out = []; $tot = 0.0;
    foreach ($rows as $r) {
      $rate = stripos((string)$r['metal'], 'silver') !== false ? $silver : $gold;
      $val = (float)$r['g'] * $rate; $tot += $val;
      $out[] = [$r['metal'], round((float)$r['g'], 3), (int)$r['online'], $rate, round($val, 2)];
    }
    return ['columns' => ['Metal', 'Grams in shop', 'Online pcs', 'Rate ₹/g', 'Value ₹'], 'rows' => $out,
            'note' => $gold > 0 || $silver > 0
              ? 'Total exposure at today\'s rates: ₹' . number_format($tot, 2)
              : 'Set the gold and silver rates in Settings to value the holding.'];
  }
  case 'r6_5': {
    $rows = billing_q($pdo, "SELECT
        SUM(`balance_due` <= 0) b0,
        SUM(`balance_due` > 0 AND DATEDIFF(CURDATE(),`bill_date`) <= 15) b1,
        SUM(DATEDIFF(CURDATE(),`bill_date`) BETWEEN 16 AND 30 AND `balance_due` > 0) b2,
        SUM(DATEDIFF(CURDATE(),`bill_date`) > 30 AND `balance_due` > 0) b3,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(),`bill_date`) <= 15 THEN `balance_due` ELSE 0 END),0) a1,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(),`bill_date`) BETWEEN 16 AND 30 THEN `balance_due` ELSE 0 END),0) a2,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(),`bill_date`) > 30 THEN `balance_due` ELSE 0 END),0) a3
        FROM `billing_bills` WHERE `doc_type`='GST'");
    $r = $rows[0] ?? [];
    $out = [
      ['0–15 days', (int)($r['b1'] ?? 0), round((float)($r['a1'] ?? 0), 2)],
      ['16–30 days', (int)($r['b2'] ?? 0), round((float)($r['a2'] ?? 0), 2)],
      ['Over 30 days', (int)($r['b3'] ?? 0), round((float)($r['a3'] ?? 0), 2)],
    ];
    return ['columns' => ['Age of debt', 'Bills', 'Outstanding ₹'], 'rows' => $out];
  }

  /* ── VII. Tax, invoicing & compliance ────────────────────────────────── */
  case 'r7_1': {
    $rows = billing_q($pdo, "SELECT COALESCE(NULLIF(`place_of_supply`,''),'(not recorded)') pos,
        COUNT(*) n, COALESCE(SUM(`taxable`),0) taxable, COALESCE(SUM(`gst_amount`),0) gst
        FROM `billing_bills` WHERE `doc_type`='GST' GROUP BY pos ORDER BY gst DESC");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['pos'], (int)$r['n'], round((float)$r['taxable'], 2),
      round((float)$r['gst'] / 2, 2), round((float)$r['gst'] / 2, 2), round((float)$r['gst'], 2)];
    return ['columns' => ['Place of supply', 'Bills', 'Taxable ₹', 'CGST ₹', 'SGST ₹', 'Total GST ₹'], 'rows' => $out];
  }
  case 'r7_2': {
    $in = billing_q($pdo, "SELECT DATE_FORMAT(`order_date`,'%Y-%m') m,
        COALESCE(SUM(`net_wt`*`rate`),0) v FROM `billing_orders`
        WHERE `order_type`='Purchase' GROUP BY m");
    $outRows = billing_q($pdo, "SELECT DATE_FORMAT(`bill_date`,'%Y-%m') m,
        COALESCE(SUM(`taxable`),0) v FROM `billing_bills` WHERE `doc_type`='GST' GROUP BY m");
    $months = [];
    foreach ($in as $r) $months[$r['m']]['in'] = (float)$r['v'];
    foreach ($outRows as $r) $months[$r['m']]['out'] = (float)$r['v'];
    ksort($months);
    $out = [];
    foreach ($months as $m => $v) {
      $i = $v['in'] ?? 0.0; $o = $v['out'] ?? 0.0;
      $out[] = [$m, round($i, 2), round($o, 2), round($o - $i, 2)];
    }
    return ['columns' => ['Month', 'Inward (purchases) ₹', 'Outward (sales) ₹', 'Net ₹'], 'rows' => $out];
  }
  case 'r7_4': {
    $rows = billing_q($pdo, "SELECT * FROM `billing_bills`
        WHERE `doc_type`='GST' AND `grand_total` >= 200000 ORDER BY `grand_total` DESC LIMIT 200");
    $out = [];
    foreach ($rows as $r) $out[] = [$r['bill_no'], $r['bill_date'], $r['party_name'],
      $r['party_phone'] ?: '—', round((float)$r['grand_total'], 2), $r['place_of_supply'] ?: '—'];
    return ['columns' => ['Bill', 'Date', 'Party', 'Phone', 'Value ₹', 'Place of supply'],
            'rows' => $out, 'note' => 'Transactions of ₹2,00,000 and above.'];
  }

  /* ── VIII. Executive ─────────────────────────────────────────────────── */
  case 'r8_3': {
    $t = function (string $sql) use ($pdo) { return (int)$pdo->query($sql)->fetchColumn(); };
    $out = [
      ['billing_items', $t('SELECT COUNT(*) FROM `billing_items`')],
      ['billing_parties', $t('SELECT COUNT(*) FROM `billing_parties`')],
      ['billing_suppliers', $t('SELECT COUNT(*) FROM `billing_suppliers`')],
      ['billing_rate_cards', $t('SELECT COUNT(*) FROM `billing_rate_cards`')],
      ['billing_orders', $t('SELECT COUNT(*) FROM `billing_orders`')],
      ['billing_bills', $t('SELECT COUNT(*) FROM `billing_bills`')],
      ['billing_metal_bills', $t('SELECT COUNT(*) FROM `billing_metal_bills`')],
      ['billing_karigar_jobs', $t('SELECT COUNT(*) FROM `billing_karigar_jobs`')],
      ['billing_expenses', $t('SELECT COUNT(*) FROM `billing_expenses`')],
      ['billing_ledger', $t('SELECT COUNT(*) FROM `billing_ledger`')],
      ['billing_stock_ledger', $t('SELECT COUNT(*) FROM `billing_stock_ledger`')],
      ['billing_audit', $t('SELECT COUNT(*) FROM `billing_audit`')],
    ];
    return ['columns' => ['Table', 'Rows'], 'rows' => $out,
            'note' => 'Use the CSV exports for the actual data; this is the shape of the archive.'];
  }
  }
  return ['columns' => [], 'rows' => [], 'note' => 'No engine for ' . $id];
}
