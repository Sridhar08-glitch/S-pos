# NovaPOS V14 — Production Hardening

V14 builds on V12/V13 and adds an actual HTTP idempotency layer plus release validation guidance.

## New in V14

- `IdempotencyMiddleware` for POST/PUT/PATCH/DELETE
- Replays successful duplicate mutations with `X-Idempotent-Replay: true`
- Rejects reuse of a key with a different request body (`409`)
- Rejects concurrent identical requests while the first is in progress (`409`)
- 24-hour result retention by default
- V14 API version metadata
- Automated middleware tests

## Important deployment requirement

Use Redis (or another shared cache backend) for multi-process/multi-instance deployments. Do not use local-memory cache for production idempotency.

## Run tests

```bat
python manage.py test tests_support
python manage.py check --deploy
```

## Production invariants

Critical checkout, payment, refund, receiving, transfer and cash-movement services should additionally wrap their database mutations in `transaction.atomic()` and lock affected rows with `select_for_update()` where appropriate.

Idempotency prevents duplicate HTTP submissions; it does not replace database transactions, constraints, or payment-provider reconciliation.
