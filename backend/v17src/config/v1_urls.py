from django.urls import include,path
urlpatterns=[
 path("auth/",include("accounts.urls")),path("stores/",include("stores.urls")),path("catalog/",include("catalog.urls")),path("inventory/",include("inventory.urls")),path("customers/",include("customers.urls")),
 path("purchasing/",include("purchasing.urls")),path("promotions/",include("promotions.urls")),path("loyalty/",include("loyalty.urls")),path("registers/",include("registers.urls")),path("sales/",include("sales.urls")),
 path("finance/",include("finance.urls")),path("expenses/",include("expenses.urls")),path("pricing/",include("pricing.urls")),path("hardware/",include("hardware.urls")),path("offline/",include("offline_sync.urls")),
 path("reports/",include("reports.urls")),path("taxes/",include("taxes.urls")),path("approvals/",include("approvals.urls")),path("transactions/",include("transaction_engine.urls")),path("checkout/",include("checkout_engine.urls")),
 path("tenancy/",include("tenancy.urls")),path("payments/",include("payments.urls")),path("audit/",include("audit.urls")),path("production/",include("production_core.urls")),
]
