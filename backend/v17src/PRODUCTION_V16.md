# NovaPOS V16 â€” Final Backend Fix

## Concrete fix from the user's Windows traceback

`customers/credit_api.py` referenced `GiftCard.created_at`, but the GiftCard model fields are:

- id
- code
- original_amount
- balance
- expires_at
- active

The queryset was changed from:

`GiftCard.objects.all().order_by("-created_at").order_by("-id")`

to:

`GiftCard.objects.all().order_by("-id")`

This removes the `FieldError: Cannot resolve keyword 'created_at'`.

## Run

    python manage.py check
    python manage.py makemigrations
    python manage.py migrate

Then start:

    python manage.py runserver

PostgreSQL defaults remain:

    DB: novapos
    USER: postgres
    PASSWORD: changeme
    HOST: 127.0.0.1
    PORT: 5432
