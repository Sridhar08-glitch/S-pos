# S POS — Retail Point of Sale

**Developed by Sridhar Mahalingam.** A complete, multi-region, multi-currency point-of-sale
and back-office platform for shops of any size. One backend, **three ways to run your store**:

| 📱 Mobile app | 🖥️ Windows desktop app | 🌐 Website / SaaS |
|---|---|---|
| React Native (Expo). Sell from your phone or tablet — or run the **entire store on the phone, fully offline**, no computer needed. | Self-contained `SPOS.exe` (SQLite, nothing else to install). One PC runs it; tablets, phones and extra registers connect over the same Wi-Fi. | Dockerized Django + Postgres + Redis behind Nginx/TLS for a hosted store. |

---

## Contents

1. [System architecture](#1-system-architecture)
2. [📱 The mobile app — every screen](#2--the-mobile-app)
3. [🌐 The website / web UI — every module](#3--the-website--web-ui)
4. [🖥️ The Windows desktop app](#4--the-windows-desktop-app)
5. [☁️ Production deployment](#5-️-production-deployment)
6. [The checkout money path](#6-the-checkout-money-path)
7. [Quick start & documentation](#7-quick-start--documentation)

---

## 1. System architecture

Every client speaks the same `/api/v1` contract, so the store works identically
everywhere — and the mobile app can even *be* the server:

```mermaid
flowchart TB
    subgraph Clients
        MOB["📱 Mobile app\nExpo / React Native"]
        BROWSER["🌐 Browser SPA\nReact 19 'Aurora'"]
        WIN["🖥️ SPOS.exe window\nWebView2"]
    end
    subgraph API["Django 5.2 + DRF API — backend/v17src"]
        V1["/api/v1 — JWT auth · idempotent writes\nPOS · catalog · inventory · customers ·\nloyalty · finance · registers · reports"]
    end
    MOB -->|"HTTP + Bearer JWT"| V1
    BROWSER -->|"HTTP + Bearer JWT"| V1
    WIN -->|"localhost"| V1
    V1 --> SQLITE[("SQLite — desktop mode")]
    V1 --> PG[("PostgreSQL — website mode")]
    MOB -.->|"offline mode:\nfull store engine on-device"| LS[("AsyncStorage\non the phone")]
```

---

## 2. 📱 The mobile app

Three store modes from one Connect screen — including a **complete store with zero
servers**:

```mermaid
flowchart LR
    UI["App screens"] --> R["api() router"]
    R -->|"LAN"| PC["Shop PC — SPOS.exe\n192.168.x.x:8971"]
    R -->|"cloud"| WEB["pos.mystore.com"]
    R -->|"offline"| ENG["localApi() — on-phone engine:\nauth · products · register ·\ncheckout · receipts · reports"]
```

### Getting started
<p>
  <img src="docs/screenshots/mobile/01-setup-connect.png" width="24%"/>
  <img src="docs/screenshots/mobile/02-local-store-setup.png" width="24%"/>
  <img src="docs/screenshots/mobile/03-login.png" width="24%"/>
  <img src="docs/screenshots/mobile/04-home-dashboard.png" width="24%"/>
</p>

**Connect** (offline mode or type the store address) → **Offline setup** (store name,
14 currencies, owner login, optional sample products) → **Sign in** (auto-refreshing
tokens) → **Dashboard** — Sales / Orders / Profit / Customers cards with trends vs
yesterday, period picker, notification bell, quick actions.

### The selling loop — each arrow is one tap

```mermaid
flowchart LR
    P["🛍️ Tap products\n(or scan barcode)"] --> VC["🛒 Cart: customer ·\nnote · discounts"] --> PAY["💳 Cash / Card /\nQR / Wallet"] --> OK["✅ Receipt #INV-…\n+ barcode"] --> SH["📤 Print · Email ·\nShare (WhatsApp)"] --> P
```

<p>
  <img src="docs/screenshots/mobile/06-products.png" width="24%"/>
  <img src="docs/screenshots/mobile/09-cart.png" width="24%"/>
  <img src="docs/screenshots/mobile/10-payment-card.png" width="24%"/>
  <img src="docs/screenshots/mobile/12-receipt.png" width="24%"/>
</p>
<p>
  <img src="docs/screenshots/mobile/08-products-cart-bar.png" width="24%"/>
  <img src="docs/screenshots/mobile/11-payment-cash.png" width="24%"/>
  <img src="docs/screenshots/mobile/13-receipt-actions.png" width="24%"/>
  <img src="docs/screenshots/mobile/14-sales-report.png" width="24%"/>
</p>

- **Products** — photo cards, search by name/barcode/SKU, camera **barcode scanner**,
  category chips; tapping adds to cart (badges + View Cart bar).
- **Cart** — quantity steppers, swipe-left to remove, attach customer, note,
  0/5/10/15 % discount chips, live totals.
- **Payment** — Card (brand badges + manual entry), Cash, QR, Wallet tiles.
- **Receipt** — premium layout with invoice barcode; **Print / Email / Share**, then
  New Sale loops back.
- **Sales report** — updates instantly: hourly chart, avg. order, top sellers,
  recent orders.

### Management on the phone
<p>
  <img src="docs/screenshots/mobile/07-add-product.png" width="24%"/>
  <img src="docs/screenshots/mobile/16-orders.png" width="24%"/>
  <img src="docs/screenshots/mobile/19-inventory.png" width="24%"/>
  <img src="docs/screenshots/mobile/21-settings.png" width="24%"/>
</p>

**Add Product** (photo, selling+cost price, tax %, opening stock, low-stock alert,
auto-SKU, barcode) · **Orders** (filters, tap → full receipt) · **Inventory**
(In/Low/Out-of-stock, units left) · **Settings** (register **open/close with cash
reconciliation**, store profile, payment-method toggles, receipt settings, staff).
Plus Notifications, Customers, Categories, More menu — all 22 screens explained in
[docs/SCREENSHOTS.md](docs/SCREENSHOTS.md).

### On a tablet the app transforms
| Phone: grid + View Cart bar | Tablet: 3-pane POS — sidebar · grid · live cart |
|---|---|
| <img src="docs/screenshots/mobile/08-products-cart-bar.png" width="240"/> | <img src="docs/screenshots/tablet/03-pos-with-cart.png" width="520"/> |

---

## 3. 🌐 The website / web UI

The full back-office ("Aurora" design system) — served by a hosted deployment **and**
bundled inside the desktop app. Much deeper than the mobile app: variants, promotions,
purchasing, gift cards, loyalty, accounting, approvals, X/Z reports, multi-store.

### Overview & Point of Sale

![Overview](docs/screenshots/desktop/02-dashboard.png)

**Overview** — welcome banner (Open Point of Sale / View reports / Live), stat cards
(Today's sales, Sales today, Low stock, All-time revenue), quick actions.

![Point of Sale](docs/screenshots/desktop/03-point-of-sale.png)

**Point of Sale** — the full till: register-session banner, **barcode/QR/SKU scan
box**, walk-in or named customer, price lists, cash rounding, custom items, stock
badges on every card, and a right rail with **split tender** (Cash/Card/QR/Bank/
Wallet), exact-cash helper, **Park/Held sales** and Complete sale.

### The cashier's day

```mermaid
flowchart LR
    OPEN["🔓 Open register\n(opening float)"] --> SELL["Sell: scan/tap →\nsplit tender → receipt"]
    SELL --> PARK["Park / resume\nheld sales"]
    SELL --> X["X report\n(mid-shift)"]
    X --> Z["🔒 Close register →\nZ report + reconciliation"]
```

### SELL — Sales · Customers · Gift Cards · Loyalty · Time Clock
| Sales | Customers |
|---|---|
| ![](docs/screenshots/desktop/04-sales.png) | ![](docs/screenshots/desktop/05-customers.png) |
| Gift Cards | Loyalty |
| ![](docs/screenshots/desktop/13-gift-cards.png) | ![](docs/screenshots/desktop/14-loyalty.png) |

![Time Clock](docs/screenshots/desktop/15-time-clock.png)

- **Sales** — every transaction, receipt reprint, **partial refunds** (item + quantity).
- **Customers** — CRM with loyalty balances, store credit, purchase history.
- **Gift Cards** — issue cards (code, amount, expiry) with server-enforced balances.
- **Loyalty** — points earn/redeem rules per customer.
- **Time Clock** — staff clock-in/out and shifts.

### CATALOG — Products · Categories · Variants · Promotions · Price Lists
| Products | Categories |
|---|---|
| ![](docs/screenshots/desktop/06-products.png) | ![](docs/screenshots/desktop/07-categories.png) |
| Variants | Promotions |
| ![](docs/screenshots/desktop/16-variants.png) | ![](docs/screenshots/desktop/17-promotions.png) |

![Price Lists](docs/screenshots/desktop/18-price-lists.png)

- **Products** — cards with stock badge, SKU, price, edit/delete, add with photo.
- **Variants** — size/colour variants and **modifiers** per product.
- **Promotions** — discount rules applied server-side at checkout.
- **Price Lists** — alternate pricing per customer group or store.

### INVENTORY — Stock · Stock Counts · Transfers · Suppliers · Purchasing
| Stock | Stock Counts |
|---|---|
| ![](docs/screenshots/desktop/08-stock.png) | ![](docs/screenshots/desktop/19-stock-counts.png) |
| Transfers | Suppliers |
|![](docs/screenshots/desktop/20-transfers.png) | ![](docs/screenshots/desktop/21-suppliers.png) |

![Purchasing](docs/screenshots/desktop/09-purchasing.png)

```mermaid
flowchart LR
    PO["Create purchase order\n(supplier, items)"] --> RCV["Receive stock\n(full or partial)"] --> UP["Stock + GL update"] --> CNT["Cycle count\nverifies"] --> TRF["Transfer between\nstores if needed"]
```

- **Stock** — real-time levels per store, adjustments, low-stock alerts.
- **Stock Counts** — cycle counting with variance report.
- **Transfers** — inter-store stock movement with in-transit tracking.
- **Suppliers / Purchasing** — supplier book, POs, partial receiving; totals stay
  server-authoritative.

### MONEY & REPORTS — Reports · Refunds · Expenses · Approvals · Reconciliation
| Reports | Refunds |
|---|---|
| ![](docs/screenshots/desktop/10-reports.png) | ![](docs/screenshots/desktop/22-refunds.png) |
| Expenses | Approvals |
| ![](docs/screenshots/desktop/23-expenses.png) | ![](docs/screenshots/desktop/24-approvals.png) |

![Reconciliation](docs/screenshots/desktop/25-reconciliation.png)

- **Reports** — filter by date/store/register/cashier: sales count, gross, tax,
  payments breakdown, **X report** (open shift) & **Z report** (day end), CSV export.
- **Refunds** — full or partial; every refund posts a **GL reversal**.
- **Expenses → Approvals** — spend requests flow through manager approval.
- **Reconciliation** — drawer counts matched against the **double-entry ledger**;
  over/short surfaced.

### STORE SETUP — Registers · Sessions · Cash Movements · Stores · Companies · Users · Tax Rates · Settings
| Registers | Sessions |
|---|---|
| ![](docs/screenshots/desktop/11-registers.png) | ![](docs/screenshots/desktop/26-sessions.png) |
| Cash Movements | Users |
| ![](docs/screenshots/desktop/27-cash-movements.png) | ![](docs/screenshots/desktop/30-users.png) |
| Stores | Companies |
| ![](docs/screenshots/desktop/28-stores.png) | ![](docs/screenshots/desktop/29-companies.png) |
| Tax Rates | Settings |
| ![](docs/screenshots/desktop/31-tax-rates.png) | ![](docs/screenshots/desktop/12-settings.png) |

- **Registers / Sessions / Cash Movements** — physical tills, their open/close
  sessions and paid-in/paid-out drawer movements.
- **Stores / Companies** — multi-store, multi-company, **each company with its own
  currency**.
- **Users** — Owner / Manager / Cashier / Inventory roles + PIN for overrides.
- **Tax Rates / Settings** — tax configuration and store settings.

### The website is responsive — phone & tablet browsers
<p>
  <img src="docs/screenshots/website-mobile/phone-01-login.png" width="19%"/>
  <img src="docs/screenshots/website-mobile/phone-02-dashboard.png" width="19%"/>
  <img src="docs/screenshots/website-mobile/phone-03-pos.png" width="19%"/>
  <img src="docs/screenshots/website-mobile/tablet-02-pos.png" width="38%"/>
</p>

Staff on the shop Wi-Fi just open the store address in any browser — zero installation.

---

## 4. 🖥️ The Windows desktop app

One `SPOS.exe` = server + till + back-office for the whole shop. **SQLite inside,
nothing else to install**, works with no internet forever.

```mermaid
flowchart TB
    EXE["SPOS.exe"] --> WIN["🖥️ Native app window\n(WebView2) for the owner"]
    EXE --> SRV["waitress server\n0.0.0.0:8971 · 8 threads"]
    SRV --> T1["📲 Tablet register\n(browser)"]
    SRV --> T2["📱 Cashier's phone\n(S POS mobile app)"]
    SRV --> T3["🖥️ Second till PC\n(browser)"]
    EXE --> DATA[("%LOCALAPPDATA%\\SPOS\nSQLite · uploads · secret · log")]
```

What happens when the owner double-clicks it:

```mermaid
sequenceDiagram
    participant U as Double-click SPOS.exe
    participant L as Launcher
    participant D as Django (in-process)
    U->>L: start
    L->>D: migrate database, collect static
    L->>L: pick a free port (8971 → 8972 → 8080 → 8000)
    L->>D: serve API + web UI on 0.0.0.0 (waitress)
    L->>U: print "This computer / Other devices" addresses
    L->>U: open native window (fallback: browser app-mode)
    Note over L: first run → setup wizard<br/>(store, currency, owner login — no default password)
```

And how it's built and shipped:

```mermaid
flowchart LR
    FE["frontend/\nnpm run build"] --> WEBAPP["desktop/webapp"]
    BE["backend/v17src"] --> SPEC["spos.spec\n(PyInstaller)"]
    WEBAPP --> SPEC
    RUN["run_spos.py"] --> SPEC
    SPEC --> DIST["dist/SPOS/SPOS.exe"]
    DIST --> SETUP["S-POS-Setup.exe\n(Inno Setup, optional)"]
```

The window it opens **is the website UI above** (section 3) — every screenshot there
is exactly what the desktop app shows, e.g.:

![Desktop POS](docs/screenshots/desktop/03-point-of-sale.png)

---

## 5. ☁️ Production deployment

```mermaid
flowchart LR
    NET((Internet)) -->|"443 TLS"| NGINX["Nginx"]
    NGINX --> GUNI["Gunicorn\nDjango API + SPA"]
    GUNI --> PG[("PostgreSQL")]
    GUNI --> REDIS[("Redis")]
    CEL["Celery workers"] --> REDIS
    CEL --> PG
    BK["backup.sh"] --> PG
```

`deploy/` contains the full Docker stack, `.env` template, Nginx TLS config and backup
scripts — from zero to a hosted multi-store SaaS. See [deploy/README.md](deploy/README.md)
and [deploy/DEPLOY.md](deploy/DEPLOY.md).

---

## 6. The checkout money path

Why totals are always right, on every client:

```mermaid
sequenceDiagram
    participant C as POS client (web/mobile)
    participant S as checkout_engine (server)
    C->>C: per-line r2(subtotal) + r2(tax),<br/>discount before tax scaling
    C->>S: POST /checkout {lines, payments,<br/>invoice_total, Idempotency-Key}
    S->>S: recompute with identical rules
    alt totals agree
        S->>S: create sale · decrement stock ·<br/>post double-entry GL
        S-->>C: receipt #INV-xxxxxxxx
    else mismatch
        S-->>C: 400 with expected total → client retries once
    end
    Note over S: same Idempotency-Key → same sale,<br/>never a duplicate charge
```

---

## 7. Quick start & documentation

```bash
# backend API
cd backend/v17src && python manage.py migrate && python manage.py runserver

# website UI
cd frontend && npm install && npm run dev      # http://localhost:5173

# mobile app
cd mobile && npm install && npx expo start     # scan QR with Expo Go
```

| Document | What's inside |
|---|---|
| [docs/INSTALL.md](docs/INSTALL.md) | Every install path: desktop exe, from source, website dev, mobile, production |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Step-by-step workflows with screenshots |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | All system diagrams and data flow |
| [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md) | Every page explained — phone, tablet, desktop, website-in-browser |
| [backend/README.md](backend/README.md) | Every API domain + checkout/auth diagrams |
| [frontend/README.md](frontend/README.md) | Every web module with screenshots |
| [mobile/README.md](mobile/README.md) | Every mobile screen with screenshots |
| [desktop/README.md](desktop/README.md) | Boot/LAN/build diagrams |
| [deploy/README.md](deploy/README.md) | Production stack |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Day-to-day guide for staff |

## Security highlights
Admin-gated account creation, server-enforced stored-value balances, tenant scoping on
money paths, signed payment webhooks, password validators, refresh-token revocation,
discount caps, hardened production settings.

## License / attribution
© S POS · Developed by **Sridhar Mahalingam**.
