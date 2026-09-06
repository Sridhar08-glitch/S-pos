from django.contrib.auth.hashers import check_password,make_password
from rest_framework import generics,permissions,status as http_status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import UserSerializer,RegisterSerializer
from accounts.permissions import AdminManager
class RegisterView(generics.CreateAPIView):
    # Admin-gated: only ADMIN/MANAGER may create staff accounts (no public self-registration / privilege escalation).
    queryset=User.objects.all(); serializer_class=RegisterSerializer; permission_classes=[AdminManager]
class MeView(APIView):
    def get(self,request): return Response(UserSerializer(request.user).data)
class LogoutView(APIView):
    def post(self,request):
        try:
            token=RefreshToken(request.data.get("refresh"))
            token.blacklist()
        except Exception:
            return Response({"detail":"Invalid or missing refresh token."},status=http_status.HTTP_400_BAD_REQUEST)
        return Response(status=http_status.HTTP_205_RESET_CONTENT)

class BootstrapView(APIView):
    """First-run setup: create the owner account + store when no users exist yet."""
    permission_classes=[permissions.AllowAny]
    def get(self,request):
        return Response({"needs_setup": not User.objects.filter(is_active=True).exists()})
    def post(self,request):
        if User.objects.exists():
            return Response({"detail":"Setup has already been completed."},status=http_status.HTTP_403_FORBIDDEN)
        from stores.models import Company,Store,Register
        d=request.data
        username=(d.get("username") or "").strip()
        password=d.get("password") or ""
        if not username or len(password)<8:
            return Response({"detail":"A username and a password of at least 8 characters are required."},status=http_status.HTTP_400_BAD_REQUEST)
        company=Company.objects.create(name=(d.get("company") or "My Store").strip() or "My Store",currency=(d.get("currency") or "USD").upper())
        store=Store.objects.create(company=company,name=(d.get("store_name") or "Main Store").strip() or "Main Store",code="MAIN")
        Register.objects.get_or_create(store=store,code="REG-01",defaults={"name":"Register 1"})
        owner=User.objects.create_user(username=username,password=password,role="ADMIN",store=store,is_staff=True,is_superuser=True,email=(d.get("email") or ""))
        if d.get("demo"):
            self._seed_sample(store)
        r=RefreshToken.for_user(owner)
        return Response({"access":str(r.access_token),"refresh":str(r)},status=http_status.HTTP_201_CREATED)

    @staticmethod
    def _seed_sample(store):
        from decimal import Decimal
        from catalog.models import Category,Product
        from inventory.models import StoreInventory
        cats={n:Category.objects.get_or_create(name=n)[0] for n in ["Beverages","Snacks","Grocery","Bakery","Dairy"]}
        items=[("Coffee 250g","SP-1001","Beverages",18.50,40),("Chocolate Bar","SP-1002","Snacks",5,55),
               ("Bottled Water 1.5L","SP-1003","Beverages",2,120),("Basmati Rice 5kg","SP-1004","Grocery",32,20),
               ("Cooking Oil 1L","SP-1005","Grocery",21.50,25),("Fresh Milk 1L","SP-1006","Dairy",7.25,30),
               ("White Bread","SP-1007","Bakery",4,18),("Potato Chips","SP-1008","Snacks",6.50,35)]
        for name,sku,cat,price,stock in items:
            p,_=Product.objects.get_or_create(sku=sku,defaults={"name":name,"barcode":sku,"category":cats[cat],
                "selling_price":Decimal(str(price)),"purchase_price":Decimal(str(round(price*0.7,2))),
                "stock_quantity":Decimal(str(stock)),"minimum_stock":Decimal("5")})
            StoreInventory.objects.get_or_create(store=store,product=p,defaults={"quantity":Decimal(str(stock)),"minimum_stock":Decimal("5")})
class SetPINView(APIView):
    permission_classes=[AdminManager]
    def post(self,request,user_id):
        u=User.objects.get(id=user_id); pin=str(request.data.get("pin",""))
        if not pin.isdigit() or len(pin) not in (4,5,6): return Response({"detail":"PIN must be 4-6 digits"},status=400)
        u.pos_pin_hash=make_password(pin); u.save(update_fields=["pos_pin_hash"])
        return Response({"detail":"PIN set"})
class VerifyPINView(APIView):
    permission_classes=[permissions.AllowAny]
    def post(self,request):
        u=User.objects.filter(username=request.data.get("username"),is_active=True).first()
        if not u or not u.pos_pin_hash or not check_password(str(request.data.get("pin","")),u.pos_pin_hash):
            return Response({"detail":"Invalid PIN"},status=401)
        return Response(UserSerializer(u).data)
