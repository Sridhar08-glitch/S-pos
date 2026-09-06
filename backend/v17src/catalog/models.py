from django.db import models
from django.core.validators import MinValueValidator

class Category(models.Model):
    name=models.CharField(max_length=120,unique=True)
    active=models.BooleanField(default=True)
    def __str__(self): return self.name

class Product(models.Model):
    name=models.CharField(max_length=200)
    sku=models.CharField(max_length=80,unique=True)
    barcode=models.CharField(max_length=100,unique=True,null=True,blank=True,db_index=True)
    qr_code=models.CharField(max_length=255,unique=True,null=True,blank=True,db_index=True)
    category=models.ForeignKey(Category,null=True,blank=True,on_delete=models.SET_NULL,related_name="products")
    purchase_price=models.DecimalField(max_digits=12,decimal_places=2,default=0,validators=[MinValueValidator(0)])
    selling_price=models.DecimalField(max_digits=12,decimal_places=2,validators=[MinValueValidator(0)])
    tax_rate=models.DecimalField(max_digits=6,decimal_places=4,default=.05)
    stock_quantity=models.DecimalField(max_digits=14,decimal_places=3,default=0)
    minimum_stock=models.DecimalField(max_digits=14,decimal_places=3,default=0)
    image=models.ImageField(upload_to="products/",blank=True,null=True)
    active=models.BooleanField(default=True)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    @property
    def stock_status(self):
        if self.stock_quantity<=0:return "OUT_OF_STOCK"
        if self.stock_quantity<=self.minimum_stock:return "LOW_STOCK"
        return "IN_STOCK"

class ProductBarcode(models.Model):
    product=models.ForeignKey(Product,on_delete=models.CASCADE,related_name="barcodes")
    barcode=models.CharField(max_length=100,unique=True)
    barcode_type=models.CharField(max_length=30,default="EAN")
    is_primary=models.BooleanField(default=False)

# Register bundle models for Django migrations/app registry.
from .bundles import ProductBundle, ProductBundleItem  # noqa: E402,F401
# Register variant/modifier models for Django migrations/app registry.
from .variants import ProductVariant, ModifierGroup, Modifier, ProductModifierGroup  # noqa: E402,F401
