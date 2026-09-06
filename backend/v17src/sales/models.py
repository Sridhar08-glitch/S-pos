from django.db import models
from django.conf import settings
from stores.models import Store,Register
from registers.models import RegisterSession
from customers.models import Customer
from catalog.models import Product

class InvoiceSequence(models.Model):
    store=models.OneToOneField("stores.Store",on_delete=models.PROTECT,related_name="invoice_sequence")
    prefix=models.CharField(max_length=30,default="INV")
    next_number=models.PositiveBigIntegerField(default=1)
    def next_invoice(self):
        value=self.next_number
        self.next_number=value+1
        self.save(update_fields=["next_number"])
        return f"{self.prefix}-{value:08d}"

class Sale(models.Model):
    class Status(models.TextChoices):
        COMPLETED="COMPLETED","Completed"; VOID="VOID","Void"; REFUNDED="REFUNDED","Refunded"; PARTIAL_REFUND="PARTIAL_REFUND","Partial refund"
    invoice_number=models.CharField(max_length=40,unique=True)
    store=models.ForeignKey(Store,on_delete=models.PROTECT,related_name="sales")
    register=models.ForeignKey(Register,on_delete=models.PROTECT,related_name="sales")
    register_session=models.ForeignKey(RegisterSession,on_delete=models.PROTECT,related_name="sales")
    customer=models.ForeignKey(Customer,null=True,blank=True,on_delete=models.SET_NULL)
    cashier=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    status=models.CharField(max_length=20,choices=Status.choices,default=Status.COMPLETED)
    subtotal=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    discount_amount=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    tax_amount=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    rounding_adjustment=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    total_amount=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    notes=models.TextField(blank=True)
    created_at=models.DateTimeField(auto_now_add=True)

class SaleItem(models.Model):
    sale=models.ForeignKey(Sale,related_name="items",on_delete=models.CASCADE)
    product=models.ForeignKey(Product,null=True,blank=True,on_delete=models.PROTECT)
    product_name=models.CharField(max_length=200)
    sku=models.CharField(max_length=80)
    unit_price=models.DecimalField(max_digits=12,decimal_places=2)
    quantity=models.DecimalField(max_digits=14,decimal_places=3)
    tax_rate=models.DecimalField(max_digits=6,decimal_places=4)
    line_subtotal=models.DecimalField(max_digits=12,decimal_places=2)
    line_tax=models.DecimalField(max_digits=12,decimal_places=2)
    line_total=models.DecimalField(max_digits=12,decimal_places=2)
    refunded_quantity=models.DecimalField(max_digits=14,decimal_places=3,default=0)
    unit_cost=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    cost_total=models.DecimalField(max_digits=14,decimal_places=2,default=0)

class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING="PENDING","Pending"; AUTHORIZED="AUTHORIZED","Authorized"; CAPTURED="CAPTURED","Captured"; FAILED="FAILED","Failed"; REFUNDED="REFUNDED","Refunded"; PARTIAL_REFUND="PARTIAL_REFUND","Partial refund"
    class Method(models.TextChoices):
        CASH="CASH","Cash"; CARD="CARD","Card"; QR="QR","QR Pay"; BANK="BANK","Bank Transfer"; WALLET="WALLET","Wallet"
    sale=models.ForeignKey(Sale,related_name="payments",on_delete=models.PROTECT)
    method=models.CharField(max_length=20,choices=Method.choices)
    status=models.CharField(max_length=20,choices=Status.choices,default="CAPTURED")
    provider=models.CharField(max_length=80,blank=True)
    idempotency_key=models.CharField(max_length=120,null=True,blank=True,unique=True)
    amount=models.DecimalField(max_digits=12,decimal_places=2)
    reference=models.CharField(max_length=120,blank=True)
    paid_at=models.DateTimeField(auto_now_add=True)

class Refund(models.Model):
    sale=models.ForeignKey(Sale,related_name="refunds",on_delete=models.PROTECT)
    refund_number=models.CharField(max_length=40,unique=True)
    cashier=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    amount=models.DecimalField(max_digits=12,decimal_places=2)
    reason=models.CharField(max_length=250)
    created_at=models.DateTimeField(auto_now_add=True)

class RefundItem(models.Model):
    refund=models.ForeignKey(Refund,related_name="items",on_delete=models.CASCADE)
    sale_item=models.ForeignKey(SaleItem,on_delete=models.PROTECT)
    quantity=models.DecimalField(max_digits=14,decimal_places=3)
    amount=models.DecimalField(max_digits=12,decimal_places=2)
