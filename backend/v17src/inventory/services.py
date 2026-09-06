from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from .models import StoreInventory,InventoryLedger,StockTransfer,StockTransferItem,StockCount,StockCountItem
from catalog.models import Product
import uuid

@transaction.atomic
def post_stock_count(*,user,count):
    if count.status!="DRAFT": raise ValueError("Only draft counts can be posted")
    for item in count.items.select_related("product"):
        inv=StoreInventory.objects.filter(store=count.store,product=item.product).first()
        system=inv.quantity if inv else Decimal("0")
        delta=Decimal(str(item.counted_quantity))-system
        item.system_quantity=system; item.variance=delta; item.save(update_fields=["system_quantity","variance"])
        if delta!=0:
            adjust_stock(store=count.store,product=item.product,delta=delta,user=user,transaction_type="ADJUSTMENT",reference_type="STOCK_COUNT",reference_id=count.id,note=f"Count {count.reference}")
    count.status="POSTED"; count.posted_at=timezone.now(); count.save(update_fields=["status","posted_at"])
    return count

@transaction.atomic
def adjust_stock(*,store,product,delta,user,transaction_type,reference_type="",reference_id="",note=""):
    inv=StoreInventory.objects.select_for_update().filter(store=store,product=product).first()
    if not inv: inv=StoreInventory.objects.create(store=store,product=product,quantity=0,minimum_stock=product.minimum_stock)
    inv=StoreInventory.objects.select_for_update().get(pk=inv.pk); before=inv.quantity; after=before+Decimal(str(delta))
    if after<0: raise ValueError(f"Insufficient stock for {product.name}")
    inv.quantity=after; inv.save(update_fields=["quantity","updated_at"])
    InventoryLedger.objects.create(store=store,product=product,transaction_type=transaction_type,quantity=delta,before_quantity=before,after_quantity=after,reference_type=reference_type,reference_id=str(reference_id),note=note,created_by=user)
    return inv

@transaction.atomic
def create_transfer(*,user,source_store,destination_store,items):
    if source_store.id==destination_store.id: raise ValueError("Stores must differ")
    t=StockTransfer.objects.create(transfer_number=f"TRF-{uuid.uuid4().hex[:10].upper()}",source_store=source_store,destination_store=destination_store,created_by=user,status="APPROVED",approved_by=user)
    for row in items:
        product=Product.objects.get(id=row["product_id"]); qty=Decimal(str(row["quantity"]))
        if qty<=0: raise ValueError("Transfer quantity must be positive")
        inv=StoreInventory.objects.select_for_update().filter(store=source_store,product=product).first()
        if not inv or inv.quantity<qty: raise ValueError(f"Insufficient stock for {product.name}")
        StockTransferItem.objects.create(transfer=t,product=product,quantity=qty)
    return t

@transaction.atomic
def ship_transfer(*,user,transfer):
    if transfer.status!="APPROVED": raise ValueError("Transfer must be approved")
    for item in transfer.items.select_related("product"):
        if item.quantity<=0: continue
        adjust_stock(store=transfer.source_store,product=item.product,delta=-item.quantity,user=user,transaction_type="TRANSFER_OUT",reference_type="TRANSFER",reference_id=transfer.id)
    transfer.status="SHIPPED"; transfer.shipped_at=timezone.now(); transfer.save(update_fields=["status","shipped_at"]); return transfer

@transaction.atomic
def receive_transfer(*,user,transfer,items=None):
    if transfer.status not in ["SHIPPED","RECEIVED"]: raise ValueError("Transfer must be shipped")
    requested={int(x["item_id"]):Decimal(str(x["quantity"])) for x in (items or [])}
    any_received=False
    for item in transfer.items.select_related("product"):
        remaining=item.quantity-item.received_quantity; qty=requested.get(item.id,remaining) if items is not None else remaining
        if qty<0 or qty>remaining: raise ValueError(f"Invalid receive quantity for {item.product.name}")
        if qty:
            adjust_stock(store=transfer.destination_store,product=item.product,delta=qty,user=user,transaction_type="TRANSFER_IN",reference_type="TRANSFER",reference_id=transfer.id)
            item.received_quantity+=qty; item.save(update_fields=["received_quantity"]); any_received=True
    complete=all(x.received_quantity>=x.quantity for x in transfer.items.all())
    transfer.status="RECEIVED" if complete else "SHIPPED"
    if complete: transfer.received_at=timezone.now(); transfer.save(update_fields=["status","received_at"])
    else: transfer.save(update_fields=["status"])
    return transfer
