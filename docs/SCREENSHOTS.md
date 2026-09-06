# S POS — Screenshot Tour (every page, explained)

Three versions of S POS, captured from the real running app:

- **📱 Phone** — the mobile app at true phone size (390×844). What you see on a handset.
- **📲 Tablet** — the *same mobile app* on a bigger screen, where it switches to a
  3-pane POS layout.
- **🖥️ Desktop / Website** — the full back-office web UI (what `SPOS.exe` opens and
  what a hosted store serves).

---

## 📱 Phone version — all pages

### Onboarding

| 1 · Setup / Connect | 2 · Offline store setup | 3 · Sign in |
|---|---|---|
| ![](screenshots/mobile/01-setup-connect.png) | ![](screenshots/mobile/02-local-store-setup.png) | ![](screenshots/mobile/03-login.png) |

1. **Setup / Connect** — first-launch choice: *Run my store on this phone* (fully
   offline, no computer needed) or type a store address (`192.168.1.20:8971` for the
   shop PC, or your website).
2. **Offline store setup** — store name, currency picker (USD…QAR…14 total), owner
   username/password, optional sample products. Creates a complete store on the phone.
3. **Sign in** — for an existing server store: username + password with show/hide,
   *Sign In* keeps you logged in via auto-refreshing tokens.

### Home

| 4 · Dashboard | 5 · Notifications |
|---|---|
| ![](screenshots/mobile/04-home-dashboard.png) | ![](screenshots/mobile/05-notifications.png) |

4. **Dashboard** — greeting with store name, four pastel stat cards (**Sales, Orders,
   Profit, Customers**) each with a trend vs yesterday, a period selector (Today ▾),
   the notification bell, and Quick Actions: **New Sale, Products, Customers, Reports**.
5. **Notifications** — live activity feed: every completed sale (amount + invoice
   number + time ago; tap to open the receipt) and low-stock alerts.

### Selling (the daily loop)

| 6 · Products | 7 · Add Product | 8 · Cart bar |
|---|---|---|
| ![](screenshots/mobile/06-products.png) | ![](screenshots/mobile/07-add-product.png) | ![](screenshots/mobile/08-products-cart-bar.png) |

6. **Products** — photo-card grid with prices, search (name/barcode/SKU), camera
   **barcode scanner**, category chips, and **+ Add Product**.
7. **Add Product** — photo upload, name, selling + cost price, category, tax %,
   opening stock, low-stock alert, SKU (auto) and barcode (scan or type).
8. **Products with cart** — tapping cards adds to the cart: quantity badges appear
   and the **View Cart** bar shows item count and running total.

| 9 · Cart | 10 · Payment (Card) | 11 · Payment (Cash) |
|---|---|---|
| ![](screenshots/mobile/09-cart.png) | ![](screenshots/mobile/10-payment-card.png) | ![](screenshots/mobile/11-payment-cash.png) |

9. **Cart** — steppers per line, swipe-left to remove, attach customer, add note,
   discount chips (0/5/10/15 %), live subtotal/tax/total, **Proceed to Payment**.
10. **Payment — Card** — method tiles (Card/Cash/QR/Wallet); card panel with
    tap-insert-swipe and brand badges plus manual entry.
11. **Payment — Cash** — collect-cash panel; totals always visible; confirm completes
    the sale.

| 12 · Receipt | 13 · Share the bill |
|---|---|
| ![](screenshots/mobile/12-receipt.png) | ![](screenshots/mobile/13-receipt-actions.png) |

12. **Sale Completed** — success check, then a premium receipt: store, date/time,
    **#INV number**, cashier, payment method, itemised lines, subtotal/tax/total and a
    scannable barcode.
13. **Receipt actions** — **Print**, **Email**, **Share** (WhatsApp or any app), and
    **New Sale** to serve the next customer.

### Reports & history

| 14 · Sales report | 16 · Orders | 17 · Order detail |
|---|---|---|
| ![](screenshots/mobile/14-sales-report.png) | ![](screenshots/mobile/16-orders.png) | ![](screenshots/mobile/17-order-detail.png) |

14. **Sales** — today's revenue, hourly bar chart, Orders + Avg. Order cards,
    **Top Selling Products** (units + revenue), **Recent Orders**.
16. **Orders** — full history with All/Completed/Pending/Refunded filters, amounts and
    status badges.
17. **Order detail** — any past sale reopens as its full receipt (with barcode) for
    re-printing or re-sharing.

### Management

| 15 · More menu | 18 · Customers | 19 · Inventory | 20 · Categories |
|---|---|---|---|
| ![](screenshots/mobile/15-more-menu.png) | ![](screenshots/mobile/18-customers.png) | ![](screenshots/mobile/19-inventory.png) | ![](screenshots/mobile/20-categories.png) |

15. **More** — hub for Orders, Customers, Inventory, Categories, Settings, About
    (version) and Log Out.
18. **Customers** — searchable customer book with **+ Add**; friendly empty state.
19. **Inventory** — stock per product ("120 left") with **In/Low/Out of stock** filters.
20. **Categories** — create categories, tap for the products inside.

