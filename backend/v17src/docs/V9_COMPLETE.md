# NovaPOS V9 Complete

V9 completes the frontend/backend contract for:
- POS checkout execution
- sales/refunds
- products/barcodes/bundles
- inventory/batches/serials/transfers
- purchasing
- customers/loyalty/credit
- pricing/promotions/taxes
- finance/expenses/reconciliation
- registers
- hardware/offline
- approvals/transactions
- tenancy/company
- reports/health

Run migrations after extracting:
`python manage.py makemigrations && python manage.py migrate`
