# NovaPOS Backend V18 — Production Integrity

V18 hardens the V17 backend around transaction integrity, split-tender accounting, reversals, store inventory authority, barcode aliases, register controls, offline lifecycle, customer money ledgers, loyalty operations, promotions/price lists, partial receiving/transfers, expense workflows, reporting filters, webhook authentication, tenant scoping, production settings and migration safety.

## First setup
1. Create a virtual environment with a supported Python version.
2. Install `requirements.txt`.
3. Set `.env` / production secrets.
4. Run `python manage.py check`.
5. Run `python scripts/generate_migrations.py` on a clean V17 database/source. This is intentionally NOT executed during Django startup.
6. Run `python manage.py check --deploy`.
7. Load demo data only after migrations.

## Important behavior
- Checkout is idempotent at HTTP and business-transaction levels. Failed checkouts persist a FAILED transaction record.
- Invoice numbers are generated from a locked per-store sequence.
- Split tender posts one journal debit per captured payment method.
- Void/refund reverse inventory and accounting; cash refunds reduce register cash expectations.
- StoreInventory is the operational stock source; global Product stock is not used for store low-stock reporting.
- ProductBarcode aliases are included in lookup.
- Register closing is restricted to the cashier or manager/admin.
- Offline events remain QUEUED until a worker processes them; `processed_at` is no longer set at acceptance.
- Payment webhooks require `X-NovaPOS-Signature: HMAC-SHA256(body)` and idempotency.
- Promotions and customer price lists can participate in checkout via `price_list_id`.
- Purchase and transfer receiving supports partial quantities.
- Expenses expose approve/pay/void lifecycle actions.

## Migration note
The V17 package did not contain generated migration files. V18 includes a safe migration-generation script so migrations are generated only after Django is installed and the app registry is initialized. Commit the resulting migration files to source control before deploying.
