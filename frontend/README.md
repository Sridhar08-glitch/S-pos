# S POS — Website / Web UI (`frontend/`)

The full back-office and Point of Sale in the browser — the **"Aurora"** design system.
React 19 + Vite single-page app. This same UI is:

- the **website** (hosted via [`deploy/`](../deploy)), and
- the UI bundled into the **Windows desktop app** (`desktop/webapp`, opened by `SPOS.exe`),
- reachable from **any tablet/phone browser** on the shop Wi-Fi.

Developed by **Sridhar Mahalingam**.

![Overview](../docs/screenshots/desktop/02-dashboard.png)

---

## 1. Every module, explained (with screenshots)

The dark sidebar groups the whole store. What each section does:

### Overview
![Dashboard](../docs/screenshots/desktop/02-dashboard.png)
Live welcome banner (**Open Point of Sale**, **View reports**, Live badge), stat cards —
Today's sales, Sales today, Low stock, All-time revenue — and quick actions:
New sale, Add product, New purchase, Transfer stock, Customer, Reports.

### Point of Sale
![POS](../docs/screenshots/desktop/03-point-of-sale.png)
The till. Register-session banner (open / close, opening float), **barcode / QR / SKU
scan box**, walk-in or named customer, price-list selector, cash rounding, custom/open
items, product cards with live stock badges. Right rail: **split tender** across
Cash / Card / QR / Bank / Wallet, exact-cash helper, **Park** a sale / resume **Held**
sales, **Complete sale**, Clear cart.

### SELL — Sales · Customers · Gift Cards · Loyalty · Time Clock
| Sales | Customers |
|---|---|
| ![](../docs/screenshots/desktop/04-sales.png) | ![](../docs/screenshots/desktop/05-customers.png) |
| Gift Cards | Loyalty |
| ![](../docs/screenshots/desktop/13-gift-cards.png) | ![](../docs/screenshots/desktop/14-loyalty.png) |

![Time Clock](../docs/screenshots/desktop/15-time-clock.png)

Sales history with receipt reprint and **partial refunds** (item + quantity).
Customers: CRM with loyalty balance, store credit and purchase history — plus
read-only **credit / gift-card / store-credit ledgers**. Gift cards are issued with
code, amount and expiry; balances are **server-enforced**. Loyalty configures point
earn/redeem. Time Clock records staff shifts.

### CATALOG — Products · Categories · Variants · Promotions · Price Lists
| Products | Categories |
|---|---|
| ![](../docs/screenshots/desktop/06-products.png) | ![](../docs/screenshots/desktop/07-categories.png) |
| Variants | Promotions |
| ![](../docs/screenshots/desktop/16-variants.png) | ![](../docs/screenshots/desktop/17-promotions.png) |

![Price Lists](../docs/screenshots/desktop/18-price-lists.png)

Product cards with stock badge, SKU, price, Edit/delete and **+ Add Product**;
size/colour **variants & modifiers** per product; promotion rules applied
server-side at checkout; per-customer/store **price lists**.

### INVENTORY — Stock · Stock Counts · Transfers · Suppliers · Purchasing
| Stock | Stock Counts |
|---|---|
| ![](../docs/screenshots/desktop/08-stock.png) | ![](../docs/screenshots/desktop/19-stock-counts.png) |
| Transfers | Suppliers |
| ![](../docs/screenshots/desktop/20-transfers.png) | ![](../docs/screenshots/desktop/21-suppliers.png) |

![Purchasing](../docs/screenshots/desktop/09-purchasing.png)

Real-time stock with adjustments and low-stock alerts, **cycle counts** with variance
report, inter-store transfers with in-transit tracking, supplier book, purchase
orders with **partial receiving** (totals stay server-authoritative; client tax
shown as an estimate).

### MONEY & REPORTS — Reports · Refunds · Expenses · Approvals · Reconciliation
| Reports | Refunds |
|---|---|
| ![](../docs/screenshots/desktop/10-reports.png) | ![](../docs/screenshots/desktop/22-refunds.png) |
| Expenses | Approvals |
| ![](../docs/screenshots/desktop/23-expenses.png) | ![](../docs/screenshots/desktop/24-approvals.png) |

![Reconciliation](../docs/screenshots/desktop/25-reconciliation.png)

