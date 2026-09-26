# Arena bridge jobs

Drop a `.json` file here and push — `billing-bridge.yml` delivers it to
`https://shivaa.in/billing/inbox.php` and commits `<name>.receipt.json` back.

    { "route": "suppliers", "payload": { ... } }

Allowed routes: bills, parties, suppliers, rate-cards, orders.

The workflow deletes the file once delivered, so an unrelated later push
cannot replay the same write. Receipts are skipped by the trigger.

Nothing here is deployed to `public_html` — `hostinger-deploy.yml` ships only
`cms/`.
