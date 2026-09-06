from django.contrib import admin
from .models import StoreInventory,InventoryLedger,StockTransfer,StockTransferItem
admin.site.register(StoreInventory); admin.site.register(InventoryLedger); admin.site.register(StockTransfer); admin.site.register(StockTransferItem)