Filterable reporting (date / store / register / cashier): sales count, gross, tax,
low stock, payment breakdown, **X report** (open shift) and **Z report** (day end),
CSV export. Refunds post **GL reversals**; expenses flow through **approvals**;
reconciliation matches the drawer against the **double-entry ledger** and surfaces
over/short.

### STORE SETUP — Registers · Sessions · Cash Movements · Stores · Companies · Users · Tax Rates · Settings
| Registers | Sessions |
|---|---|
| ![](../docs/screenshots/desktop/11-registers.png) | ![](../docs/screenshots/desktop/26-sessions.png) |
| Cash Movements | Users |
| ![](../docs/screenshots/desktop/27-cash-movements.png) | ![](../docs/screenshots/desktop/30-users.png) |
| Stores | Companies |
| ![](../docs/screenshots/desktop/28-stores.png) | ![](../docs/screenshots/desktop/29-companies.png) |
| Tax Rates | Settings |
| ![](../docs/screenshots/desktop/31-tax-rates.png) | ![](../docs/screenshots/desktop/12-settings.png) |

Physical tills and their open/close sessions, paid-in/paid-out cash movements,
multi-store & multi-company (each with its own currency), users with roles
(Owner / Manager / Cashier / Inventory) and PIN, tax rates, store settings.

### On a phone or tablet browser
| Phone browser | Tablet browser |
|---|---|
| ![Phone](../docs/screenshots/website-mobile/phone-02-dashboard.png) | ![Tablet](../docs/screenshots/website-mobile/tablet-02-pos.png) |

The same SPA is responsive — staff on the shop Wi-Fi open the desktop app's
"Other devices" address (e.g. `http://192.168.1.20:8971`) in any browser.

---

## 2. Key workflows

### Cashier's day
```mermaid
flowchart LR
    OPEN["Open register\n(opening float)"] --> SELL["Sell: scan/tap →\nsplit tender → receipt"]
    SELL --> PARK["Park / resume\nheld sales"]
    SELL --> X["X report\n(mid-shift)"]
    X --> Z["Close register →\nZ report + reconciliation"]
```

### A sale at the till
```mermaid
flowchart LR
    SCAN["Scan barcode\nor tap product"] --> CART["Cart: discounts,\nprice overrides (PIN),\ncustomer"] --> TENDER["Split tender:\ncash+card+QR+…"] --> DONE["Complete sale →\nprint/email receipt\nwith tax-invoice QR"]
```

### Stock replenishment
```mermaid
flowchart LR
    PO["Create purchase\norder"] --> RCV["Receive\n(full or partial)"] --> STOCK["Stock updates\n+ GL entries"] --> COUNT["Cycle count\nconfirms"]
```

### Offline behaviour
The UI keeps a **persistent offline event queue** with automatic retry after
reconnect. Pending local events are clearly distinguished from server-accepted ones —
a queued sale is never claimed as committed until the backend accepts it.

---

## 3. Contract behaviour (important)

The backend is **authoritative** for pricing, promotions, tax, inventory, payment
state, accounting and checkout totals. The frontend:
- labels POS subtotal/discount/total as *estimates* until the server confirms;
- uses the backend's `sale_item_id` + quantity contract for partial refunds;
- persists rotated refresh tokens; logout clears only its own storage;
- hides edit/delete on lifecycle-controlled records (ledgers, audit, serials, batches,
  cash movements, …);
- flattens API validation errors into readable field messages.

---

## 4. Run & build

```bash
npm install
npm run dev            # http://localhost:5173 — expects API on :8000
```

| Setting | Purpose |
|---|---|
| `VITE_API_URL` | API base (default `http://127.0.0.1:8000/api/v1`) |
| `VITE_API_URL=/api/v1` + `npm run build` | Relative build for bundling into the desktop app (`desktop/webapp`) |

Production build: `npm run build` → `dist/`.

## 5. Related documentation
- Page-by-page screenshot tour → [`docs/SCREENSHOTS.md`](../docs/SCREENSHOTS.md)
- API this UI consumes → [`backend/README.md`](../backend/README.md)
- Desktop packaging of this UI → [`desktop/README.md`](../desktop/README.md)

© S POS · Developed by **Sridhar Mahalingam**.
