from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.utils import timezone
from catalog.models import Product
from inventory.services import adjust_stock
from .models import Sale,SaleItem,Payment,Refund,RefundItem,InvoiceSequence
import uuid

def money(v): return Decimal(str(v)).quantize(Decimal("0.01"),rounding=ROUND_HALF_UP)

def _verify_manager_pin(pin):
    """True if the PIN matches any active ADMIN/MANAGER — used to authorize price overrides at the till."""
    if not pin: return False
    from django.contrib.auth.hashers import check_password
    from accounts.models import User
    for m in User.objects.filter(role__in=["ADMIN","MANAGER"],is_active=True).exclude(pos_pin_hash=""):
        if m.pos_pin_hash and check_password(str(pin),m.pos_pin_hash): return True
    return False

def _price(product, customer=None, price_list_id=None):
    if price_list_id:
        from pricing.models import PriceListItem
        item=PriceListItem.objects.filter(price_list_id=price_list_id,product=product,price_list__active=True).first()
        if item is not None: return money(item.price)
    if customer is not None:
        from pricing.models import CustomerPriceList,PriceListItem
        link=CustomerPriceList.objects.filter(customer=customer,price_list__active=True).select_related("price_list").first()
        if link:
            item=PriceListItem.objects.filter(price_list=link.price_list,product=product).first()
            if item is not None:return money(item.price)
    return money(product.selling_price)

def _promo_discount(product, qty, subtotal):
    from promotions.models import Promotion
    now=timezone.now()
    promos=Promotion.objects.filter(active=True,starts_at__lte=now,ends_at__gte=now).filter(product=product)
    if product.category_id:
        promos=promos | Promotion.objects.filter(active=True,starts_at__lte=now,ends_at__gte=now,category=product.category)
    best=Decimal("0")
    for promo in promos.distinct():
        if promo.kind=="PERCENT": d=money(subtotal*promo.value/Decimal("100"))
        elif promo.kind=="FIXED": d=min(money(promo.value),money(subtotal))
        elif promo.kind=="BUY_X_GET_Y" and promo.buy_quantity>0 and qty>=promo.buy_quantity:
            free=qty//promo.buy_quantity*promo.get_quantity
            d=min(money(subtotal),money(free*(subtotal/qty))) if qty else Decimal("0")
        else: continue
        best=max(best,d)
    return best

