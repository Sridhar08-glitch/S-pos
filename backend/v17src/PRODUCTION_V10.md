# NovaPOS V10 Production Edition

V10 hardens the V9 platform for production.

## Added

- `/api/v1/` versioned API while retaining `/api/` compatibility
- Payment intent state machine
- Payment idempotency
- Atomic payment transitions
- Immutable-style audit event model
- Request ID middleware
- Device heartbeat monitoring
- Stronger journal validation helper
- Production environment template
- Centralized production documentation

## Before live money

Configure real payment-provider adapters and signed webhooks, rotate secrets, configure TLS, backups/PITR, monitoring, alerting, object storage, e-invoicing/tax compliance, hardware drivers, and run a full concurrency/security/load test suite.

## Deployment checklist

1. Set `DEBUG=False`.
2. Set a strong secret key.
3. Configure PostgreSQL and Redis.
4. Configure allowed hosts/CORS.
5. Run `python manage.py makemigrations && python manage.py migrate`.
6. Run tests.
7. Run load/concurrency tests.
8. Configure Celery workers.
9. Configure backups and restore drills.
10. Configure payment webhooks and verify signatures.
11. Register every POS device.
12. Verify offline recovery before opening the store.
