import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE","config.settings")
import django
django.setup()

from accounts.models import User
from stores.models import Company,Store,Register
from catalog.models import Category,Product

company,_=Company.objects.get_or_create(name="S POS Demo",defaults={"currency":"QAR"})
store,_=Store.objects.get_or_create(company=company,code="MAIN",defaults={"name":"Main Branch"})
register,_=Register.objects.get_or_create(store=store,code="REG-01",defaults={"name":"Register 1"})

admin,created=User.objects.get_or_create(username="admin",defaults={"role":"ADMIN","store":store,"email":"admin@example.com","is_staff":True,"is_superuser":True})
if created:
    admin.set_password("admin123"); admin.save()

cats={n:Category.objects.get_or_create(name=n)[0] for n in ["Beverages","Snacks","Bakery","Dairy","Grocery","Household"]}
items=[
("Premium Coffee 250g","890100001001","Beverages",18.50,42),
("Mineral Water 1.5L","890100001002","Beverages",2,126),
("Classic Cola 330ml","890100001003","Beverages",3.50,78),
("Chocolate Bar","890100001004","Snacks",5,55),
("Potato Chips","890100001005","Snacks",6.50,31),
("White Bread","890100001006","Bakery",4,19),
("Fresh Milk 1L","890100001007","Dairy",7.25,24),
("Orange Juice","890100001008","Beverages",9,36),
("Greek Yogurt","890100001009","Dairy",8.75,14),
("Basmati Rice 5kg","890100001010","Grocery",32,9),
("Cooking Oil 1.5L","890100001011","Grocery",21.50,17),
("Tissue Box","890100001012","Household",6,48)]
for name,barcode,cat,price,stock in items:
    Product.objects.update_or_create(sku=barcode,defaults={"name":name,"barcode":barcode,"category":cats[cat],
        "selling_price":price,"purchase_price":round(price*.7,2),"stock_quantity":stock,"minimum_stock":5})
print("Demo ready: admin / admin123")
print("Register:",register.id,"Store:",store.id)
from registers.models import RegisterSession
from inventory.models import StoreInventory
session,_=RegisterSession.objects.get_or_create(register=register,cashier=admin,status="OPEN",defaults={"store":store,"opening_cash":0})
for p in Product.objects.all():
    StoreInventory.objects.update_or_create(store=store,product=p,defaults={"quantity":p.stock_quantity,"minimum_stock":p.minimum_stock})
print("Open register session:",session.id)
