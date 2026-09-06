# NovaPOS Frontend V26 — V18 final integration pass

This release fixes the V25 integration defects identified during review.

## Fixed
- Correct Vite layout: `index.html` loads `src/main.jsx`; CSS is `src/styles.css`.
- Added persistent local offline event queue in `src/offline.js` with reconnect retry.
- Server responses are parsed using V18's `{accepted, errors}` contract; failed events remain locally queued.
- Added Customer Credit Ledger, Gift Card Ledger and Store Credit Ledger screens.
- Made ledger/audit/transaction records read-only in the UI.
- Removed generic edit/delete from inventory and cash movements.
- Removed generic status editing from expenses and approvals; lifecycle actions remain available.
- Purchase Items, serials and batches are read-only because V18 exposes lifecycle APIs rather than safe generic mutation for them.
- Sequences and device heartbeats are protected from generic mutation; only supported operations are exposed.
- Added partial refund quantity UI using `sale_item_id` and quantity.
- Added clear server-authoritative pricing/tax/promotion messaging to POS and purchasing.
- Preserved refresh tokens returned by JWT rotation.
- Logout only removes NovaPOS authentication tokens.
- API validation errors now show field-level messages where possible.
- Online/offline status handling no longer flips back to online after an API failure.

## Deliberate limitation
V18 does not expose a checkout quote/preview endpoint. Therefore the POS can only show a client estimate before checkout. The backend remains authoritative for price-list pricing, promotions, tax, inventory and final totals. The UI explicitly says so and surfaces backend errors instead of claiming a local estimate is authoritative.

The offline API is an event synchronization queue. It is not a client-side accounting engine. A sale must not be displayed as committed merely because it was queued locally.

## Verification
- Source tree and entry-point references were checked.
- Required V18 endpoint strings were checked against the V18 backend source.
- ZIP packaging is verified after creation.
- A real `npm install`/`npm run build` could not be completed in this sandbox because package installation timed out; this must be run in the user's networked development environment.