@transaction.atomic
def checkout(*,user,session,customer,items,discount_percent=0,payments=None,notes="",price_list_id=None,manager_pin=None,round_to=None):
    if session.status!="OPEN": raise ValueError("Register session is not open")
    if not items: raise ValueError("Sale must contain at least one item")
    payments=payments or []
    if not payments: raise ValueError("At least one payment is required")
    # Custom-priced lines, line overrides and line discounts need manager authority (role or a valid manager PIN).
    def _has_override(r): return bool(r.get("custom")) or (r.get("unit_price_override") not in (None,"")) or Decimal(str(r.get("line_discount_percent") or 0))>0
    if any(_has_override(r) for r in items) and getattr(user,"role","") not in ("ADMIN","MANAGER") and not _verify_manager_pin(manager_pin):
        raise ValueError("Manager approval (PIN) required for price overrides")
    seq, _=InvoiceSequence.objects.select_for_update().get_or_create(store=session.store,defaults={"prefix":"INV","next_number":1})
    sale=Sale.objects.create(invoice_number=seq.next_invoice(),store=session.store,register=session.register,register_session=session,customer=customer,cashier=user,notes=notes)
    subtotal=Decimal("0"); tax_before=Decimal("0"); promo_discount=Decimal("0"); normalized=[]
    for row in items:
        qty=Decimal(str(row["quantity"]))
        if qty<=0: raise ValueError("Quantity must be positive")
        ld=Decimal(str(row.get("line_discount_percent") or 0))
        if ld<0 or ld>100: raise ValueError("Line discount must be between 0 and 100")
        if row.get("custom"):
            name=(row.get("name") or "Custom item").strip()[:200] or "Custom item"
            unit=money(row.get("unit_price",0))
            if unit<0: raise ValueError("Unit price cannot be negative")
            trate=Decimal(str(row.get("tax_rate",0) or 0))
            ls=money(money(unit*qty)*(Decimal("100")-ld)/Decimal("100")); lt=money(ls*trate)
            subtotal+=ls; tax_before+=lt
            normalized.append({"product":None,"name":name,"sku":"CUSTOM","qty":qty,"unit":unit,"ls":ls,"lt":lt,"trate":trate,"cost":Decimal("0")})
            continue
        product=Product.objects.select_for_update().get(id=row["product_id"],active=True)
        variant=None
        if row.get("variant_id"):
            from catalog.variants import ProductVariant
            variant=ProductVariant.objects.filter(id=row["variant_id"],product=product,active=True).first()
            if not variant: raise ValueError("Invalid product variant")
        ov=row.get("unit_price_override")
        base=money(ov) if ov not in (None,"") else (money(variant.price) if variant else _price(product,customer,price_list_id))
        mod_delta=Decimal("0"); mod_names=[]
        if row.get("modifiers"):
            from catalog.variants import Modifier
            for m in Modifier.objects.filter(id__in=[int(x) for x in row["modifiers"]],active=True):
                mod_delta+=Decimal(str(m.price_delta)); mod_names.append(m.name)
        unit=money(base+mod_delta)
        if unit<0: raise ValueError("Unit price cannot be negative")
        name=(product.name+(f" — {variant.name}" if variant else "")+(f" (+{', '.join(mod_names)})" if mod_names else ""))[:200]
        sku=(variant.sku or product.sku) if variant else product.sku
        ls=money(money(unit*qty)*(Decimal("100")-ld)/Decimal("100")); lt=money(ls*Decimal(str(product.tax_rate)))
        pd=_promo_discount(product,qty,ls)
        subtotal+=ls; tax_before+=lt; promo_discount+=pd
        normalized.append({"product":product,"name":name,"sku":sku,"qty":qty,"unit":unit,"ls":ls,"lt":lt,"trate":Decimal(str(product.tax_rate)),"cost":product.purchase_price})
    dp=Decimal(str(discount_percent or 0))
    if dp<0 or dp>100: raise ValueError("Discount must be between 0 and 100")
    # Manual discounts above the cashier ceiling require manager/admin authority.
    CASHIER_DISCOUNT_CEILING=Decimal("20")
    if dp>CASHIER_DISCOUNT_CEILING and getattr(user,"role","") not in ("ADMIN","MANAGER"):
        raise ValueError(f"Manager approval required for discounts above {CASHIER_DISCOUNT_CEILING}%")
    manual_discount=money(subtotal*dp/Decimal("100"))
    discount=min(subtotal,money(manual_discount+promo_discount))
    tax=money(tax_before*(subtotal-discount)/subtotal) if subtotal else Decimal("0")
    total=money(subtotal-discount+tax)
    rounding_adjustment=Decimal("0")
    if round_to:
        inc=Decimal(str(round_to))
        if inc>0:
            rounded=(total/inc).quantize(Decimal("1"),rounding=ROUND_HALF_UP)*inc
            rounding_adjustment=money(rounded-total); total=money(rounded)
    paid=Decimal("0")
    for p in payments:
        amount=money(p["amount"])
        if amount<=0: raise ValueError("Payment amount must be positive")
        if p["method"] not in dict(Payment.Method.choices): raise ValueError(f"Unsupported payment method: {p['method']}")
        status=p.get("status","CAPTURED")
        if p["method"]!="CASH" and status!="CAPTURED": raise ValueError("Non-cash payment must be captured")
        paid+=amount
    if paid!=total: raise ValueError(f"Payment total {paid} does not equal invoice total {total}")
    sale.subtotal=subtotal; sale.discount_amount=discount; sale.tax_amount=tax; sale.rounding_adjustment=rounding_adjustment; sale.total_amount=total; sale.save(update_fields=["subtotal","discount_amount","tax_amount","rounding_adjustment","total_amount"])
    for n in normalized:
        if n["product"] is not None:
            adjust_stock(store=session.store,product=n["product"],delta=-n["qty"],user=user,transaction_type="SALE",reference_type="SALE",reference_id=sale.id)
        SaleItem.objects.create(sale=sale,product=n["product"],product_name=n["name"],sku=n["sku"],unit_price=n["unit"],quantity=n["qty"],tax_rate=n["trate"],line_subtotal=n["ls"],line_tax=n["lt"],line_total=money(n["ls"]+n["lt"]),unit_cost=n["cost"],cost_total=money(n["cost"]*n["qty"]))
    for p in payments:
        Payment.objects.create(sale=sale,method=p["method"],amount=money(p["amount"]),status=p.get("status","CAPTURED"),provider=p.get("provider",""),reference=p.get("reference",""),idempotency_key=p.get("idempotency_key"))
    return sale

