# Google Vibe Coding Master Prompt — Shivaa Fine Jewellery

Copy everything inside the block below into Google’s Vibe Coding / AI app builder. This is a complete product, UX, engineering, data, and acceptance specification for rebuilding Shivaa as a polished production-ready jewellery commerce website.

---

## MASTER PROMPT

Build a complete responsive full-stack ecommerce website called **Shivaa** for an Indian fine-jewellery business. Shivaa sells gold and silver jewellery, supports retail customers and jewellers/B2B partners, and is based in Jayal, Nagaur, Rajasthan. The experience must feel premium, warm, trustworthy, editorial, and conversion-focused—not like a generic template.

### 1. Product vision and brand

Brand name: Shivaa. Suggested positioning: “Fine jewellery, honestly priced.” Use an elegant Indian luxury aesthetic: deep maroon/wine, warm ivory, antique gold, champagne, soft sand, and charcoal. Use generous whitespace, refined serif display typography paired with a clean sans-serif UI font, subtle borders, premium image cards, tasteful micro-animations, and high contrast. The interface must be calm and luxurious rather than loud.

Use real, clearly labelled product data only. Never invent government verification, payment success, shipment success, certificates, weights, purity, prices, GSTIN, supplier information, or BIS/HUID results. If an integration is unavailable, show an honest “not connected”, “demo”, “pending”, “unverified”, or “manual review” state.

Business contact placeholders/configuration:
- Phone: +91 89050 05921
- Email: Support@shivaa.in
- Hours: All days, 10:00–20:30 IST
- Location: Jayal, Nagaur, Rajasthan, India
- Currency: INR
- Timezone: Asia/Kolkata

### 2. Technical implementation

Create a maintainable full-stack app with:
- React + TypeScript and a modern component system, or the platform’s closest stable equivalent.
- A real database abstraction with seed/demo data and clear environment variables.
- REST or typed server actions for products, rates, auth, cart, orders, enquiries, wishlists, comparisons, newsletter, and admin.
- A clean service layer so mock/demo providers can later be replaced by production providers.
- Secure authentication, hashed passwords, session management, role-based access, input validation, rate limiting, CSRF protection where applicable, and server-side authorization.
- Never expose secrets in client code. Use environment variables for payment, SMS, email, live market-rate, storage, and analytics keys.
- Use relative URLs, not localhost, for browser requests.
- Make the app deployable on the platform’s preview host and on a normal production domain.
- Add loading, empty, error, offline, and retry states everywhere data is asynchronous.
- Add accessible semantic HTML, keyboard navigation, visible focus states, alt text, reduced-motion support, ARIA labels, and WCAG AA contrast.

If a backend cannot be provisioned by the builder, implement a realistic local demo repository with a repository interface and clearly separated mock adapters. The UI must still work end to end in demo mode.

### 3. Global shell and navigation

Build these global elements on every public page:
1. A thin utility bar with phone, email, Jaipur gold and silver rate snapshot, Track Order, Our Store, and For Jewellers.
2. Main header with Shivaa logo/wordmark, large search field, account, wishlist, compare shortlist, and cart icons with live item-count badges.
3. Desktop navigation and mobile slide-out drawer.
4. Drawer content: All Jewellery, visual category tiles, All Categories, Live Rates, Gold Buyback, Swarna Nidhi savings plan, Bespoke & Care, Design Selection, For Jewellers, My Orders, Our Story, Contact, and click-to-call.
5. Breadcrumbs on inner pages.
6. Scroll progress indicator, tasteful page transitions, toast notifications, modal system, and back-to-top control.
7. Footer with shop categories, company links, trust links, contact details, legal links, social placeholders, HUID guide, newsletter signup, and the Shivaa wordmark.

Categories must include at least: Rings, Earrings, Necklaces, Pendants, Chains, Bangles, Bracelets, Mangalsutra, Nose Pins, Toe Rings, Gold Jewellery, Silver Jewellery, Men’s Jewellery, Kids’ Jewellery, Wedding, Daily Wear, and New Arrivals.

### 4. Home page

Create a high-end homepage with:
- Premium hero section with jewellery imagery, headline, supporting copy, and CTAs “Shop Jewellery” and “Explore New Arrivals”.
- Live rate strip for 24K, 22K, 18K gold and silver, with timestamp and source state.
- Category tiles with imagery.
- New arrivals, bestsellers, wedding edit, and daily-wear product carousels.
- A transparent pricing explainer showing metal value, making charge, stone value, GST, and final total.
- “Why Shivaa” trust cards: transparent pricing, honest purity, careful finishing, personal support, and secure delivery—without claiming unsupported certifications.
- Services section: custom orders, repair/polish, exchange/buyback, and jeweller supply.
- Gold savings plan teaser.
- B2B/jeweller partnership banner.
- Newsletter / Shivaa Circle signup.
- Mobile-first responsive layout and swipeable carousels.

### 5. Shop and catalogue

Route: `/shop` with query-driven filters and shareable URLs.

