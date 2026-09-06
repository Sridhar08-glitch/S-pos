# S POS — Website / SaaS Deployment

**Developed by Sridhar Mahalingam.** Multi-region, multi-currency. This deploys the
**website** version (separate from the Windows desktop app).

## Stack
Nginx (TLS + SPA) → Gunicorn (Django API) → PostgreSQL + Redis, plus a Celery worker.
Everything is containerized via `docker-compose.prod.yml`.

## 1. Prerequisites
- A Linux server (2 vCPU / 4 GB is plenty to start) with **Docker + Docker Compose**.
- A **domain** pointing at the server (e.g. `pos.example.com`).
- TLS certs — easiest is **Let's Encrypt** (certbot). Put `fullchain.pem` + `privkey.pem`
  in `deploy/certs/` (or wire certbot into Nginx).

## 2. Build the web UI (same-origin API)
```bash
cd frontend
echo "VITE_API_URL=/api/v1" > .env.production
npm ci && npm run build
rm .env.production
cp -r dist ../deploy/webapp        # Nginx serves this
```

## 3. Configure
```bash
cd deploy
cp .env.production.example .env
# edit .env — set SECRET_KEY, DB password, ALLOWED_HOSTS, domain, email, webhook secret
```

## 4. Launch
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
First boot runs migrations + collectstatic automatically. Then open `https://your-domain/`
and complete the **first-run setup wizard** (creates the owner account + shop).

## 5. Operate
- **Backups**: schedule `deploy/backup.sh` via cron (DB + media, 14-day retention).
- **Monitoring**: set `SENTRY_DSN` in `.env` for error tracking.
- **Logs**: `docker compose -f docker-compose.prod.yml logs -f web`.
- **Update**: `git pull && docker compose -f docker-compose.prod.yml up -d --build`.
- **Scale**: raise Gunicorn `--workers`, add web replicas behind Nginx.

## Security checklist (already enforced in code / config)
- `DEBUG=False`, strong `SECRET_KEY` (app refuses to boot without it in prod)
- HTTPS redirect + HSTS, secure cookies, nosniff, X-Frame-Options DENY
- JWT with refresh-token blacklist (logout), password validators
- Signed payment webhook (HMAC `PAYMENT_WEBHOOK_SECRET`)
- Server-authoritative pricing/tax/inventory + idempotent checkout
- Per-store data scoping on sales, inventory, purchasing, expenses, registers, payments, finance reconciliation

## Still to configure per business (external)
- **Payment gateway** keys (Razorpay/PayTabs/Stripe) for live card/UPI/QR
- **Fiscal/e-invoicing** accreditation for your country (framework is in place)
