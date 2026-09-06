from inventory.traceability_api import SerialViewSet,BatchViewSet
from inventory.stockcount_api import StockCountViewSet
from rest_framework.routers import DefaultRouter
from .views import StoreInventoryViewSet,InventoryLedgerViewSet,StockTransferViewSet
router=DefaultRouter()
router.register("stock-counts",StockCountViewSet)
router.register("stock",StoreInventoryViewSet)
# Backward-compatible resource name used by older frontend builds.
router.register("inventory",StoreInventoryViewSet, basename="inventory")
router.register("ledger",InventoryLedgerViewSet)
router.register("transfers",StockTransferViewSet)
router.register("serials",SerialViewSet); router.register("batches",BatchViewSet)
urlpatterns=router.urls