Implement:
- Search by name, SKU, category, metal, purity, tags, and description.
- Filters: category, gold/silver, purity, price range, weight range, occasion, style, availability, stone type, daily/wedding, and new/bestseller.
- Sort: featured, newest, price low-to-high, price high-to-low, popularity.
- Grid/list toggle, result count, clear-all filters, active filter chips, pagination or infinite loading.
- Product cards with image, hover alternate image, video indicator where available, SKU, badges, metal/purity, weight, live calculated price, wishlist button, compare button, quick view, and add-to-cart.
- Helpful empty search state with suggested categories.
- Preserve filter state on refresh and browser back/forward.
- Support direct deep links such as category, tag, query, and maximum price.

### 6. Product detail page

Route: `/product/:id`.

Include:
- Large image gallery with zoom, thumbnails, keyboard navigation, optional product video, editorial/studio/worn/gift media variants.
- Product title, SKU, category, availability, rating/review area, wishlist, compare, and share actions.
- Metal, purity, gross/net weight, dimensions, stone details, finish, size/variant selector, and care information.
- Transparent live price breakdown: rate per gram, metal value, making charge, stone value, subtotal, GST, total. Clearly display rate timestamp and whether the rate is live, cached, simulated, or manually overridden.
- Quantity and add-to-cart.
- Enquire on WhatsApp / phone / email actions using configured contact values, never pretending to place an order through WhatsApp.
- Delivery/pincode estimator with honest serviceability response.
- HUID/hallmark information link and safe official-check guide.
- Tabs/accordions: Details, Shipping & Returns, Care, Authenticity, FAQs.
- Related products, recently viewed, and “complete the look”.
- Sticky purchase bar on mobile.

### 7. Cart, checkout, and order flow

Implement a complete demo-ready flow:
- Cart drawer and cart page with quantity controls, remove, save for later, coupon field, estimated shipping, price breakdown, and rate timestamp.
- Guest checkout and authenticated checkout.
- Checkout steps: contact, address, delivery method, review, payment.
- Address book for logged-in users; Indian PIN code, state, city, landmark, and phone validation.
- Delivery estimates and shipping charges as configurable rules.
- Payment adapter interface for Razorpay/Stripe/manual UPI integration. In demo mode use a clearly labelled simulated payment—not a fake successful real transaction.
- Order confirmation with order number, status timeline, invoice link, contact support, and email/SMS adapter hooks.
- Handle payment pending, failed, cancelled, retry, duplicate click, and refresh safely.
- Never store raw card data.

### 8. Account area

Route: `/account` with tabs for Overview, Profile, Addresses, Orders, Wishlist, Saved Designs, and Security.

Provide:
- Email/phone OTP or password authentication using a pluggable provider.
- Demo credentials only in developer documentation, not in visible production UI.
- Profile editing, logout, password change, session/device management.
- Order history with filters and status.
- Order detail with items, invoice, payment state, delivery timeline, tracking reference if available, return/exchange request, and support contact.
- Wishlist persistence for guest and signed-in users.

### 9. Compare and shortlist

Route: `/compare`.

Allow users to compare up to four products. Compare image, title, SKU, metal, purity, weight, dimensions, stone information, making-charge method, live price, availability, and delivery estimate. Add/remove products, clear all, responsive horizontal comparison table, and shareable shortlist URL. Ensure comparison data does not imply unsupported quality claims.

### 10. Live rates page

Route: `/rates`.

Create a transparent rates dashboard:
- 24K, 22K, 18K gold and silver per-gram cards.
- Jaipur premium/settings shown as a separate pricing component.
- Timestamp, provider/source label, last successful refresh, live/cached/simulated badge.
- Rate history chart and table.
- Gold/silver unit converter.
- Explain that final jewellery price also includes making charges, stones, taxes, and product-specific adjustments.
- Admin override for authorized staff with audit trail.
- If an external API fails, use the last cached value or configured demo value and disclose it prominently.

### 11. Trust, hallmark, and HUID

Routes: `/trust` and `/hallmark`.

Trust page must show only supplied business details: business name, location, phone, email, CIN/UDYAM only when configured, and document availability states. Clearly label all information as business-provided unless independently verified.

Hallmark/HUID page must be an educational and safe workflow:
- Explain BIS hallmarking and what HUID means.
- Provide an HUID input with strict six-character formatting.
- Do not claim automatic BIS verification unless a real official integration is configured and working.
- Provide an official BIS Care handoff link, copy/open actions, and a “record my check” note form.
- Store user-recorded HUID, product reference, date, and notes as unverified records.
- Never fabricate a verified result, certificate, registry response, or trust score.

### 12. Services and informational pages

