from decimal import Decimal
from django.db import transaction
from .credit_models import GiftCard,StoreCredit,CustomerCreditAccount

@transaction.atomic
def redeem_gift_card(*,code,amount):
    card=GiftCard.objects.select_for_update().get(code=code,active=True)
    value=Decimal(str(amount))
    if value<=0 or card.balance<value: raise ValueError("Insufficient gift card balance")
    card.balance-=value
    card.save(update_fields=["balance"])
    if card.balance==0: card.active=False; card.save(update_fields=["active"])
    return card

@transaction.atomic
def redeem_store_credit(*,customer,amount):
    value=Decimal(str(amount))
    credits=list(StoreCredit.objects.select_for_update().filter(customer=customer,balance__gt=0).order_by("created_at"))
    remaining=value
    for credit in credits:
        if remaining<=0: break
        take=min(credit.balance,remaining)
        credit.balance-=take; credit.save(update_fields=["balance"])
        remaining-=take
    if remaining>0: raise ValueError("Insufficient store credit")
    return value-remaining
