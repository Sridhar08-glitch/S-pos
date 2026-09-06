from django.db import transaction
from transaction_engine.services import begin,event,commit,fail
from sales.services import checkout as create_sale
from finance.services import post_sale
from .models import CheckoutExecution

def execute_checkout(*,user,session,items,payments,idempotency_key,device_id="",tax_rate="0",customer=None,customer_id=None,discount_percent="0",price_list_id=None,manager_pin=None,round_to=None):
    if customer is None and customer_id:
        from customers.models import Customer
        customer=Customer.objects.get(id=customer_id)
    payload={"items":items,"payments":payments,"discount_percent":str(discount_percent),"customer_id":getattr(customer,"id",None),"price_list_id":price_list_id}
    tx,created=begin(store=session.store,user=user,idempotency_key=idempotency_key,transaction_type="SALE",payload=payload,device_id=device_id)
    if not created:return tx
    try:
        with transaction.atomic():
            event(tx,"PRICING_STARTED",{"items":len(items)})
            sale=create_sale(user=user,session=session,customer=customer,items=items,discount_percent=discount_percent,payments=payments,price_list_id=price_list_id,manager_pin=manager_pin,round_to=round_to)
            event(tx,"SALE_COMMITTED",{"sale_id":sale.id,"total":str(sale.total_amount)})
            post_sale(sale=sale,user=user)
            event(tx,"ACCOUNTING_COMMITTED",{"sale_id":sale.id})
            CheckoutExecution.objects.create(transaction_id=tx,store=session.store,sale=sale,stage="COMMITTED",pricing_total=sale.total_amount,tax_total=sale.tax_amount,payment_total=sale.total_amount,inventory_total=sale.subtotal,created_by=user)
        commit(tx)
        return tx
    except Exception as exc:
        fail(tx,exc)
        raise