@transaction.atomic
def void_sale(*,user,sale,reason=""):
    if sale.status!="COMPLETED": raise ValueError("Only completed sales can be voided")
    from finance.services import reverse_sale
    for item in sale.items.select_related("product").select_for_update():
        if item.product_id:
            adjust_stock(store=sale.store,product=item.product,delta=item.quantity,user=user,transaction_type="RETURN",reference_type="VOID",reference_id=sale.id,note=reason)
    reverse_sale(sale=sale,user=user,reference_type="VOID",reason=reason)
    sale.status="VOID"; sale.save(update_fields=["status"])
    return sale

@transaction.atomic
def refund_sale(*,user,sale,items,reason):
    if sale.status not in ["COMPLETED","PARTIAL_REFUND"]: raise ValueError("Sale cannot be refunded")
    if not items: items=[{"sale_item_id":x.id,"quantity":str(x.quantity-x.refunded_quantity)} for x in sale.items.select_for_update().all() if x.quantity>x.refunded_quantity]
    if not items: raise ValueError("Nothing to refund")
    refund=Refund.objects.create(sale=sale,refund_number=f"REF-{uuid.uuid4().hex[:10].upper()}",cashier=user,amount=0,reason=reason)
    refund_total=Decimal("0")
    for row in items:
        si=SaleItem.objects.select_for_update().select_related("product").get(id=row["sale_item_id"],sale=sale)
        qty=Decimal(str(row["quantity"])); remaining=si.quantity-si.refunded_quantity
        if qty<=0 or qty>remaining: raise ValueError(f"Invalid refund quantity for {si.product_name}")
        amount=money(si.line_total/si.quantity*qty); refund_total+=amount
        if si.product_id:
            adjust_stock(store=sale.store,product=si.product,delta=qty,user=user,transaction_type="RETURN",reference_type="REFUND",reference_id=refund.id)
        si.refunded_quantity+=qty; si.save(update_fields=["refunded_quantity"])
        RefundItem.objects.create(refund=refund,sale_item=si,quantity=qty,amount=amount)
    refund.amount=money(refund_total); refund.save(update_fields=["amount"])
    from finance.services import reverse_sale
    reverse_sale(sale=sale,user=user,reference_type="REFUND",reason=reason,amount=refund.amount)
    total_refunded=sum((r.amount for r in sale.refunds.all()),Decimal("0"))
    sale.status="REFUNDED" if total_refunded>=sale.total_amount else "PARTIAL_REFUND"; sale.save(update_fields=["status"])
    # Mark captured payments refunded/partial proportionally as an operational state.
    captured=list(sale.payments.filter(status__in=["CAPTURED","PARTIAL_REFUND"]).order_by("id"))
    remaining=refund.amount
    cash_refund=Decimal("0")
    for pay in captured:
        if remaining<=0:break
        portion=min(pay.amount,remaining); remaining-=portion
        if pay.method=="CASH": cash_refund+=portion
        pay.status="REFUNDED" if portion>=pay.amount else "PARTIAL_REFUND"
        pay.save(update_fields=["status"])
    if cash_refund:
        from registers.models import CashMovement
        CashMovement.objects.create(session=sale.register_session,movement_type="OUT",amount=cash_refund,reason=f"Refund {refund.refund_number}",created_by=user)
    return refund
