from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from .credit_models import CustomerCreditAccount,CreditLedger,GiftCard,GiftCardLedger,StoreCredit,StoreCreditLedger

@transaction.atomic
def credit_account(*,customer,amount,user,reference_type="",reference_id="",note=""):
    amount=Decimal(str(amount)); acct=CustomerCreditAccount.objects.select_for_update().get(customer=customer,active=True); new=acct.balance+amount
    if new>acct.credit_limit: raise ValueError("Credit limit exceeded")
    acct.balance=new; acct.save(update_fields=["balance"]); CreditLedger.objects.create(account=acct,transaction_type="CREDIT",amount=amount,balance_after=new,reference_type=reference_type,reference_id=str(reference_id),note=note,created_by=user); return acct
@transaction.atomic
def debit_account(*,customer,amount,user,reference_type="",reference_id="",note=""):
    amount=Decimal(str(amount)); acct=CustomerCreditAccount.objects.select_for_update().get(customer=customer,active=True); new=acct.balance-amount
    if new<0: raise ValueError("Insufficient customer credit balance")
    acct.balance=new; acct.save(update_fields=["balance"]); CreditLedger.objects.create(account=acct,transaction_type="DEBIT",amount=-amount,balance_after=new,reference_type=reference_type,reference_id=str(reference_id),note=note,created_by=user); return acct
@transaction.atomic
def redeem_gift_card(*,card,amount,user,reference_type="",reference_id=""):
    card=GiftCard.objects.select_for_update().get(pk=card.pk); amount=Decimal(str(amount))
    if not card.active or (card.expires_at and card.expires_at<timezone.now()): raise ValueError("Gift card is inactive or expired")
    if amount<=0 or amount>card.balance: raise ValueError("Invalid gift card amount")
    card.balance-=amount; card.save(update_fields=["balance"]); GiftCardLedger.objects.create(gift_card=card,transaction_type="REDEEM",amount=-amount,balance_after=card.balance,reference_type=reference_type,reference_id=str(reference_id),created_by=user); return card