| 21 · Settings | 22 · Settings (scrolled) |
|---|---|
| ![](screenshots/mobile/21-settings.png) | ![](screenshots/mobile/22-settings-scrolled.png) |

21. **Settings (top)** — the **Register** card with live status and
    **Close register (end of day)** → cash-count reconciliation (over/short).
22. **Settings (rest)** — Store Profile, Payment Methods (toggle checkout tiles),
    Receipt Settings, Users & Staff, App Preferences (haptics), Help & Support.

---

## 📲 Tablet version — same app, bigger layout

Put the same app on a tablet and it re-arranges itself: the bottom tab bar becomes a
**left sidebar**, and the POS becomes **3-pane** — navigation | product grid | an
always-visible cart. That's the difference at a glance:

| Phone: grid + View Cart bar | Tablet: sidebar + grid + live cart panel |
|---|---|
| ![](screenshots/mobile/08-products-cart-bar.png) | ![](screenshots/tablet/03-pos-with-cart.png) |

| Tablet dashboard | Tablet products |
|---|---|
| ![](screenshots/tablet/01-dashboard.png) | ![](screenshots/tablet/02-products.png) |

| Tablet payment | Tablet sales report |
|---|---|
| ![](screenshots/tablet/04-payment.png) | ![](screenshots/tablet/05-sales.png) |

- **Dashboard / Sales / Settings** — sidebar (Dashboard, Products, Sales, Settings)
  with the signed-in user pinned at the bottom; content uses the full width.
- **Products (POS mode)** — tap cards on the left, the **cart panel on the right**
  updates live with steppers, customer, discount chips, order summary and
  **Proceed to Payment** — no extra taps to "view cart" like on the phone.

---

## 🖥️ Desktop / Website version — the full back-office

The web UI ("Aurora" design) that `SPOS.exe` opens on the shop PC and that a hosted
store serves to any browser. Far deeper than the mobile app: variants, promotions,
purchasing, gift cards, loyalty, accounting, approvals, X/Z reports, multi-store.

| Landing / Sign in |
|---|
| ![](screenshots/desktop/01-login.png) |

**Sign in** — marketing hero ("Run your entire retail operation") + workspace login.

| Overview dashboard |
|---|
| ![](screenshots/desktop/02-dashboard.png) |

**Overview** — welcome banner with **Open Point of Sale** / **View reports** / Live
badge; stat cards (Today's sales, Sales today, Low stock, All-time revenue); quick
actions (New sale, Add product, New purchase, Transfer stock, Customer, Reports).
The dark sidebar groups everything: SELL, CATALOG, INVENTORY, MONEY & REPORTS,
STORE SETUP, ADVANCED.

| Point of Sale |
|---|
| ![](screenshots/desktop/03-point-of-sale.png) |

**Point of Sale** — the full till: register-session banner (open/close), barcode/SKU
scan box, walk-in customer + price list + rounding controls, product cards with stock
badges, and a right rail with **split tender** (Cash/Card/QR/Bank/Wallet), exact-cash
helper, **Park** / **Held** sales, and **Complete sale**.

| Sales | Customers |
|---|---|
| ![](screenshots/desktop/04-sales.png) | ![](screenshots/desktop/05-customers.png) |

**Sales** — every transaction with receipt/refund actions. **Customers** — CRM list
with loyalty, store credit and purchase history.

| Products | Categories |
|---|---|
| ![](screenshots/desktop/06-products.png) | ![](screenshots/desktop/07-categories.png) |

**Products** — catalog cards with stock badges, SKU, price, Edit/delete, **+ Add
Product** and search. **Categories** — organise the catalog.

| Stock | Purchasing |
|---|---|
| ![](screenshots/desktop/08-stock.png) | ![](screenshots/desktop/09-purchasing.png) |

**Stock** — live levels per store with adjustments. **Purchasing** — purchase orders
and (partial) receiving from suppliers.

| Reports | Registers | Settings |
|---|---|---|
| ![](screenshots/desktop/10-reports.png) | ![](screenshots/desktop/11-registers.png) | ![](screenshots/desktop/12-settings.png) |

**Reports** — filterable dashboard (date/store/register/cashier): sales count, gross,
tax, low stock, sales report, payments breakdown and **X report** for the open shift /
**Z report** at day end. **Registers** — physical tills and their sessions.
**Settings** — store, tax rates, users and company configuration.

---

## 🌍 The website in a phone / tablet browser

The website is this same web UI served over the internet (or by `SPOS.exe` on the shop
Wi-Fi). It's responsive — here is how it looks when staff open the store address in a
**phone browser** and a **tablet browser**:

| Phone browser — landing/login | Phone browser — dashboard | Phone browser — POS |
|---|---|---|
| ![](screenshots/website-mobile/phone-01-login.png) | ![](screenshots/website-mobile/phone-02-dashboard.png) | ![](screenshots/website-mobile/phone-03-pos.png) |

| Tablet browser — dashboard | Tablet browser — Point of Sale |
|---|---|
| ![](screenshots/website-mobile/tablet-01-dashboard.png) | ![](screenshots/website-mobile/tablet-02-pos.png) |

So the full picture: the **native mobile app** (top of this page) is the nicest phone
experience; the **website in a browser** works on anything with zero installation; and
both talk to the same store.
