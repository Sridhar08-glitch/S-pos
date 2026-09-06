# NovaPOS Backend V11 â€” Complete Operations Edition

This release is the backend-first foundation for a full POS management application.

## Core APIs
- Authentication/JWT/refresh/users/PIN
- Companies/stores/registers
- Products/categories/product barcodes/bundles
- Customers/credit/gift cards/store credit
- Inventory/ledger/transfers/batches/serials
- Suppliers/purchases/purchase items/receiving
- Sales/payments/refunds/voids
- Price lists/customer pricing/units
- Promotions/coupons foundation
- Loyalty accounts/transactions
- Taxes
- Registers/shifts/cash movements/Z report
- Finance/accounts/journal/reconciliation
- Expenses
- Hardware/devices/heartbeats
- Offline sync
- Approvals
- Transactions/checkout
- Tenancy/settings/sequences
- Audit and reports

## Database
PostgreSQL defaults:
- database: novapos
- user: postgres
- password: changeme
- host: 127.0.0.1
- port: 5432

## Fresh Windows start
```bat
python -m pip install -r requirements.txt
python manage.py check
python manage.py migrate
python seed_demo.py
python manage.py runserver
```

`manage.py migrate` automatically creates missing local migrations before applying them. Set `NOVAPOS_AUTO_MAKEMIGRATIONS=0` if you prefer explicit migration generation.

## Authentication
`POST /api/v1/auth/token/`
`POST /api/v1/auth/token/refresh/`

Demo after `seed_demo.py`:
- admin / admin123

## POS
Use `/api/v1/sales/sales/checkout/` or the transaction-safe `/api/v1/checkout/executions/execute/` flow. Backend pricing is authoritative and stock changes are atomic.

## Production requirements
Before live deployment, configure real payment providers/webhook signature verification, TLS, backups/PITR, monitoring, hardware bridges, tax/e-invoicing compliance and load/security testing.
