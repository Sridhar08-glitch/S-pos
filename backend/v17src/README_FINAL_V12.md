# NovaPOS V12 Final Production Backend

This is the hardened backend package for the NovaPOS POS/billing application.

## Immediate fixes included

- `/api/v1/auth/token/` and refresh
- CORS for localhost/127.0.0.1 frontend
- `X-Request-ID` and `Idempotency-Key`
- `/api/v1/inventory/inventory/` compatibility alias
- `/api/v1/registers/registers/` compatibility alias for physical register CRUD
- `/api/v1/auth/users/` user CRUD
- deterministic ordering for paginated querysets
- inventory quantity edits create ledger adjustments
- inventory records cannot be deleted directly
- purchase/expense/approval actor fields are assigned server-side
- frontend aliases such as `cost_price`, `reorder_level`, `is_active`, and `device_type`
- PostgreSQL defaults to `postgres` / `changeme`

## Fresh Windows setup

Use a fresh folder when replacing an older build.

```bat
python -m pip install -r requirements.txt
python manage.py check
python manage.py makemigrations
python manage.py migrate
python seed_demo.py
python manage.py runserver
```

Or run `setup_windows.bat`.

## API

- API: `http://127.0.0.1:8000/api/v1/`
- Swagger: `http://127.0.0.1:8000/api/docs/`
- Health: `http://127.0.0.1:8000/health/`
- Readiness: `http://127.0.0.1:8000/health/ready/`

## PostgreSQL

```text
POSTGRES_DB=novapos
POSTGRES_USER=postgres
POSTGRES_PASSWORD=changeme
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
```

For real production deployment, replace the development secret and use a managed secret store.

## Important

The source migration directories are intentionally generated on first setup because this package may be installed into an existing Django/PostgreSQL environment. Run `python manage.py makemigrations` once on a fresh source tree before `migrate`.

## V14 note
See `PRODUCTION_V14.md` for the production hardening and idempotency layer.
