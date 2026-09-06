# NovaPOS V17 Final Production

Fixes: standard manage.py, Python 3.14-compatible psycopg 3.2.13, GiftCard ordering FieldError, normalized migration packages, and admin/session smoke tests.

Run:
`python -m pip install -r requirements.txt`
`python manage.py check`
`python manage.py makemigrations`
`python manage.py migrate`
`python manage.py test tests_support.test_admin_session_v17`
`python manage.py check --deploy`

PostgreSQL: novapos / postgres / changeme @ 127.0.0.1:5432
