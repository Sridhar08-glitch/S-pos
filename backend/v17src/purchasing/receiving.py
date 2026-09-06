from decimal import Decimal
from django.db import transaction
from inventory.services import adjust_stock
from inventory.traceability import ProductBatch

@transaction.atomic
def receive_purchase(*,purchase,store,user,items):
    for row in items:
        product=row["product"]
        qty=Decimal(str(row["quantity"]))
        adjust_stock(store=store,product=product,delta=qty,user=user,transaction_type="PURCHASE",
                     reference_type="PURCHASE",reference_id=purchase.id)
        if row.get("batch_number"):
            ProductBatch.objects.create(product=product,store=store,batch_number=row["batch_number"],
                expiry_date=row.get("expiry_date"),quantity=qty,unit_cost=Decimal(str(row.get("unit_cost",0))))
    purchase.status="RECEIVED"
    purchase.save(update_fields=["status"])
    return purchase
