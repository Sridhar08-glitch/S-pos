from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from .models import Account,JournalEntry,JournalLine

PAYMENT_ACCOUNTS={"CASH":("1000","Cash"),"CARD":("1010","Card Receivable"),"QR":("1020","QR Receivable"),"WALLET":("1030","Wallet Receivable"),"BANK":("1040","Bank")}

def acct(code,name,typ): return Account.objects.get_or_create(code=code,defaults={"name":name,"account_type":typ})[0]

def assert_balanced(entry):
    totals=entry.lines.aggregate(d=Sum("debit"),c=Sum("credit"))
    if (totals["d"] or Decimal("0"))!=(totals["c"] or Decimal("0")): raise ValueError("Journal entry is not balanced")
    return True

@transaction.atomic
def post_sale(*,sale,user):
    # One debit per captured payment; never collapse split tender into the first method.
    revenue=acct("4000","Sales Revenue","REVENUE"); tax=acct("2100","Tax Payable","LIABILITY"); inventory=acct("1200","Inventory","ASSET"); cogs=acct("5000","Cost of Goods Sold","EXPENSE")
    entry=JournalEntry.objects.create(reference_type="SALE",reference_id=str(sale.id),description=f"Sale {sale.invoice_number}",store=sale.store,created_by=user)
    for payment in sale.payments.filter(status="CAPTURED"):
        code,name=PAYMENT_ACCOUNTS.get(payment.method,PAYMENT_ACCOUNTS["CASH"]); JournalLine.objects.create(entry=entry,account=acct(code,name,"ASSET"),debit=payment.amount,credit=0,description=f"{payment.method} tender")
    JournalLine.objects.create(entry=entry,account=revenue,debit=0,credit=sale.total_amount-sale.tax_amount)
    if sale.tax_amount: JournalLine.objects.create(entry=entry,account=tax,debit=0,credit=sale.tax_amount)
    cost=sum((x.cost_total for x in sale.items.all()),Decimal("0"))
    if cost: JournalLine.objects.create(entry=entry,account=cogs,debit=cost,credit=0); JournalLine.objects.create(entry=entry,account=inventory,debit=0,credit=cost)
    assert_balanced(entry); return entry

@transaction.atomic
def reverse_sale(*,sale,user,reference_type,reason="",amount=None):
    gross=Decimal(str(amount if amount is not None else sale.total_amount))
    ratio=(gross/sale.total_amount) if sale.total_amount else Decimal("0")
    revenue=acct("4000","Sales Revenue","REVENUE"); tax=acct("2100","Tax Payable","LIABILITY"); inventory=acct("1200","Inventory","ASSET"); cogs=acct("5000","Cost of Goods Sold","EXPENSE")
    entry=JournalEntry.objects.create(reference_type=reference_type,reference_id=str(sale.id),description=f"{reference_type.title()} {sale.invoice_number}: {reason}"[:250],store=sale.store,created_by=user)
    net= (sale.total_amount-sale.tax_amount)*ratio; tax_amt=sale.tax_amount*ratio
    # Reverse payment/tender and revenue/tax.
    remaining=gross
    for payment in sale.payments.all():
        if remaining<=0: break
        part=min(payment.amount,remaining); remaining-=part
        code,name=PAYMENT_ACCOUNTS.get(payment.method,PAYMENT_ACCOUNTS["CASH"]); JournalLine.objects.create(entry=entry,account=acct(code,name,"ASSET"),debit=0,credit=part)
    if net: JournalLine.objects.create(entry=entry,account=revenue,debit=net,credit=0)
    if tax_amt: JournalLine.objects.create(entry=entry,account=tax,debit=tax_amt,credit=0)
    cost=sum((x.cost_total for x in sale.items.all()),Decimal("0"))*ratio
    if cost: JournalLine.objects.create(entry=entry,account=inventory,debit=cost,credit=0); JournalLine.objects.create(entry=entry,account=cogs,debit=0,credit=cost)
    assert_balanced(entry); return entry

validate_journal=assert_balanced
