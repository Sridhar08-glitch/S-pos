# NovaPOS V10 backend setup (Windows/PostgreSQL)

This package is configured for PostgreSQL:
- database: `novapos`
- user: `postgres`
- password: `changeme`
- host: `127.0.0.1`
- port: `5432`

## Fresh development install

1. Create the PostgreSQL database `novapos` if it does not already exist.
2. Ensure the `postgres` user password is `changeme`.
3. From this folder run:

```bat
python -m pip install -r requirements.txt
python manage.py migrate
python seed_demo.py
python manage.py runserver 127.0.0.1:8000
```

`manage.py migrate` automatically runs `makemigrations` once for the local apps so cross-app migration dependencies are generated together. Set `NOVAPOS_AUTO_MAKEMIGRATIONS=0` if you are maintaining a separately managed migration history.

## Login

Demo seed creates:
- username: `admin`
- password: `admin123`

JWT:
- `POST /api/v1/auth/token/`
- `POST /api/v1/auth/token/refresh/`

Health:
- `GET /health/`
- `GET /health/ready/`

Swagger:
- `/api/docs/`

The backend allows frontend origins `localhost:5173` and `127.0.0.1:5173` and custom headers `X-Request-ID` and `Idempotency-Key`.
