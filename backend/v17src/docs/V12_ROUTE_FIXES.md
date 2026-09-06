# V12 Route and Production Fixes

This build includes compatibility routes for clients that previously called:

- `/api/v1/inventory/inventory/` -> StoreInventoryViewSet
- `/api/v1/registers/registers/` -> physical Register CRUD
- `/api/v1/auth/users/` -> UserAdminViewSet

Canonical routes remain:
- `/api/v1/inventory/stock/`
- `/api/v1/stores/registers/`
- `/api/v1/auth/users/`

Other hardening in this build:
- deterministic ordering for paginated querysets
- inventory quantity edits create ledger adjustments instead of silently mutating stock
- inventory records cannot be deleted
- approval/expense/purchase actor fields are filled server-side
- frontend field aliases are accepted for active/cost/reorder/device naming
