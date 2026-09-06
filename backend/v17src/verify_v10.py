import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE","config.settings")
import django
django.setup()
from django.urls import resolve
checks=[
 ("/api/v1/auth/token/","accounts"),
 ("/api/v1/auth/token/refresh/","accounts"),
 ("/api/v1/customers/customers/","customers"),
 ("/api/v1/payments/intents/","payments"),
 ("/api/v1/checkout/executions/","checkout_engine"),
 ("/health/","health"),
]
for path,app in checks:
    m=resolve(path)
    print(path,"OK",m.url_name or m.func)
print("NovaPOS V10 import/url verification passed")