Build polished pages for:
- `/about`: Shivaa story, values, workshop/relationship story using configurable copy, not invented history.
- `/services`: custom/bespoke jewellery, repair, polish, resizing, exchange, buyback, consultations, and process steps.
- `/buyback`: explain the configurable buyback policy, valuation request form, deductions/conditions as actual settings, and status tracking.
- `/savings`: “Swarna Nidhi” 11 + 1 monthly gold plan information page with eligibility, terms, FAQ, enquiry form, and explicit “subject to business terms” language.
- `/catalogues`: design selection/catalogue PDFs, categories, preview/download, enquiry/cart-style selection for designs.
- `/b2b`: jeweller partnership landing page with GSTIN format validation, business details, enquiry form, pricing/contact CTA, bullion desk/schemes only when configured.
- `/partner`: authenticated B2B portal with partner dashboard, catalogue, saved designs, quotes, order requests, invoices, and account status.
- `/contact`: contact cards, store details, map placeholder, hours, enquiry form, click-to-call/email/WhatsApp.
- `/faq`: searchable grouped FAQs.
- `/privacy`, terms, shipping, returns, refund, and cancellation pages with editable legal content.
- `/track`: order tracking form with honest no-result and pending states.

### 13. Admin/CMS

Route: `/admin`, protected by role.

Implement dashboards for:
- Product CRUD, SKU, category, pricing fields, media, stock, tags, SEO, and publish state.
- Bulk import/export with validation and preview.
- Image/video upload and alt text.
- Orders, payment status, shipment status, returns, enquiries, and customer support notes.
- Users, roles, B2B partners, and audit logs.
- Live-rate settings, source status, Jaipur premium, silver premium, GST, making-charge schemes, delivery rules, buyback rules, and savings-plan content.
- Catalogue/PDF management.
- Trust/HUID business content, with verification-state fields.
- Newsletter subscribers and consent records.
- Analytics cards only from real collected events; do not fabricate metrics.

### 14. Data model

Create typed schemas for:
- Product: id, SKU, slug, name, category, tags, metal, purity, grossWeightG, netWeightG, dimensions, stoneDetails, stoneValue, makingChargeScheme, makingChargeValue, media, priceSnapshot, stock, status, SEO.
- RateSnapshot: timestamp, gold24, gold22, gold18, silver, source, freshness, providerStatus.
- User, Address, Wishlist, ComparisonList, Cart, Order, OrderItem, PaymentAttempt, Shipment, Enquiry, HUIDRecord, Catalogue, Partner, NewsletterSubscriber, AuditLog, SiteSettings.

Use server-side recalculation for every total. Never trust client-submitted prices, roles, totals, or stock.

### 15. SEO, performance, and quality

Add page titles, descriptions, canonical URLs, Open Graph tags, JSON-LD for Organization, Product, BreadcrumbList, FAQPage where applicable, sitemap, robots rules, clean slugs, and noindex for private/admin pages. Optimize responsive images, lazy loading, modern formats, code splitting, caching, and minimal layout shift. Add error boundary, 404, 500, skeleton loaders, and graceful API failure handling.

### 16. Analytics and consent

Create privacy-conscious event hooks for page view, search, filter use, product view, wishlist, compare, add-to-cart, checkout start, purchase, enquiry, and newsletter signup. Do not load tracking until consent where legally required. Provide a cookie/consent preferences control and do not collect sensitive payment information.

### 17. Acceptance criteria

The finished app is accepted only when:
1. Every global navigation item opens a working page.
2. A visitor can browse, search, filter, view a product, compare it, wishlist it, add it to cart, and complete a clearly labelled demo checkout.
3. Rates and product prices show timestamp/source/freshness and calculate consistently.
4. Authenticated users can see profile, addresses, wishlist, orders, and invoices.
5. Admin users can manage products, orders, rates, settings, and content.
6. HUID/trust pages never claim unsupported government verification.
7. B2B flows are separate from retail flows and validate GSTIN format without claiming GST verification.
8. All forms have validation, loading, success, error, retry, and accessible feedback states.
9. The site is excellent on 360px mobile, tablet, laptop, and large desktop.
10. No placeholder lorem ipsum, broken images, dead buttons, console errors, exposed secrets, fake payment success, or fabricated business data remains.

### 18. Build sequence

First create the design system, app shell, routing, seeded schemas, and reusable components. Then implement home/shop/product/cart/auth/account. Next implement rates, trust, hallmark, services, B2B, catalogue, admin, and informational pages. Finally add integrations, accessibility, SEO, tests, error handling, responsive polish, and deployment documentation. At the end, generate a README explaining environment variables, demo mode, database migration, seed data, admin setup, provider adapters, and how to replace every mock integration with a real one.

Use realistic jewellery content and images with correct licensing or generated placeholders. Prefer the supplied Shivaa visual identity if assets are available. Keep all copy editable through configuration/CMS. Make the final result feel like a finished premium jewellery brand, not a prototype.

---

## Optional first follow-up prompt

After the first build, paste this:

> Audit the entire Shivaa app against the original specification. Click through every route, test mobile and desktop layouts, test search/filter/product/cart/checkout/auth/order/admin flows, inspect browser console and network errors, verify all totals server-side, and fix every broken button, missing state, accessibility issue, overflow problem, dead link, fake integration claim, and fabricated data issue. Do not redesign the brand; preserve the premium maroon, ivory, antique-gold visual language. Return a concise list of completed fixes and remaining provider credentials required for production.
