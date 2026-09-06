# S POS — Live Payments Integration Guide

**Developed by Sridhar Mahalingam.** All-region, multi-currency. This explains how to turn
the card / QR / UPI tenders from *recorded* into *real money to your account*.

## How it works (the standard POS flow)
```
Cashier picks Card/QR  ->  S POS asks the provider to create a payment for X
                       ->  provider returns a dynamic QR / card prompt (money goes to YOUR merchant account)
Customer pays          ->  provider sends a signed webhook to S POS
S POS verifies signature ->  marks the sale paid  ->  prints receipt
```
S POS only marks a sale "paid" **after the provider confirms the money landed** — never on the
cashier's word.

## Pluggable framework — any provider, worldwide
S POS ships a **provider-agnostic gateway** (`payments/gateway.py`): every provider is a drop-in
adapter, so you're never locked to one. Twelve are pre-registered out of the box:

`manual` (default) · `stripe` · `razorpay` · `paytabs` · `paypal` · `adyen` · `square` ·
`flutterwave` · `paystack` · `mpesa` · `mercadopago` · `telr`

- List them live: `GET /api/v1/payments/providers/` (shows each provider's regions, methods, and which is active).
- **Activate one** by setting env vars:
  ```
  PAYMENT_PROVIDER=razorpay
  PAYMENT_API_KEY=...
  PAYMENT_API_SECRET=...
  PAYMENT_WEBHOOK_SECRET=...
  ```
- **Add a new provider** = one small adapter class (implement `create_payment()` + `verify_webhook()`)
  registered in `payments/gateway.py`. No other code changes.

Until a provider's keys are set, S POS uses the safe **`manual`** mode (collect at the counter,
cashier confirms) so the full sale/inventory/accounting flow always works.

## The integration seam (already built)
1. **PaymentIntent** model + `/payments/intents/create-intent/` — "ask the PSP to create a payment".
2. **Signed webhook** `POST /api/v1/sales/payments/webhook/` — verifies an HMAC-SHA256 signature
   over the raw body using `PAYMENT_WEBHOOK_SECRET`, then marks the `Payment` captured. Unsigned /
   invalid requests are rejected (401). This is where the provider's "payment succeeded" callback lands.

You only need to add a thin **provider adapter** (create-intent → return QR/redirect) and point the
provider's webhook at the endpoint above.

## Choosing a provider (by region)
| Region / rail | Providers |
|---|---|
| UPI / India (₹) | Razorpay, Cashfree, PhonePe, Paytm |
| GCC / QAR, AED, SAR | PayTabs, Telr, Dibsy, QPay |
| Global cards | Stripe, Adyen, Checkout.com |

## What you provide
- A **merchant account** with the provider.
- **API keys** (test + live) and the **webhook signing secret** → set `PAYMENT_WEBHOOK_SECRET`.
- The provider's **webhook URL** = `https://your-domain/api/v1/sales/payments/webhook/`.

## Go-live steps
1. Implement the provider adapter (create-intent) — ~1 file per provider.
2. Configure keys + `PAYMENT_WEBHOOK_SECRET`, register the webhook URL with the provider.
3. Test end-to-end in the provider's **sandbox** (real QR, no real money).
4. Switch to live keys.

> Until a provider is connected, card/QR/UPI are safe **simulated** tenders so the full
> sale/inventory/accounting flow works; cash is fully real.
