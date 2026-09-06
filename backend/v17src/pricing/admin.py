from django.contrib import admin
from .models import PriceList,PriceListItem,CustomerPriceList,Unit
admin.site.register(PriceList)
admin.site.register(PriceListItem)
admin.site.register(CustomerPriceList)
admin.site.register(Unit)
