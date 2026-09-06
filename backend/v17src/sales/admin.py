from django.contrib import admin
from .models import Sale,SaleItem,Payment,Refund,RefundItem
admin.site.register(Sale); admin.site.register(SaleItem); admin.site.register(Payment); admin.site.register(Refund); admin.site.register(RefundItem)
