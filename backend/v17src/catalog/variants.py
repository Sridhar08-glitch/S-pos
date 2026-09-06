from django.db import models
from .models import Product


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    name = models.CharField(max_length=120)          # e.g. "Large", "Red / XL"
    sku = models.CharField(max_length=80, blank=True)
    barcode = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    active = models.BooleanField(default=True)
    def __str__(self): return f"{self.product.name} — {self.name}"


class ModifierGroup(models.Model):
    name = models.CharField(max_length=120)          # e.g. "Add-ons", "Size"
    min_select = models.PositiveIntegerField(default=0)
    max_select = models.PositiveIntegerField(default=1)
    active = models.BooleanField(default=True)
    def __str__(self): return self.name


class Modifier(models.Model):
    group = models.ForeignKey(ModifierGroup, on_delete=models.CASCADE, related_name="modifiers")
    name = models.CharField(max_length=120)          # e.g. "Extra shot"
    price_delta = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    active = models.BooleanField(default=True)
    def __str__(self): return self.name


class ProductModifierGroup(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="modifier_links")
    group = models.ForeignKey(ModifierGroup, on_delete=models.CASCADE, related_name="product_links")
    class Meta:
        constraints = [models.UniqueConstraint(fields=["product", "group"], name="uniq_product_modifier_group")]
