# S POS — Backend API (`backend/v17src`)

The single source of truth for every S POS client — the website, the Windows desktop
app and the mobile app all speak to this one API. **Django 5.2 + Django REST
Framework**, JWT auth (SimpleJWT), OpenAPI schema via drf-spectacular.

Developed by **Sridhar Mahalingam**.

---

## 1. How every client reaches it

```mermaid
flowchart LR
    MOB["📱 Mobile app"] -->|"Bearer JWT"| API
    WEB["🌐 Website SPA"] -->|"Bearer JWT"| API
    EXE["🖥️ SPOS.exe window"] -->|localhost| API
    subgraph API["Django 5.2 + DRF"]
        U["config/urls.py\n/admin · /api/v1 · /health\n/api/schema · /api/docs (Swagger)"]
    end
    API --> SQL[("SQLite — desktop mode\nPostgreSQL — website mode")]
```

- `/api/v1/…` — the versioned API (also mounted at `/api/…`).
- `/api/docs/` — **interactive Swagger UI**, `/api/schema/` — OpenAPI schema.
- `/health/` — liveness endpoint used by monitors and the desktop launcher.
- `/admin/` — Django admin for low-level maintenance.

## 2. Domain map — what each app does

```mermaid
flowchart TB
    subgraph Sell
        SALES["sales — sales, receipts, refunds"]
        CHK["checkout_engine — cart → sale,\ntotals validation, idempotency"]
        REG["registers — tills, sessions,\ncash movements, X/Z"]
        PAY["payments — tenders, gateways,\nsigned webhooks"]
    end
    subgraph Catalog
        CAT["catalog — products, categories,\nvariants, modifiers, barcodes"]
        PRC["pricing — price lists, overrides"]
        PROMO["promotions — discounts, rules"]
        TAX["taxes — tax rates & rules"]
    end
    subgraph Inventory
        INV["inventory — stock, counts,\ntransfers, batches, serials"]
        PUR["purchasing — POs, receiving,\nsuppliers"]
    end
    subgraph People
        ACC["accounts — users, roles, JWT,\nPIN, bootstrap/setup wizard"]
        CUS["customers — CRM, credit"]
        LOY["loyalty — points, gift cards,\nstore credit"]
    end
    subgraph Money
        FIN["finance — double-entry GL,\nreconciliation"]
        EXP["expenses — expenses & approvals"]
        APPR["approvals — manager approvals"]
    end
    subgraph Platform
        STO["stores — stores & companies"]
        TEN["tenancy — company scoping"]
        REP["reports — dashboard, X/Z,\nsales analytics, CSV"]
        AUD["audit — audit trail"]
        OFF["offline_sync — event queue sync"]
        HW["hardware — printers, drawers"]
        TRX["transaction_engine — atomic\nbusiness transactions"]
        HP["health — liveness"]
    end
    CHK --> SALES
    CHK --> INV
    CHK --> FIN
    SALES --> REG
```

### URL prefix → app (from `config/v1_urls.py`)

| Prefix | App | Functionality |
|---|---|---|
| `/api/v1/auth/` | accounts | Login (JWT pair), refresh, logout/blacklist, bootstrap first-run setup, users & roles, PIN |
| `/api/v1/stores/` | stores | Companies, stores, currency per company |
| `/api/v1/catalog/` | catalog | Products, categories, variants, modifiers, barcode lookup, images |
| `/api/v1/inventory/` | inventory | Stock levels, adjustments, stock counts, transfers, batches, serials, low stock |
| `/api/v1/customers/` | customers | CRM, house credit accounts |
| `/api/v1/purchasing/` | purchasing | Suppliers, purchase orders, (partial) receiving |
| `/api/v1/promotions/` | promotions | Promotion rules & application |
| `/api/v1/loyalty/` | loyalty | Loyalty points, gift cards, store credit |
| `/api/v1/registers/` | registers | Registers, open/close sessions, cash movements |
| `/api/v1/sales/` | sales | Sales list/detail, receipts, refunds (with GL reversal) |
| `/api/v1/checkout/` | checkout_engine | The checkout: validates totals, creates the sale atomically |
| `/api/v1/finance/` | finance | Double-entry ledger, reconciliation |
| `/api/v1/expenses/` | expenses | Expense tracking |
| `/api/v1/approvals/` | approvals | Manager approval workflow |
| `/api/v1/pricing/` | pricing | Price lists |
| `/api/v1/taxes/` | taxes | Tax rates |
| `/api/v1/reports/` | reports | Dashboard stats, sales by item/cashier/hour, X/Z, CSV export |
| `/api/v1/payments/` | payments | Payment providers, signed webhooks |
| `/api/v1/offline/` | offline_sync | Offline event queue ingestion |
| `/api/v1/transactions/` | transaction_engine | Atomic multi-step business transactions |
| `/api/v1/tenancy/` | tenancy | Company/tenant scoping |
| `/api/v1/audit/` | audit | Audit trail |
| `/api/v1/hardware/` | hardware | Receipt printers, cash drawers |
| `/api/v1/production/` | production_core | Production/readiness utilities |

## 3. The checkout workflow (the money path)

```mermaid
sequenceDiagram
    participant Client as POS client (web/mobile)
    participant CE as checkout_engine
    participant INV as inventory
    participant FIN as finance (GL)
    Client->>CE: POST /api/v1/checkout {lines, payments,<br/>invoice_total, session, Idempotency-Key}
    CE->>CE: recompute per-line r2(subtotal), r2(tax),<br/>discount before tax scaling
    alt client total ≠ server total
        CE-->>Client: 400 "…does not equal invoice total X"
    else totals agree
        CE->>INV: decrement stock (batches/serials aware)
        CE->>FIN: post double-entry GL entries
        CE-->>Client: sale + receipt number INV-xxxxxxxx
    end
    Note over CE: Same Idempotency-Key replayed →<br/>same sale returned, never duplicated
```

**Server-authoritative money**: pricing, promotions, tax, stored-value balances and
checkout totals are always computed here; clients only *estimate* for display.

## 4. Authentication workflow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as accounts (/auth)
    C->>A: POST /auth/token {username, password}
    A-->>C: access JWT (short-lived) + refresh JWT
    C->>A: …API calls with Bearer access…
    A-->>C: 401 (expired)
    C->>A: POST /auth/token/refresh {refresh}
    A-->>C: new access (+ rotated refresh)
    C->>A: POST /auth/logout → refresh blacklisted
```

First run: `/auth/bootstrap` powers the **setup wizard** — creates company, store,
currency and the owner account. There are **no default credentials**.
Roles: Owner / Manager / Cashier / Inventory; manager-PIN approves price overrides.

## 5. Running it

```bash
cd backend/v17src
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver          # http://127.0.0.1:8000
```

| Env var | Effect |
|---|---|
| `NOVAPOS_DESKTOP=1` | Desktop mode: SQLite, LAN-friendly CORS |
| `NOVAPOS_DATA=<dir>` | Data folder (SQLite DB, uploads, secret key) |
| `NOVAPOS_WEBAPP=<dir>` | Also serve a built web UI (whitenoise) — how `SPOS.exe` ships one process |
| `DEBUG=False` | Production behaviour |

Tests live in `tests/` (`python manage.py test`).

## 6. Related documentation

- Big-picture architecture & diagrams → [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
- All install paths → [`docs/INSTALL.md`](../docs/INSTALL.md)
- The UI this API powers → [`frontend/README.md`](../frontend/README.md),
  [`mobile/README.md`](../mobile/README.md), [`desktop/README.md`](../desktop/README.md)

© S POS · Developed by **Sridhar Mahalingam**.
