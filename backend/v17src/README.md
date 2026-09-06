# NovaPOS Backend V8

V8 focuses on real-world transaction reliability and production POS workflows.

## V8 additions

- Atomic checkout orchestration with payment validation before inventory mutation
- COGS captured at sale-item level
- Accounting posting hook during checkout
- Unified transaction/idempotency boundary from V6/V7
- Multi-tenant/company settings and sequence foundations
- Stock reservation/release
- FEFO batch allocation
- Purchase receiving service
- Gift-card redemption
- Store-credit redemption
- Manager approval service
- Health/version endpoint
- All V1-V7 functionality retained

## Checkout guarantees

Checkout validates the full payment total and supported payment methods before changing inventory. Non-cash payments must be captured before a sale is completed. Inventory updates use row locking and occur in the same database transaction as sale creation.

## Production implementation still required

The remaining work is deployment/provider/business-specific:
- real card/QR/wallet gateway adapters and signed webhook verification
- complete loyalty/promotion application and reversal rules
- complete double-entry COGS journal policy
- offline conflict replay and device security
- ESC/POS/A4 receipt drivers
- local tax/e-invoicing certification and configuration
- CI/CD, backups, observability, load tests, and security review
