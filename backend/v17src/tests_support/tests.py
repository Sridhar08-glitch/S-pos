from django.test import TestCase
from django.contrib.auth import get_user_model
from stores.models import Company,Store
from catalog.models import Product
from inventory.models import StoreInventory
from inventory.services import adjust_stock

class InventoryTests(TestCase):
    def setUp(self):
        self.user=get_user_model().objects.create_user(username="cashier",password="pass",role="CASHIER")
        company=Company.objects.create(name="Test")
        self.store=Store.objects.create(company=company,name="Main",code="MAIN")
        self.product=Product.objects.create(name="Milk",sku="M1",barcode="111",selling_price=5)
    def test_store_stock_isolated(self):
        adjust_stock(store=self.store,product=self.product,delta=10,user=self.user,transaction_type="OPENING")
        self.assertEqual(StoreInventory.objects.get(store=self.store,product=self.product).quantity,10)
        self.assertEqual(self.product.stock_quantity,0)
    def test_negative_stock_rejected(self):
        with self.assertRaises(ValueError):
            adjust_stock(store=self.store,product=self.product,delta=-1,user=self.user,transaction_type="SALE")
