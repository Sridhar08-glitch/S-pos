from .barcode_api import ProductBarcodeViewSet
from catalog.bundle_api import BundleViewSet,BundleItemViewSet
from catalog.variants_api import ProductVariantViewSet,ModifierGroupViewSet,ModifierViewSet,ProductModifierGroupViewSet
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet,ProductViewSet
router=DefaultRouter(); router.register("categories",CategoryViewSet); router.register("products",ProductViewSet); router.register("barcodes",ProductBarcodeViewSet)
router.register("bundles",BundleViewSet); router.register("bundle-items",BundleItemViewSet)
router.register("variants",ProductVariantViewSet); router.register("modifier-groups",ModifierGroupViewSet); router.register("modifiers",ModifierViewSet); router.register("product-modifiers",ProductModifierGroupViewSet)
urlpatterns=router.urls
