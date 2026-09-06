from django.db import transaction
from .traceability import ProductBatch
def allocate_fefo(*,store,product,quantity):
    remaining=quantity; allocations=[]
    with transaction.atomic():
        batches=ProductBatch.objects.select_for_update().filter(store=store,product=product,quantity__gt=0).order_by("expiry_date","id")
        for b in batches:
            if remaining<=0: break
            take=min(b.quantity,remaining)
            b.quantity-=take; b.save(update_fields=["quantity"])
            allocations.append({"batch_id":b.id,"quantity":take})
            remaining-=take
        if remaining>0: raise ValueError("Insufficient batch stock")
    return allocations
