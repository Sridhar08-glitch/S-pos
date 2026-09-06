from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.db.models import F
from .models import StoreInventory

@transaction.atomic
def reserve_stock(*,store,product,quantity):
    qty=Decimal(str(quantity))
    inv=StoreInventory.objects.select_for_update().get(store=store,product=product)
    available=inv.quantity-inv.reserved_quantity
    if available<qty: raise ValueError("Insufficient available stock")
    inv.reserved_quantity=F("reserved_quantity")+qty
    inv.save(update_fields=["reserved_quantity","updated_at"])
    inv.refresh_from_db()
    return inv

@transaction.atomic
def release_stock(*,store,product,quantity):
    qty=Decimal(str(quantity))
    inv=StoreInventory.objects.select_for_update().get(store=store,product=product)
    if inv.reserved_quantity<qty: raise ValueError("Cannot release more than reserved")
    inv.reserved_quantity=F("reserved_quantity")-qty
    inv.save(update_fields=["reserved_quantity","updated_at"])
    inv.refresh_from_db()
    return inv
