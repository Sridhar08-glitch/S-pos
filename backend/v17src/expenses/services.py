from django.db import transaction
from django.utils import timezone
from .models import Expense
@transaction.atomic
def approve_expense(*,expense,user):
    if expense.status!="DRAFT": raise ValueError("Only draft expenses can be approved")
    expense.status="APPROVED"; expense.approved_by=user; expense.save(update_fields=["status","approved_by"]); return expense
@transaction.atomic
def pay_expense(*,expense,user):
    if expense.status!="APPROVED": raise ValueError("Expense must be approved before payment")
    expense.status="PAID"; expense.paid_at=timezone.now(); expense.save(update_fields=["status","paid_at"]); return expense
@transaction.atomic
def void_expense(*,expense,user):
    if expense.status=="PAID": raise ValueError("Paid expenses cannot be voided")
    expense.status="VOID"; expense.save(update_fields=["status"]); return expense
