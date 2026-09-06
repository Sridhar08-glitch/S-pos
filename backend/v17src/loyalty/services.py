from django.db import transaction
from .models import LoyaltyAccount,LoyaltyTransaction
@transaction.atomic
def adjust_points(*,customer,points,user,transaction_type="ADJUST",reference=""):
    account,_=LoyaltyAccount.objects.select_for_update().get_or_create(customer=customer)
    points=int(points)
    if points<=0: raise ValueError("Points must be positive")
    if transaction_type=="REDEEM" and account.points<points: raise ValueError("Insufficient loyalty points")
    if transaction_type=="REDEEM": account.points-=points
    else: account.points+=points; account.lifetime_points=max(account.lifetime_points,account.points)
    if account.points<0: raise ValueError("Loyalty points cannot be negative")
    account.save(update_fields=["points","lifetime_points","updated_at"]); LoyaltyTransaction.objects.create(account=account,transaction_type=transaction_type,points=(-points if transaction_type=="REDEEM" else points),reference=reference,created_by=user); return account
