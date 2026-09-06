# NovaPOS V12 Final Production Checklist

## Fresh install
- PostgreSQL 15+ available on `127.0.0.1:5432`
- Database `novapos`
- User `postgres`
- Password `changeme`
- Redis available if Celery/cache is enabled
- Run `setup_windows.bat`

## Core API
- `POST /api/v1/auth/token/`
- `POST /api/v1/auth/token/refresh/`
- `GET /api/v1/auth/me/`
- CRUD endpoints exposed by each app router
- Request IDs returned as `X-Request-ID`
- `Idempotency-Key` accepted by checkout/payment operations

## Business integrity
- Checkout is server authoritative
- Inventory changes occur in transaction boundaries
- Payment amount is validated server-side
- Refunds are transaction-backed
- Audit events are recorded for sensitive operations
- Store/company access must be enforced by the permission layer

## Deployment
- Set `DEBUG=False`
- Replace `SECRET_KEY`
- Restrict `ALLOWED_HOSTS`
- Restrict CORS/CSRF origins
- Use managed PostgreSQL/Redis in production
- Configure HTTPS and secure cookies
- Configure object storage for media where appropriate
- Configure payment provider secrets and signed webhooks
- Configure email provider
- Configure backups, point-in-time recovery and monitoring

## Important
This repository provides the application foundation and integration points. Payment processors, fiscal/e-invoicing rules, ESC/POS drivers, cash drawers, scanners, customer displays and local hardware bridges are deployment-specific and must be tested against the exact provider/device before live use.
