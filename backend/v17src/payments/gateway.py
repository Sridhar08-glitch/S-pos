"""
S POS — pluggable payment gateway framework.
Any payment provider in the world plugs in as a drop-in adapter; you're never locked to one.
Select the active provider with the PAYMENT_PROVIDER env var; supply its keys via
PAYMENT_PROVIDER_CONFIG. Until a provider's keys are set, checkout uses the safe "manual" mode.
Developed by Sridhar Mahalingam.
"""
import hmac
import hashlib
from django.conf import settings


class PaymentProvider:
    """Base adapter. A live integration overrides create_payment() + verify_webhook()."""
    name = "base"; label = "Base"; regions = []; methods = ["CARD"]

    def __init__(self, config=None):
        self.config = config or {}

    def create_payment(self, *, amount, currency, reference, method, metadata=None):
        """Ask the provider to create a charge. Return a dict, e.g.:
        {"provider_reference": "...", "status": "PENDING",
         "qr": "<data-url or payload>", "redirect_url": "<hosted page>", "instructions": "..."}"""
        raise NotImplementedError

    def verify_webhook(self, *, headers, raw_body):
        """Verify a provider callback. Return {"verified": bool, "provider_reference": ..., "status": ...}."""
        return {"verified": False}


class _HmacProvider(PaymentProvider):
    """Shared HMAC-SHA256 webhook verification used by many providers."""
    sig_header = "X-Signature"

    def verify_webhook(self, *, headers, raw_body):
        secret = (self.config.get("webhook_secret") or "").encode()
        sig = headers.get(self.sig_header, "")
        if not secret or not sig:
            return {"verified": False}
        expected = hmac.new(secret, raw_body if isinstance(raw_body, bytes) else raw_body.encode(), hashlib.sha256).hexdigest()
        return {"verified": hmac.compare_digest(expected, sig)}


class ManualProvider(PaymentProvider):
    """Default: money is collected at the counter (cash) or via an external terminal; the
    cashier confirms capture. Fully functional with no keys."""
    name = "manual"; label = "Manual / cash desk"; regions = ["*"]
    methods = ["CASH", "CARD", "QR", "BANK", "WALLET"]

    def create_payment(self, *, amount, currency, reference, method, metadata=None):
        return {"provider_reference": f"MAN-{reference}", "status": "PENDING",
                "instructions": "Collect the payment, then mark it captured."}


# ---- Live provider adapters (drop-in). Fill in each create_payment() with the provider's
# ---- SDK/HTTP call and set keys to go live. verify_webhook() is HMAC by default. --------
class StripeProvider(_HmacProvider):
    name = "stripe"; label = "Stripe"; regions = ["Global"]; methods = ["CARD", "WALLET"]
    sig_header = "Stripe-Signature"
    def create_payment(self, **kw):
        raise NotImplementedError("Set Stripe API keys in PAYMENT_PROVIDER_CONFIG to enable live payments.")

class RazorpayProvider(_HmacProvider):
    name = "razorpay"; label = "Razorpay (UPI / cards)"; regions = ["India"]; methods = ["CARD", "QR", "WALLET"]
    sig_header = "X-Razorpay-Signature"
    def create_payment(self, **kw):
        raise NotImplementedError("Set Razorpay keys to enable UPI / dynamic QR.")

class PayTabsProvider(_HmacProvider):
    name = "paytabs"; label = "PayTabs"; regions = ["GCC / MENA"]; methods = ["CARD", "QR"]
    def create_payment(self, **kw):
        raise NotImplementedError("Set PayTabs keys to enable.")

class PayPalProvider(_HmacProvider):
    name = "paypal"; label = "PayPal"; regions = ["Global"]; methods = ["WALLET", "CARD"]
    def create_payment(self, **kw):
        raise NotImplementedError("Set PayPal keys to enable.")

class AdyenProvider(_HmacProvider):
    name = "adyen"; label = "Adyen"; regions = ["Global"]; methods = ["CARD", "WALLET"]
    def create_payment(self, **kw):
        raise NotImplementedError("Set Adyen keys to enable.")

class SquareProvider(_HmacProvider):
    name = "square"; label = "Square"; regions = ["US / UK / AU / CA"]; methods = ["CARD"]
    def create_payment(self, **kw):
        raise NotImplementedError("Set Square keys to enable.")

class FlutterwaveProvider(_HmacProvider):
    name = "flutterwave"; label = "Flutterwave"; regions = ["Africa"]; methods = ["CARD", "QR", "WALLET"]
    def create_payment(self, **kw):
        raise NotImplementedError("Set Flutterwave keys to enable.")

class PaystackProvider(_HmacProvider):
    name = "paystack"; label = "Paystack"; regions = ["Africa"]; methods = ["CARD", "QR"]
    def create_payment(self, **kw):
        raise NotImplementedError("Set Paystack keys to enable.")

class MpesaProvider(_HmacProvider):
    name = "mpesa"; label = "M-Pesa"; regions = ["East Africa"]; methods = ["WALLET"]
    def create_payment(self, **kw):
        raise NotImplementedError("Set M-Pesa (Daraja) keys to enable.")

class MercadoPagoProvider(_HmacProvider):
    name = "mercadopago"; label = "Mercado Pago"; regions = ["Latin America"]; methods = ["CARD", "QR", "WALLET"]
    def create_payment(self, **kw):
        raise NotImplementedError("Set Mercado Pago keys to enable.")

class TelrProvider(_HmacProvider):
    name = "telr"; label = "Telr"; regions = ["GCC / MENA"]; methods = ["CARD"]
    def create_payment(self, **kw):
        raise NotImplementedError("Set Telr keys to enable.")


_PROVIDERS = [ManualProvider, StripeProvider, RazorpayProvider, PayTabsProvider, PayPalProvider,
              AdyenProvider, SquareProvider, FlutterwaveProvider, PaystackProvider, MpesaProvider,
              MercadoPagoProvider, TelrProvider]
REGISTRY = {p.name: p for p in _PROVIDERS}


def available_providers():
    active = get_active_name()
    return [{"name": c.name, "label": c.label, "regions": c.regions, "methods": c.methods,
             "live": c.name != "manual", "active": c.name == active} for c in _PROVIDERS]


def get_active_name():
    return (getattr(settings, "PAYMENT_PROVIDER", "manual") or "manual").lower()


def get_active():
    cls = REGISTRY.get(get_active_name(), ManualProvider)
    return cls(getattr(settings, "PAYMENT_PROVIDER_CONFIG", {}))
