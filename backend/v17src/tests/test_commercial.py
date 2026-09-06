"""
S POS — commercial regression suite: the money paths and security guarantees that must
never break. Run: python manage.py test tests.test_commercial
Developed by Sridhar Mahalingam.
"""
import uuid
from decimal import Decimal
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from stores.models import Company, Store, Register
from registers.models import RegisterSession
from catalog.models import Category, Product
from catalog.variants import ProductVariant, ModifierGroup, Modifier
from inventory.models import StoreInventory


def _auth(client, user):
    client.credentials(HTTP_AUTHORIZATION="Bearer " + str(RefreshToken.for_user(user).access_token))


class Base(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Test Co", currency="USD")
        self.store = Store.objects.create(company=self.company, name="Main", code="MAIN")
        self.register = Register.objects.create(store=self.store, name="Reg 1", code="R1")
        self.admin = User.objects.create_user("owner", password="ownerpass1", role="ADMIN",
                                               store=self.store, is_staff=True, is_superuser=True)
        self.cashier = User.objects.create_user("till", password="tillpass1", role="CASHIER", store=self.store)
        cat = Category.objects.create(name="General")
        self.p = Product.objects.create(name="Widget", sku="W1", category=cat, selling_price=Decimal("10.00"),
                                        purchase_price=Decimal("6.00"), tax_rate=Decimal("0.05"),
                                        stock_quantity=Decimal("100"), minimum_stock=Decimal("5"))
        StoreInventory.objects.create(store=self.store, product=self.p, quantity=Decimal("100"), minimum_stock=Decimal("5"))
        self.session = RegisterSession.objects.create(register=self.register, cashier=self.cashier,
                                                      store=self.store, status="OPEN", opening_cash=0)

    def checkout(self, items, payments, **extra):
        body = {"session_id": self.session.id, "items": items, "payments": payments}
        body.update(extra)
        return self.client.post("/api/v1/checkout/executions/execute/", body, format="json",
                                HTTP_IDEMPOTENCY_KEY=uuid.uuid4().hex)


class SecurityTests(Base):
    def test_registration_requires_admin(self):
        # anonymous cannot self-register an admin (privilege-escalation fix)
        r = self.client.post("/api/v1/auth/register/", {"username": "x", "password": "password123", "role": "ADMIN"}, format="json")
        self.assertIn(r.status_code, (401, 403))

    def test_gift_card_balance_is_server_enforced(self):
        _auth(self.client, self.admin)
        r = self.client.post("/api/v1/customers/gift-cards/",
                             {"code": "GC1", "original_amount": "50", "balance": "99999"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Decimal(r.data["balance"]), Decimal("50.00"))  # client 99999 ignored

    def test_bootstrap_only_once(self):
        # setup already has users -> POST bootstrap forbidden
        r = self.client.post("/api/v1/auth/bootstrap/", {"username": "z", "password": "password123"}, format="json")
        self.assertEqual(r.status_code, 403)


class MoneyPathTests(Base):
    def test_checkout_recomputes_and_enforces_paid_equals_total(self):
        _auth(self.client, self.cashier)
        # 2 x 10.00 = 20.00 subtotal, +5% tax = 21.00 total
        r = self.checkout([{"product_id": self.p.id, "quantity": 2}],
                          [{"method": "CASH", "amount": "21.00", "status": "CAPTURED"}])
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["status"], "COMMITTED")
        # inventory decremented atomically
        self.assertEqual(StoreInventory.objects.get(store=self.store, product=self.p).quantity, Decimal("98"))

    def test_underpayment_rejected(self):
        _auth(self.client, self.cashier)
        r = self.checkout([{"product_id": self.p.id, "quantity": 1}],
                          [{"method": "CASH", "amount": "5.00", "status": "CAPTURED"}])
        self.assertEqual(r.status_code, 400)

    def test_client_price_is_ignored_without_manager(self):
        # a cashier cannot force a price override without manager authority
        _auth(self.client, self.cashier)
        r = self.checkout([{"product_id": self.p.id, "quantity": 1, "unit_price_override": "1.00"}],
                          [{"method": "CASH", "amount": "1.05", "status": "CAPTURED"}])
        self.assertEqual(r.status_code, 400)  # manager PIN required

    def test_cashier_discount_cap(self):
        _auth(self.client, self.cashier)
        r = self.checkout([{"product_id": self.p.id, "quantity": 1}],
                          [{"method": "CASH", "amount": "0.05", "status": "CAPTURED"}],
                          discount_percent="90")
        self.assertEqual(r.status_code, 400)  # >20% needs manager

    def test_variant_and_modifier_pricing(self):
        variant = ProductVariant.objects.create(product=self.p, name="Large", sku="W1-L", price=Decimal("15.00"))
        grp = ModifierGroup.objects.create(name="Add-ons", max_select=2)
        mod = Modifier.objects.create(group=grp, name="Extra", price_delta=Decimal("2.00"))
        _auth(self.client, self.cashier)  # variant/modifier pricing is not a manager override
        # 15.00 + 2.00 = 17.00, +5% tax = 17.85
        r = self.checkout([{"product_id": self.p.id, "variant_id": variant.id, "modifiers": [mod.id], "quantity": 1}],
                          [{"method": "CARD", "amount": "17.85", "status": "CAPTURED"}])
        self.assertEqual(r.status_code, 200, r.data)
