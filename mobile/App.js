/**
 * S POS — Mobile (React Native / Expo).
 * Clean iOS-style mobile POS: Dashboard · Products · Sales · More,
 * with cart → payment → receipt flow. Developed by Sridhar Mahalingam.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TextInput, Pressable, FlatList, ScrollView, ActivityIndicator,
  Alert, Share, StyleSheet, Platform, StatusBar as RNStatusBar, Animated, Easing,
  Dimensions, RefreshControl, PanResponder, useWindowDimensions, Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import { Linking } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";

const { width: SCREEN_W } = Dimensions.get("window");
/* Dev-only: open the web build with ?phone to preview the phone layout in a 390px frame. */
const WEBSIM = Platform.OS === "web" && typeof window !== "undefined" && /phone/.test(window.location?.search || "");
function useAppWidth() {
  const { width } = useWindowDimensions();
  return WEBSIM ? 390 : width;
}

/* ---------------- theme (clean iOS light) ---------------- */
const C = {
  bg: "#f4f6f9", card: "#ffffff", ink: "#0f172a", sub: "#64748b", line: "#e8ebf1",
  blue: "#2f6bff", blueBg: "#eaf1ff", green: "#16a34a", greenBg: "#e9f8ef",
  orange: "#ea950b", orangeBg: "#fff4e2", pink: "#ec4899", pinkBg: "#ffeaf2",
  red: "#ef4444", redBg: "#feecec",
};
const AVA = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#14b8a6", "#f97316"];
const avaColor = (n) => AVA[Math.abs([...String(n || "x")].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % AVA.length];
const initials = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
/* Product imagery — same rules as the website: use the uploaded product image
   when present, else a stable keyword-matched stock photo (locked per product). */
/* Curated, hand-verified stock photos (Pexels CDN) keyed by product keyword —
   crisp and correct, unlike random keyword-search images. */
const PEXELS = [["cappuccino",312418],["latte",312418],["americano",312418],["coffee",1695052],["basmati",4110251],["rice",4110251],["chocolate",918327],["cola",4113670],["soda",4113670],["pepsi",4113670],["oil",1022385],["yogurt",128865],["milk",236010],["water",1000084],["juice",96974],["chips",568805],["crisps",568805],["croissant",1775043],["bread",1586947],["bun",209206],["bakery",209206],["cake",209206],["muffin",209206],["sugar",141815],["tea",230477],["egg",1556707],["soap",545014],["tissue",4239013],["detergent",4239013],["shampoo",4239013],["chicken",6941026],["nugget",6941026],["honey",8805026],["watermelon",5946081],["fruit",1435735],["apple",1435735],["orange",1435735],["banana",1435735],["tomato",1435904],["vegetable",1435904],["onion",1435904],["potato",1435904]];
const pexelsUrl = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400&h=280&fit=crop`;
const productImage = (p) => {
  if (p?.image) {
    const im = String(p.image);
    if (/^(https?|file|content|ph|data):/.test(im)) return im;
    if (im.startsWith("/") && !isLocal()) return BASE.replace(/\/api\/v1$/, "") + im;
  }
  const n = String(p?.name || "").toLowerCase();
  const hit = PEXELS.find(([k]) => n.includes(k));
  return pexelsUrl(hit ? hit[1] : 1435904);
};
function ProductArt({ item, style }) {
  const [fail, setFail] = useState(false);
  if (!fail) return (
    <Image source={{ uri: productImage(item) }} onError={() => setFail(true)}
      style={[{ backgroundColor: avaColor(item?.name) + "18" }, style]} resizeMode="cover" />
  );
  return (
    <View style={[{ backgroundColor: avaColor(item?.name) + "18", alignItems: "center", justifyContent: "center" }, style]}>
      <Text style={{ fontWeight: "900", color: avaColor(item?.name), fontSize: 14 }}>{initials(item?.name)}</Text>
    </View>
  );
}

/* ---------------- api + math ---------------- */
let BASE = "", CUR = "USD";
const store = {
  get: async (k) => { try { return await AsyncStorage.getItem(k); } catch { return null; } },
  set: (k, v) => AsyncStorage.setItem(k, v || ""),
  del: (k) => AsyncStorage.removeItem(k),
};
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const money = (x) => Number(x || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const listOf = (d) => (Array.isArray(d) ? d : d?.results || d?.data || []);
const todayStr = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const greet = () => { const h = new Date().getHours(); return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening"; };
async function rawFetch(path, opt, token, idem) {
  const headers = { "Content-Type": "application/json", ...(opt.headers || {}) };
  if (token) headers.Authorization = "Bearer " + token;
  if (idem) headers["Idempotency-Key"] = idem;
  const r = await fetch(BASE + path, { ...opt, headers });
  const text = await r.text();
  let d = {}; try { d = text ? JSON.parse(text) : {}; } catch { d = { detail: text }; }
  return { r, d };
}
async function refreshToken() {
  const refresh = await store.get("refresh");
  if (!refresh) return null;
  try {
    const { r, d } = await rawFetch("/auth/token/refresh/", { method: "POST", body: JSON.stringify({ refresh }) }, null, null);
    if (r.ok && d.access) { await store.set("token", d.access); if (d.refresh) await store.set("refresh", d.refresh); return d.access; }
  } catch {}
  return null;
}
/* ================= LOCAL STORE ENGINE =================
   Runs the entire POS on the phone — no computer needed. Implements the same
   API contract the server exposes, backed by on-device storage. Selected by
   choosing "Run my store on this phone" (BASE === "local"). */
const isLocal = () => BASE === "local";
const ldb = {
  get: async (k, def) => { try { const v = await AsyncStorage.getItem("ldb:" + k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => AsyncStorage.setItem("ldb:" + k, JSON.stringify(v)),
};
const hashPw = (pw, salt) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + "::" + pw);
const nextId = async (k) => { const n = (await ldb.get("seq:" + k, 0)) + 1; await ldb.set("seq:" + k, n); return n; };
const DEMO = [
  ["Basmati Rice 5kg", "RICE-5KG", "8901010101011", "Grocery", 25, 32, 0.05, 40, 10],
  ["Bottled Water 1.5L", "WATER-15", "8901010101028", "Beverages", 1.2, 2, 0.05, 120, 24],
  ["Chocolate Bar", "CHOC-01", "8901010101035", "Snacks", 3, 5, 0.05, 60, 12],
  ["Coffee 250g", "COFF-250", "8901010101042", "Beverages", 12, 18.5, 0.05, 25, 5],
  ["Cooking Oil 1L", "OIL-1L", "8901010101059", "Grocery", 15, 21.5, 0.05, 30, 6],
  ["Fresh Milk 1L", "MILK-1L", "8901010101066", "Dairy", 5, 7.25, 0.05, 45, 10],
  ["Potato Chips", "CHIP-01", "8901010101073", "Snacks", 4, 6.5, 0.05, 80, 15],
  ["White Bread", "BREAD-01", "8901010101080", "Bakery", 2.5, 4, 0.05, 35, 8],
];
async function localSeed() {
  const catNames = [...new Set(DEMO.map((d) => d[3]))];
  const cats = catNames.map((n, i) => ({ id: i + 1, name: n, active: true }));
  await ldb.set("categories", cats); await ldb.set("seq:cat", cats.length);
  const prods = DEMO.map(([name, sku, barcode, cat, cost, price, tax, stock, min], i) => ({
    id: i + 1, name, sku, barcode, category: cats.find((c) => c.name === cat)?.id ?? null, category_name: cat,
    purchase_price: cost.toFixed(2), selling_price: price.toFixed(2), tax_rate: tax.toFixed(4),
    stock_quantity: String(stock), minimum_stock: String(min), image: null, active: true,
  }));
  await ldb.set("products", prods); await ldb.set("seq:prod", prods.length);
}
async function localApi(path, opt = {}) {
  const method = (opt.method || "GET").toUpperCase();
  const body = opt.body ? JSON.parse(opt.body) : {};
  const [p, qs] = path.split("?");
  const q = Object.fromEntries((qs || "").split("&").filter(Boolean).map((x) => x.split("=").map(decodeURIComponent)));
  const err = (msg, status = 400) => { throw Object.assign(new Error(msg), { status }); };
  const withCat = async (prod) => prod;
  /* ---- auth ---- */
  if (p === "/auth/bootstrap/" && method === "GET") return { needs_setup: !(await ldb.get("user", null)) };
  if (p === "/auth/bootstrap/" && method === "POST") {
    if (await ldb.get("user", null)) err("Setup has already been completed.", 403);
    if (!body.username || (body.password || "").length < 8) err("Username and a password of 8+ characters are required.");
    const salt = uid();
    await ldb.set("user", { id: 1, username: body.username, role: "ADMIN", is_active: true, salt, hash: await hashPw(body.password, salt) });
    await ldb.set("company", { id: 1, name: body.company || "My Store", currency: body.currency || "USD" });
    await ldb.set("registers", [{ id: 1, name: "Phone Register" }]);
    if (body.demo) await localSeed();
    return { access: "local", refresh: "local" };
  }
  if (p === "/auth/token/" && method === "POST") {
    const u = await ldb.get("user", null);
    if (!u || u.username !== body.username || u.hash !== (await hashPw(body.password || "", u.salt))) err("No account matches that username and password.", 401);
    return { access: "local", refresh: "local" };
  }
  if (p === "/auth/token/refresh/") return { access: "local" };
  if (p === "/auth/me/") { const u = await ldb.get("user", null); if (!u) err("Not signed in", 401); return { id: u.id, username: u.username, role: u.role }; }
  if (p === "/auth/users/") { const u = await ldb.get("user", null); return u ? [{ id: u.id, username: u.username, role: u.role, is_active: true }] : []; }
  /* ---- company ---- */
  if (p === "/stores/companies/" && method === "GET") return [await ldb.get("company", { id: 1, name: "My Store", currency: "USD" })];
  if (/^\/stores\/companies\/\d+\/$/.test(p) && method === "PATCH") {
    const co = { ...(await ldb.get("company", {})), ...body }; await ldb.set("company", co); return co;
  }
  /* ---- catalog ---- */
  if (p === "/catalog/products/" && method === "GET") return (await ldb.get("products", [])).filter((x) => x.active !== false);
  if (p === "/catalog/products/" && method === "POST") {
    const prods = await ldb.get("products", []);
    if (prods.some((x) => x.sku === body.sku)) err("A product with this SKU already exists.");
    if (body.barcode && prods.some((x) => x.barcode === body.barcode)) err("A product with this barcode already exists.");
    const cats = await ldb.get("categories", []);
    const prod = { id: await nextId("prod"), active: true, image: body.image_uri || null, ...body,
      category_name: cats.find((c) => c.id === body.category)?.name || null };
    delete prod.image_uri;
    prods.push(prod); await ldb.set("products", prods); return withCat(prod);
  }
  if (p === "/catalog/products/lookup/" && method === "GET") {
    const code = q.code || "";
    const hit = (await ldb.get("products", [])).find((x) => x.barcode === code || x.sku === code);
    if (!hit) err("No product matches this code.", 404);
    return hit;
  }
  if (p === "/catalog/categories/" && method === "GET") return await ldb.get("categories", []);
  if (p === "/catalog/categories/" && method === "POST") {
    const cats = await ldb.get("categories", []);
    if (cats.some((c) => c.name.toLowerCase() === (body.name || "").toLowerCase())) err("That category already exists.");
    const cat = { id: await nextId("cat"), name: body.name, active: true };
    cats.push(cat); await ldb.set("categories", cats); return cat;
  }
  /* ---- customers ---- */
  if (p === "/customers/customers/" && method === "GET") return await ldb.get("customers", []);
  if (p === "/customers/customers/" && method === "POST") {
    const rows = await ldb.get("customers", []);
    const c = { id: await nextId("cust"), name: body.name, phone: body.phone || "", email: body.email || "" };
    rows.push(c); await ldb.set("customers", rows); return c;
  }
  /* ---- registers ---- */
  if (p === "/registers/registers/") return await ldb.get("registers", [{ id: 1, name: "Phone Register" }]);
  if (p === "/registers/sessions/" && method === "GET") return await ldb.get("sessions", []);
  if (p === "/registers/sessions/open/" && method === "POST") {
    const sessions = await ldb.get("sessions", []);
    if (sessions.some((s) => s.status === "OPEN")) err("Register is already open");
    const s = { id: await nextId("sess"), register: body.register_id || 1, status: "OPEN", opening_cash: String(body.opening_cash || 0), opened_at: new Date().toISOString() };
    sessions.unshift(s); await ldb.set("sessions", sessions); return s;
  }
  const closeM = /^\/registers\/sessions\/(\d+)\/close\/$/.exec(p);
  if (closeM && method === "POST") {
    const sessions = await ldb.get("sessions", []);
    const s = sessions.find((x) => x.id === Number(closeM[1]));
    if (!s || s.status !== "OPEN") err("Session is already closed");
    const sales = (await ldb.get("sales", [])).filter((x) => x.register_session === s.id && x.status === "COMPLETED");
    const cash = sales.reduce((a, x) => a + x.payments.filter((y) => y.method === "CASH").reduce((b, y) => b + Number(y.amount), 0), 0);
    const expected = r2(Number(s.opening_cash) + cash);
    const actual = r2(Number(body.closing_cash || 0));
    Object.assign(s, { status: "CLOSED", closed_at: new Date().toISOString(), expected_cash: expected.toFixed(2), closing_cash: actual.toFixed(2), difference: r2(actual - expected).toFixed(2) });
    await ldb.set("sessions", sessions); return s;
  }
  /* ---- checkout ---- */
  if (p === "/checkout/executions/execute/" && method === "POST") {
    const sessions = await ldb.get("sessions", []);
    const sess = sessions.find((x) => x.id === body.session_id && x.status === "OPEN");
    if (!sess) err("Register session not found", 404);
    const prods = await ldb.get("products", []);
    let sub = 0, taxB = 0; const items = [];
    for (const row of body.items || []) {
      const prod = prods.find((x) => x.id === row.product_id);
      if (!prod) err("Product not found");
      const qty = Number(row.quantity);
      const ls = r2(Number(prod.selling_price) * qty);
      const lt = r2(ls * Number(prod.tax_rate));
      sub = r2(sub + ls); taxB = r2(taxB + lt);
      items.push({ id: items.length + 1, product: prod.id, product_name: prod.name, sku: prod.sku, quantity: String(qty), unit_price: prod.selling_price, tax_rate: prod.tax_rate, line_subtotal: ls.toFixed(2), line_tax: lt.toFixed(2), line_total: r2(ls + lt).toFixed(2), unit_cost: prod.purchase_price, cost_total: r2(Number(prod.purchase_price) * qty).toFixed(2) });
      prod.stock_quantity = String(Number(prod.stock_quantity || 0) - qty);
    }
    if (!items.length) err("Sale must contain at least one item");
    const dp = Number(body.discount_percent || 0);
    const discount = Math.min(sub, r2(sub * dp / 100));
    const tax = sub ? r2(taxB * (sub - discount) / sub) : 0;
    const total = r2(sub - discount + tax);
    const paid = (body.payments || []).reduce((a, x) => a + Number(x.amount), 0);
    if (r2(paid) !== total) err(`Payment total ${r2(paid).toFixed(2)} does not equal invoice total ${total.toFixed(2)}`);
    const inv = "INV-" + String(await nextId("inv")).padStart(8, "0");
    const sales = await ldb.get("sales", []);
    sales.unshift({ id: await nextId("sale"), invoice_number: inv, status: "COMPLETED", created_at: new Date().toISOString(),
      register_session: sess.id, customer: body.customer_id || null,
      subtotal: sub.toFixed(2), discount_amount: discount.toFixed(2), tax_amount: tax.toFixed(2), total_amount: total.toFixed(2),
      items, payments: (body.payments || []).map((x, i) => ({ id: i + 1, method: x.method, amount: Number(x.amount).toFixed(2), status: "CAPTURED" })) });
    await ldb.set("sales", sales); await ldb.set("products", prods);
    return { transaction_id: "TX-" + uid().toUpperCase(), status: "COMMITTED" };
  }
  /* ---- sales + reports ---- */
  if (p === "/sales/sales/") return await ldb.get("sales", []);
  const salesOn = async (date) => (await ldb.get("sales", [])).filter((x) => x.status === "COMPLETED" && (!date || String(x.created_at).slice(0, 10) === date));
  if (p === "/reports/dashboard/") {
    const rows = await salesOn(q.date);
    const prods = await ldb.get("products", []);
    return { date: q.date || todayStr(), sales_total: rows.reduce((a, x) => a + Number(x.total_amount), 0).toFixed(2), sales_count: rows.length,
      low_stock_count: prods.filter((x) => Number(x.stock_quantity) <= Number(x.minimum_stock)).length };
  }
  if (p === "/reports/sales/") {
    const rows = await salesOn(null);
    return { sales_count: rows.length, gross_sales: rows.reduce((a, x) => a + Number(x.total_amount), 0).toFixed(2),
      tax: rows.reduce((a, x) => a + Number(x.tax_amount), 0).toFixed(2), discounts: rows.reduce((a, x) => a + Number(x.discount_amount), 0).toFixed(2), payments: [] };
  }
  if (p === "/reports/by-hour/") {
    const rows = await salesOn(q.date); const m = {};
    for (const s of rows) { const h = new Date(s.created_at).getHours(); m[h] = m[h] || { hour: h, sales_count: 0, total: 0 }; m[h].sales_count++; m[h].total += Number(s.total_amount); }
    return Object.values(m).sort((a, b) => a.hour - b.hour);
  }
  if (p === "/reports/by-item/") {
    const rows = (await ldb.get("sales", [])).filter((x) => x.status === "COMPLETED" && (!q.start || String(x.created_at).slice(0, 10) >= q.start) && (!q.end || String(x.created_at).slice(0, 10) <= q.end));
    const m = {};
    for (const s of rows) for (const i of s.items) {
      m[i.sku] = m[i.sku] || { product_name: i.product_name, sku: i.sku, quantity: 0, revenue: 0, cost: 0 };
      m[i.sku].quantity += Number(i.quantity); m[i.sku].revenue += Number(i.line_total); m[i.sku].cost += Number(i.cost_total);
    }
    return Object.values(m).map((x) => ({ ...x, margin: r2(x.revenue - x.cost) })).sort((a, b) => b.revenue - a.revenue);
  }
  if (p === "/reports/low-stock/") {
    return (await ldb.get("products", [])).filter((x) => Number(x.stock_quantity) <= Number(x.minimum_stock))
      .map((x) => ({ product: x.name, sku: x.sku, store: "Phone", quantity: x.stock_quantity, minimum_stock: x.minimum_stock }));
  }
  return {};
}
/* Multipart upload (product photos): same auth + refresh flow, no JSON header. */
async function apiUpload(path, method, formData) {
  let token = await store.get("token");
  const doFetch = async (tok) => fetch(BASE + path, { method, body: formData, headers: { Authorization: "Bearer " + tok, "Idempotency-Key": uid() } });
  let r = await doFetch(token);
  if (r.status === 401) { const fresh = await refreshToken(); if (fresh) r = await doFetch(fresh); }
  const text = await r.text();
  let d = {}; try { d = text ? JSON.parse(text) : {}; } catch { d = { detail: text }; }
  if (!r.ok) throw new Error(d.detail || JSON.stringify(d).slice(0, 200));
  return d;
}
async function api(path, opt = {}) {
  if (isLocal()) return localApi(path, opt);
  const method = (opt.method || "GET").toUpperCase();
  // Public endpoints must not carry a (possibly stale) token — an invalid JWT
  // makes the server 401 even on AllowAny views.
  const isPublic = /^\/auth\/(bootstrap|token)\//.test(path);
  let token = isPublic ? null : await store.get("token");
  const idem = !["GET", "HEAD"].includes(method) ? uid() : null;
  let { r, d } = await rawFetch(path, opt, token, idem);
  // Access token expired mid-session: refresh once and replay the request.
  if (r.status === 401 && !isPublic && token) {
    const fresh = await refreshToken();
    if (fresh) ({ r, d } = await rawFetch(path, opt, fresh, idem));
  }
  if (!r.ok) throw Object.assign(new Error(d.detail || d.message ||
    (typeof d === "object" ? Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(" ") : "") || `Request failed (${r.status})`), { status: r.status });
  return d;
}
/* Server-exact totals: line subtotal and line tax each rounded to cents before
   summing, discount applied and tax scaled like sales.services.checkout —
   so the payment amount always equals the server's invoice total. */
function cartTotals(cart, dp = 0) {
  let sub = 0, taxB = 0;
  for (const x of cart) {
    const ls = r2(Number(x.selling_price || 0) * x.qty);
    sub = r2(sub + ls);
    taxB = r2(taxB + r2(ls * Number(x.tax_rate || 0)));
  }
  const discount = Math.min(sub, r2(sub * (Number(dp) || 0) / 100));
  const tax = sub ? r2(taxB * (sub - discount) / sub) : 0;
  return { sub, tax, discount, total: r2(sub - discount + tax) };
}

/* ---------------- animation primitives ---------------- */
function Reveal({ index = 0, children, style }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 360, delay: index * 45, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, []);
  return <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>{children}</Animated.View>;
}
const HAPTIC = { on: true };
function Press({ onPress, children, style, to = 0.96, haptic }) {
  const a = useRef(new Animated.Value(1)).current;
  const spring = (v) => Animated.spring(a, { toValue: v, useNativeDriver: true, speed: 50, bounciness: 5 }).start();
  return (
    <Animated.View style={{ transform: [{ scale: a }] }}>
      <Pressable onPressIn={() => spring(to)} onPressOut={() => spring(1)}
        onPress={() => { if (haptic && HAPTIC.on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress && onPress(); }} style={style}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
function CountUp({ value, style, prefix = "", suffix = "", int }) {
  const [n, setN] = useState(0); const prev = useRef(0);
  useEffect(() => {
    const from = prev.current, to = Number(value) || 0, start = Date.now();
    let raf; const tick = () => { const k = Math.min(1, (Date.now() - start) / 600); const e = 1 - Math.pow(1 - k, 3);
      setN(from + (to - from) * e); if (k < 1) raf = requestAnimationFrame(tick); else prev.current = to; };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value]);
  return <Text style={style}>{prefix}{int ? Math.round(n) : money(n)}{suffix}</Text>;
}
function Slide({ children }) {
  const x = useRef(new Animated.Value(SCREEN_W)).current;
  useEffect(() => { Animated.spring(x, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 3 }).start(); }, []);
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, transform: [{ translateX: x }], zIndex: 20 }]}>{children}</Animated.View>;
}
function SwipeRow({ onDelete, children }) {
  const x = useRef(new Animated.Value(0)).current;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => { if (g.dx < 0) x.setValue(g.dx); },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -90) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.timing(x, { toValue: -SCREEN_W, duration: 180, useNativeDriver: true }).start(onDelete);
      } else Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;
  return (
    <View style={{ overflow: "hidden" }}>
      <View style={st.swipeUnder}><Text style={st.swipeUnderT}>Remove</Text></View>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }] }}>{children}</Animated.View>
    </View>
  );
}
function Header({ title, onBack, right }) {
  return (
    <View style={st.pageHead}>
      {onBack ? (
        <Press onPress={onBack} haptic><View style={st.backBtn}><Feather name="chevron-left" size={22} color={C.ink} /></View></Press>
      ) : <View style={{ width: 38 }} />}
      <Text style={st.pageTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 70, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}

/* ---------------- shell ---------------- */
export default function App() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState("connect");
  const decide = useCallback(async () => {
    try {
      const bs = await api("/auth/bootstrap/");
      if (bs.needs_setup) return setScreen("setup");
      const t = await store.get("token");
      if (!t) return setScreen("login");
      try { await api("/auth/me/"); setScreen("app"); } catch { setScreen("login"); }
    } catch { setScreen("connect"); }
  }, []);
  useEffect(() => { (async () => {
    const b = await store.get("base"); const c = await store.get("cur"); if (c) CUR = c;
    const h = await store.get("haptics_off"); HAPTIC.on = h !== "1";
    if (b) { BASE = b; await decide(); } else setScreen("connect"); setReady(true);
  })(); }, [decide]);
  if (!ready) return <View style={[st.fill, { backgroundColor: C.bg }]}><Text style={st.splashT}>S POS</Text><ActivityIndicator color={C.blue} style={{ marginTop: 16 }} /></View>;
  const app = (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      {screen === "connect" && <Connect onDone={async () => { setReady(false); await decide(); setReady(true); }} />}
      {screen === "setup" && <Setup onDone={() => setScreen("app")} onBack={() => setScreen("connect")} />}
      {screen === "login" && <Login onDone={() => setScreen("app")} onBack={() => setScreen("connect")} />}
      {screen === "app" && <Main onLogout={() => setScreen("login")} />}
    </View>
  );
  if (WEBSIM) return (
    <View style={{ flex: 1, backgroundColor: "#1a1d24", alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 390, height: "96%", borderRadius: 30, overflow: "hidden", borderWidth: 6, borderColor: "#000" }}>{app}</View>
    </View>
  );
  return app;
}

/* ---------------- onboarding (clean centered card, icon fields) ---------------- */
function Shell({ title, sub, children, onBack }) {
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={st.onboardScroll} keyboardShouldPersistTaps="handled">
      {onBack && (
        <Press onPress={onBack} haptic>
          <View style={[st.backBtn, { position: "absolute", top: -34, left: 0, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }]}>
            <Feather name="chevron-left" size={22} color={C.ink} />
          </View>
        </Press>
      )}
      <Reveal style={{ alignItems: "center" }}>
        <View style={st.obLogo}><Feather name="shopping-bag" size={26} color="#fff" /></View>
        <Text style={st.brand}>S POS</Text>
      </Reveal>
      <Reveal index={1}><Text style={st.onTitle}>{title}</Text></Reveal>
      {!!sub && <Reveal index={2}><Text style={st.onSub}>{sub}</Text></Reveal>}
      <Reveal index={3} style={{ width: "100%" }}>
        <View style={st.obCard}>{children}</View>
      </Reveal>
    </ScrollView>
  );
}
function Field({ label, icon, secure, ...p }) {
  const [hide, setHide] = useState(!!secure);
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={st.fieldLbl}>{label}</Text>
      <View style={st.obField}>
        {!!icon && <Feather name={icon} size={16} color={C.sub} />}
        <TextInput style={st.obFieldIn} placeholderTextColor="#9aa4b2" secureTextEntry={hide} {...p} />
        {secure && (
          <Press onPress={() => setHide(!hide)}><Feather name={hide ? "eye" : "eye-off"} size={16} color={C.sub} /></Press>
        )}
      </View>
    </View>
  );
}
const BigBtn = ({ label, onPress, disabled }) => (
  <Press onPress={disabled ? undefined : onPress} haptic to={0.97}>
    <View style={[st.bigBtn, disabled && { opacity: 0.5 }]}><Text style={st.bigBtnT}>{label}</Text><Feather name="arrow-right" size={17} color="#fff" /></View>
  </Press>
);
function Connect({ onDone }) {
  const [url, setUrl] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { store.get("base").then((b) => b && setUrl(b)); }, []);
  async function connect() {
    let u = url.trim().replace(/\/$/, ""); if (!u) return setErr("Enter your store address");
    if (!/^https?:\/\//.test(u)) u = "http://" + u;
    if (!/\/api\/v1$/.test(u)) u = u.replace(/\/$/, "") + "/api/v1";
    setBusy(true); setErr("");
    try { BASE = u; await api("/auth/bootstrap/"); await store.set("base", u); onDone(); }
    catch { setErr("Can't reach that store. Check the address and Wi-Fi."); } finally { setBusy(false); }
  }
  async function useLocal() {
    BASE = "local"; await store.set("base", "local"); onDone();
  }
  return (
    <Shell title="Set up S POS" sub="Run everything on this phone, or connect to your shop PC or website.">
      <Press onPress={useLocal} haptic to={0.98}>
        <View style={st.localCard}>
          <View style={st.localIc}><Feather name="smartphone" size={20} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={st.lowName}>Run my store on this phone</Text>
            <Text style={[st.rcQty, { marginTop: 2 }]}>No computer needed — works fully offline</Text>
          </View>
          <Feather name="chevron-right" size={20} color={C.blue} />
        </View>
      </Press>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 14 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
        <Text style={st.rcQty}>or connect to a server</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
      </View>
      <Field label="STORE ADDRESS" icon="server" placeholder="192.168.1.20:8971 or pos.mystore.com" autoCapitalize="none" autoCorrect={false} keyboardType="url" value={url} onChangeText={setUrl} />
      {!!err && <Text style={st.errT}>{err}</Text>}
      <BigBtn label={busy ? "Connecting…" : "Connect"} onPress={connect} disabled={busy} />
      <Text style={st.credit}>© S POS · Developed by Sridhar Mahalingam</Text>
    </Shell>
  );
}
function Login({ onDone, onBack }) {
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function go() {
    setBusy(true); setErr("");
    try {
      const d = await api("/auth/token/", { method: "POST", body: JSON.stringify({ username: u, password: p }) });
      await store.set("token", d.access); if (d.refresh) await store.set("refresh", d.refresh);
      try { const co = listOf(await api("/stores/companies/"))[0]; if (co?.currency) { CUR = co.currency; store.set("cur", CUR); } } catch {}
      onDone();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <Shell title="Welcome back 👋" sub="Sign in to continue selling." onBack={onBack}>
      <Field label="USERNAME" icon="user" autoCapitalize="none" placeholder="Your username" value={u} onChangeText={setU} />
      <Field label="PASSWORD" icon="lock" secure placeholder="Your password" value={p} onChangeText={setP} />
      {!!err && <Text style={st.errT}>{err}</Text>}
      <BigBtn label={busy ? "Signing in…" : "Sign In"} onPress={go} disabled={busy} />
    </Shell>
  );
}
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "SAR", "QAR", "PKR", "NGN", "KES", "ZAR", "JPY", "AUD", "CAD"];
function Setup({ onDone, onBack }) {
  const [f, setF] = useState({ company: "", currency: "USD", username: "", password: "", demo: true });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  async function go() {
    if (f.password.length < 8) return setErr("Password must be at least 8 characters.");
    setBusy(true); setErr("");
    try {
      const d = await api("/auth/bootstrap/", { method: "POST", body: JSON.stringify(f) });
      await store.set("token", d.access); if (d.refresh) await store.set("refresh", d.refresh);
      CUR = f.currency; store.set("cur", CUR); onDone();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <Shell title="Set up your store" sub="A minute from now you'll be selling." onBack={onBack}>
      <Field label="STORE NAME" icon="shopping-bag" placeholder="e.g. Hope Store" value={f.company} onChangeText={(v) => set("company", v)} />
      <Text style={[st.fieldLbl, { marginTop: 16 }]}>CURRENCY</Text>
      <View style={st.chipsWrap}>{CURRENCIES.map((c) => (
        <Press key={c} onPress={() => set("currency", c)}><View style={[st.chip, f.currency === c && st.chipOn]}><Text style={[st.chipT, f.currency === c && { color: "#fff" }]}>{c}</Text></View></Press>
      ))}</View>
      <Field label="OWNER USERNAME" icon="user" autoCapitalize="none" value={f.username} onChangeText={(v) => set("username", v)} />
      <Field label="PASSWORD (MIN 8)" icon="lock" secure value={f.password} onChangeText={(v) => set("password", v)} />
      <Press onPress={() => set("demo", !f.demo)}><View style={st.check}><View style={[st.box, f.demo && st.boxOn]}>{f.demo && <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>✓</Text>}</View><Text style={st.checkT}>Add sample products to explore</Text></View></Press>
      {!!err && <Text style={st.errT}>{err}</Text>}
      <BigBtn label={busy ? "Setting up…" : "Create my store"} onPress={go} disabled={busy} />
    </Shell>
  );
}

/* ---------------- main app: tabs stay mounted so state survives ----------------
   Responsive: phones get a bottom tab bar; tablets (width ≥ 700) get a left
   sidebar and the Products screen gains a persistent cart panel. */
function Main({ onLogout }) {
  const width = useAppWidth();
  const isTab = width >= 700;
  const [tab, setTab] = useState("home");
  const [me, setMe] = useState(null); const [company, setCompany] = useState(null);
  const [cart, setCart] = useState([]);
  useEffect(() => {
    api("/auth/me/").then(setMe).catch(() => {});
    api("/stores/companies/").then((d) => { const co = listOf(d)[0]; if (co) { setCompany(co); if (co.currency) { CUR = co.currency; store.set("cur", CUR); } } }).catch(() => {});
  }, []);
  async function signout() { await store.del("token"); await store.del("refresh"); onLogout(); }
  const askSignout = () => Alert.alert("Sign out?", "", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: signout }]);
  const TABS = [["home", isTab ? "Dashboard" : "Home", "home"], ["products", "Products", "package"], ["sales", "Sales", "bar-chart-2"], ["more", isTab ? "Settings" : "More", "more-horizontal"]];
  const show = (k) => ({ flex: 1, display: tab === k ? "flex" : "none" });
  const [overlay, setOverlay] = useState(null); // 'orders'|'customers'|'inventory'|'categories'|'settings'
  const content = (
    <View style={{ flex: 1 }}>
      <View style={show("home")}><Home me={me} company={company} active={tab === "home"} refreshKey={overlay} isTab={isTab} goSell={() => setTab("products")} goSales={() => setTab("sales")} openPage={setOverlay} /></View>
      <View style={show("products")}><Sell cart={cart} setCart={setCart} active={tab === "products"} company={company} me={me} isTab={isTab} /></View>
      <View style={show("sales")}><SalesTab active={tab === "sales"} refreshKey={overlay} isTab={isTab} /></View>
      <View style={show("more")}><More me={me} company={company} onSignout={signout} openPage={setOverlay} /></View>
      {overlay === "notifications" && <NotificationsPage onBack={() => setOverlay(null)} openPage={setOverlay} />}
      {overlay === "orders" && <OrdersPage company={company} onBack={() => setOverlay(null)} />}
      {overlay === "customers" && <CustomersPage onBack={() => setOverlay(null)} />}
      {overlay === "inventory" && <InventoryPage onBack={() => setOverlay(null)} />}
      {overlay === "categories" && <CategoriesPage onBack={() => setOverlay(null)} />}
      {overlay === "settings" && <SettingsPage me={me} company={company} setCompany={setCompany} onBack={() => setOverlay(null)} />}
    </View>
  );
  if (isTab) return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: C.bg }}>
      <View style={st.sidebar}>
        <View style={st.sideBrandRow}>
          <View style={[st.storeDot, company?.logo && { overflow: "hidden" }]}>{company?.logo ? <Image source={{ uri: company.logo }} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 11 }}>🏬</Text>}</View>
          <Text style={st.sideBrand} numberOfLines={1}>{company?.name || "S POS"}</Text>
        </View>
        {TABS.map(([k, t, ic]) => (
          <Pressable key={k} style={[st.sideItem, tab === k && st.sideItemOn]} onPress={() => { Haptics.selectionAsync(); setOverlay(null); setTab(k); }}>
            <Feather name={ic} size={17} color={tab === k ? C.blue : "#9aa4b2"} style={{ width: 22, textAlign: "center" }} />
            <Text style={[st.sideT, tab === k && { color: C.blue }]}>{t}</Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <Press onPress={askSignout} haptic>
          <View style={st.sideUser}>
            <View style={st.sideAva}><Text style={st.sideAvaT}>{initials(me?.username)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={st.sideUserN} numberOfLines={1}>{me?.username || "…"}</Text>
              <Text style={st.sideUserR} numberOfLines={1}>{me?.role || ""}</Text>
            </View>
          </View>
        </Press>
      </View>
      {content}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {content}
      <View style={st.tabbar}>
        {TABS.map(([k, t, ic]) => (
          <Pressable key={k} style={st.tab} onPress={() => { Haptics.selectionAsync(); setOverlay(null); setTab(k); }}>
            <Feather name={ic} size={20} color={tab === k ? C.blue : "#9aa4b2"} />
            <Text style={[st.tabT, tab === k && { color: C.blue }]}>{t}</Text>
            <View style={[st.tabIndicator, tab !== k && { opacity: 0 }]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ---------------- Home (dashboard) ---------------- */
function Home({ me, company, active, refreshKey, isTab, goSell, goSales, openPage }) {
  const cardW = isTab ? "23.5%" : "47.5%";
  const [d, setD] = useState({}); const [yd, setYd] = useState({}); const [profit, setProfit] = useState(null);
  const [custN, setCustN] = useState(null); const [low, setLow] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const yStr = () => { const t = new Date(Date.now() - 86400000), p = (n) => String(n).padStart(2, "0"); return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`; };
  const load = useCallback(() => Promise.all([
    api(`/reports/dashboard/?date=${todayStr()}`).then(setD).catch(() => {}),
    api(`/reports/dashboard/?date=${yStr()}`).then(setYd).catch(() => {}),
    api(`/reports/by-item/?start=${todayStr()}&end=${todayStr()}`).then((rows) => setProfit(rows.reduce((a, r) => a + Number(r.margin || 0), 0))).catch(() => {}),
    api("/customers/customers/").then((r) => setCustN(r.count ?? listOf(r).length)).catch(() => {}),
    api("/reports/low-stock/").then((r) => setLow(Array.isArray(r) ? r : [])).catch(() => {}),
  ]), []);
  useEffect(() => { if (active && refreshKey == null) load(); }, [active, refreshKey, load]);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const trend = (now, before) => { const a = Number(now || 0), b = Number(before || 0); if (!b) return null; return Math.round(((a - b) / b) * 100); };
  const stats = [
    ["Sales", d.sales_total, true, C.greenBg, C.green, "trending-up", trend(d.sales_total, yd.sales_total)],
    ["Orders", d.sales_count, false, C.blueBg, C.blue, "shopping-bag", trend(d.sales_count, yd.sales_count)],
    ["Profit", profit, true, C.orangeBg, C.orange, "dollar-sign", null],
    ["Customers", custN, false, C.pinkBg, C.pink, "users", null],
  ];
  const actions = [["New Sale", "shopping-cart", goSell, true], ["Products", "package", goSell, false], ["Customers", "users", () => openPage("customers"), false], ["Reports", "pie-chart", goSales, false]];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.blue} />}>
      <View style={st.homeHead}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={[st.storeDot, company?.logo && { overflow: "hidden" }]}>{company?.logo ? <Image source={{ uri: company.logo }} style={{ width: "100%", height: "100%" }} /> : <Feather name="shopping-bag" size={11} color={C.blue} />}</View>
            <Text style={st.storeNameSm}>{company?.name || "My Store"}</Text>
          </View>
          <Text style={st.greetT}>{greet()},{"\n"}{me?.username || "there"}! 👋</Text>
          <Text style={st.greetSub}>Here's what's happening today</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <Press onPress={() => openPage("notifications")} haptic>
            <View style={st.bellBtn}>
              <Feather name="bell" size={17} color={C.ink} />
              {low.length > 0 && <View style={st.bellDot} />}
            </View>
          </Press>
          <View style={[st.todayChip, { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 0 }]}>
            <Text style={st.todayChipT}>Today</Text><Feather name="chevron-down" size={13} color={C.sub} />
          </View>
        </View>
      </View>
      <View style={st.statGrid}>
        {stats.map(([t, v, isMoney, bg, color, ic, tr], i) => (
          <Reveal key={t} index={i} style={{ width: cardW }}>
            <View style={[st.statCard, { backgroundColor: bg }]}>
              <View style={st.statTop}>
                <Text style={[st.statLbl, { color }]}>{t}</Text>
                <View style={st.statIcWrap}><Feather name={ic} size={15} color={color} /></View>
              </View>
              {v == null ? <Text style={st.statVal}>—</Text>
                : isMoney ? <CountUp value={v} style={st.statVal} prefix="" suffix={" " + CUR} />
                : <CountUp value={v} style={st.statVal} int />}
              {tr != null && tr !== 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 }}>
                  <Feather name={tr > 0 ? "arrow-up-right" : "arrow-down-right"} size={12} color={tr > 0 ? C.green : C.red} />
                  <Text style={{ fontSize: 11.5, fontWeight: "800", color: tr > 0 ? C.green : C.red }}>{Math.abs(tr)}%</Text>
                </View>
              )}
            </View>
          </Reveal>
        ))}
      </View>
      <Text style={st.secTitle}>Quick Actions</Text>
      <View style={st.qaGrid}>
        {actions.map(([t, ic, fn, primary], i) => (
          <Reveal key={t} index={i} style={{ width: cardW }}>
            <Press onPress={fn} haptic to={0.97}>
              <View style={[st.qaBtn, primary && { backgroundColor: C.blue, borderColor: C.blue }]}>
                <Feather name={ic} size={16} color={primary ? "#fff" : C.blue} />
                <Text style={[st.qaT, primary && { color: "#fff" }]}>{t}</Text>
              </View>
            </Press>
          </Reveal>
        ))}
      </View>
      {low.length > 0 && (<>
        <View style={st.secRow}>
          <Text style={st.secTitle2}>Low Stock Alert</Text>
          <Text style={st.viewAll}>View All</Text>
        </View>
        <View style={st.lowCard}>
          {low.slice(0, 5).map((r, i) => (
            <View key={i} style={[st.lowRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
              <ProductArt item={{ name: r.product, id: r.sku }} style={[st.pavaImg, { width: 36, height: 36 }]} />
              <View style={{ flex: 1 }}>
                <Text style={st.lowName} numberOfLines={1}>{r.product}</Text>
                <Text style={st.lowLeft}>Only {Number(r.quantity)} left</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#c1c8d4" />
            </View>
          ))}
        </View>
      </>)}
    </ScrollView>
  );
}

/* ---------------- Products (catalog + sell) ---------------- */
function Sell({ cart, setCart, active, company, me, isTab }) {
  const width = useAppWidth();
  const CARTW = Math.min(330, width * 0.38);
  const avail = width - (isTab ? 210 + CARTW : 0) - 28;
  const cols = isTab ? Math.max(3, Math.min(6, Math.floor(avail / 150))) : 3;
  const colW = (avail - (cols - 1) * 10) / cols;
  const [products, setProducts] = useState([]); const [q, setQ] = useState(""); const [cat, setCat] = useState("All");
  const [registers, setRegisters] = useState([]); const [session, setSession] = useState(null);
  const [refreshing, setRefreshing] = useState(false); const [err, setErr] = useState("");
  const [page, setPage] = useState(null); // null | 'cart' | 'pay' | 'scan' | 'customer' | {done:{...}}
  const [customer, setCustomer] = useState(null); const [note, setNote] = useState(""); const [dp, setDp] = useState(0);
  const load = useCallback(async () => {
    try { setProducts(listOf(await api("/catalog/products/"))); setErr(""); }
    catch (e) { setErr(e.message || "Couldn't load products"); }
    try {
      const [rd, sd] = await Promise.all([api("/registers/registers/"), api("/registers/sessions/")]);
      setRegisters(listOf(rd));
      setSession(listOf(sd).find((x) => String(x.status).toUpperCase() === "OPEN") || null);
    } catch {}
  }, []);
  useEffect(() => { if (active) load(); }, [active, load]);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const add = (p) => { Haptics.selectionAsync(); setCart((c) => { const o = c.find((x) => x.id === p.id); return o ? c.map((x) => x.id === p.id ? { ...x, qty: x.qty + 1 } : x) : [...c, { ...p, qty: 1 }]; }); };
  const setQty = (id, qty) => setCart((c) => (qty <= 0 ? c.filter((x) => x.id !== id) : c.map((x) => (x.id === id ? { ...x, qty } : x))));
  const { total } = cartTotals(cart, dp);
  const count = cart.reduce((a, x) => a + x.qty, 0);
  const cats = ["All", ...[...new Set(products.map((p) => p.category_name).filter(Boolean))]];
  const shown = products.filter((p) => p.active !== false
    && (cat === "All" || p.category_name === cat)
    && (!q || `${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(q.toLowerCase())));
  async function openReg(regId, opening) {
    try { const sn = await api("/registers/sessions/open/", { method: "POST", body: JSON.stringify({ register_id: regId, opening_cash: opening || "0" }) }); setSession(sn); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
    catch (e) { Alert.alert("Couldn't open register", e.message); }
  }
  async function scanned({ data }) {
    setPage(null);
    try { const p = await api(`/catalog/products/lookup/?code=${encodeURIComponent(data)}`); add(p); }
    catch { Alert.alert("Not found", `No product matches “${data}”`); }
  }
  const catalog = (
    <View style={{ flex: 1 }}>
      <View style={st.prodHead}>
        <Text style={st.prodTitle}>Products</Text>
        {(me?.role === "ADMIN" || me?.role === "MANAGER") && (
          <Press onPress={() => setPage("addproduct")} haptic>
            <View style={st.addPill}><Feather name="plus" size={13} color="#fff" /><Text style={st.addPillT}>Add Product</Text></View>
          </Press>
        )}
      </View>
      {!session && <OpenRegister registers={registers} onOpen={openReg} />}
      <View style={st.searchRow}>
        <View style={st.searchBox}><Feather name="search" size={16} color={C.sub} style={{ marginRight: 7 }} /><TextInput style={st.searchIn} placeholder="Search product, barcode or SKU" placeholderTextColor={C.sub} value={q} onChangeText={setQ} /></View>
        <Press onPress={() => setPage("scan")} haptic><View style={st.scanBtn}><Ionicons name="scan-outline" size={19} color={C.ink} /></View></Press>
      </View>
      <View style={{ height: 42 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 8, alignItems: "center" }}>
          {cats.map((c) => (
            <Press key={c} onPress={() => { Haptics.selectionAsync(); setCat(c); }}>
              <View style={[st.catChip, cat === c && st.catChipOn]}><Text style={[st.catChipT, cat === c && { color: "#fff" }]}>{c}</Text></View>
            </Press>
          ))}
        </ScrollView>
      </View>
      {!!err && <Press onPress={refresh}><View style={st.errBanner}><Text style={st.errBannerT}>{err} — tap to retry</Text></View></Press>}
      <FlatList
        key={cols} style={{ flex: 1 }} data={shown} numColumns={cols} keyExtractor={(p) => String(p.id)}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 14 }}
        contentContainerStyle={{ gap: 10, paddingTop: 6, paddingBottom: !isTab && count ? 110 : 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.blue} />}
        renderItem={({ item: p, index }) => {
          const qn = cart.find((x) => x.id === p.id)?.qty || 0;
          return (
            <Reveal index={Math.min(index, 11)} style={{ width: colW }}>
              <Press onPress={() => add(p)} to={0.94}>
                <View style={st.gcard}>
                  {qn > 0 && <View style={st.gBadge}><Text style={st.gBadgeT}>{qn}</Text></View>}
                  <ProductArt item={p} style={st.gImg} />
                  <Text style={st.gName} numberOfLines={1}>{p.name}</Text>
                  <Text style={st.gPrice}>{money(p.selling_price)} {CUR}</Text>
                </View>
              </Press>
            </Reveal>
          );
        }}
        ListEmptyComponent={<Text style={st.empty}>No products{q ? ` for “${q}”` : ""}</Text>}
      />
      {!isTab && count > 0 && !page && (
        <Reveal style={st.reviewWrap}>
          <Press onPress={() => setPage("cart")} haptic to={0.98}>
            <View style={st.reviewBar}>
              <Feather name="shopping-cart" size={17} color="#fff" />
              <View style={st.reviewCount}><Text style={st.reviewCountT}>{count}</Text></View>
              <Text style={st.reviewT}>View Cart</Text>
              <CountUp value={total} style={st.reviewTotal} suffix={" " + CUR} />
            </View>
          </Press>
        </Reveal>
      )}
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
      {isTab ? (
        <View style={{ flex: 1, flexDirection: "row" }}>
          {catalog}
          <CartPanel width={CARTW} cart={cart} setQty={setQty} count={count} total={total}
            onClear={() => setCart([])} onCharge={() => setPage("pay")} disabled={!session}
            dp={dp} setDp={setDp} customer={customer} onPickCustomer={() => setPage("customer")} />
        </View>
      ) : catalog}
      {page === "cart" && <CartPage cart={cart} setQty={setQty} onBack={() => setPage(null)}
        onClear={() => { setCart([]); setPage(null); }} onCharge={() => setPage("pay")} disabled={!session}
        dp={dp} setDp={setDp} note={note} setNote={setNote} customer={customer} onPickCustomer={() => setPage("customer")} />}
      {page === "customer" && <CustomerPage onBack={() => setPage(isTab ? null : "cart")}
        onPick={(c) => { setCustomer(c); setPage(isTab ? null : "cart"); }} />}
      {page === "pay" && <PayPage cart={cart} session={session} dp={dp} customer={customer} note={note} cashier={me?.username}
        onBack={() => setPage(isTab ? null : "cart")}
        onDone={(sale) => { setCart([]); setCustomer(null); setNote(""); setDp(0); setPage({ done: sale }); load(); }} />}
      {page?.done && <ReceiptPage sale={page.done} company={company} onNew={() => setPage(null)} />}
      {page === "scan" && <ScanPage onScan={scanned} onBack={() => setPage(null)} />}
      {page === "addproduct" && <AddProductPage onBack={() => setPage(null)} onSaved={() => { setPage(null); load(); }} />}
    </View>
  );
}
/* Persistent right-hand cart panel (tablet). */
function CartPanel({ width, cart, setQty, count, total, onClear, onCharge, disabled, dp, setDp, customer, onPickCustomer }) {
  const { sub, tax, discount } = cartTotals(cart, dp);
  return (
    <View style={[st.cartPanel, { width }]}>
      <View style={st.cartPanelHead}>
        <Text style={st.cartPanelTitle}>Cart ({count} item{count === 1 ? "" : "s"})</Text>
        {count > 0 && <Press onPress={() => Alert.alert("Clear cart?", "Remove all items.", [{ text: "Cancel", style: "cancel" }, { text: "Clear", style: "destructive", onPress: onClear }])}><Text style={st.clearT}>Clear</Text></Press>}
      </View>
      <ScrollView style={{ flex: 1 }}>
        {cart.map((x) => (
          <SwipeRow key={x.id} onDelete={() => setQty(x.id, 0)}>
            <View style={[st.cartRow, { paddingHorizontal: 12 }]}>
              <ProductArt item={x} style={[st.pavaImg, { width: 36, height: 36 }]} />
              <View style={{ flex: 1 }}>
                <Text style={st.cartName} numberOfLines={1}>{x.name}</Text>
                <Text style={st.cartMeta}>{money(x.selling_price)}</Text>
              </View>
              <View style={st.stepper}>
                <Press onPress={() => setQty(x.id, x.qty - 1)} to={0.85}><View style={st.stepBtn}><Text style={st.stepT}>−</Text></View></Press>
                <Text style={st.stepN}>{x.qty}</Text>
                <Press onPress={() => setQty(x.id, x.qty + 1)} to={0.85}><View style={[st.stepBtn, { backgroundColor: C.blueBg, borderColor: C.blueBg }]}><Text style={[st.stepT, { color: C.blue }]}>+</Text></View></Press>
              </View>
            </View>
          </SwipeRow>
        ))}
        {!cart.length && <Text style={st.empty}>Tap products to add them</Text>}
      </ScrollView>
      <View style={[st.totalsCard, { borderTopWidth: 1 }]}>
        <Press onPress={onPickCustomer} to={0.98}>
          <View style={[st.optRow, { marginBottom: 8 }]}>
            <Feather name="user" size={15} color={C.sub} />
            <Text style={[st.optT, customer && { color: C.ink }]} numberOfLines={1}>{customer ? customer.name : "Add Customer"}</Text>
            <Feather name="chevron-right" size={18} color="#c1c8d4" />
          </View>
        </Press>
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {[0, 5, 10, 15, 20].map((d) => (
            <Press key={d} onPress={() => { Haptics.selectionAsync(); setDp(d); }}>
              <View style={[st.dpChip, dp === d && st.dpChipOn]}><Text style={[st.dpChipT, dp === d && { color: "#fff" }]}>{d}%</Text></View>
            </Press>
          ))}
        </View>
        <Text style={[st.cartPanelTitle, { marginBottom: 6 }]}>Order Summary</Text>
        <View style={st.trow}><Text style={st.trowL}>Subtotal</Text><Text style={st.trowV}>{money(sub)} {CUR}</Text></View>
        {discount > 0 && <View style={st.trow}><Text style={st.trowL}>Discount ({dp}%)</Text><Text style={[st.trowV, { color: C.green }]}>− {money(discount)} {CUR}</Text></View>}
        <View style={st.trow}><Text style={st.trowL}>Tax</Text><Text style={st.trowV}>{money(tax)} {CUR}</Text></View>
        <View style={[st.trow, st.trowTotal]}>
          <Text style={st.trowTotalL}>Total</Text><CountUp value={total} style={st.trowTotalV} suffix={" " + CUR} />
        </View>
        <Press onPress={count && !disabled ? onCharge : undefined} haptic to={0.97}>
          <View style={[st.blueBtn, (!count || disabled) && { opacity: 0.4 }]}>
            <Text style={st.blueBtnT}>{disabled ? "Open a register first" : "Proceed to Payment  →"}</Text>
          </View>
        </Press>
      </View>
    </View>
  );
}
function OpenRegister({ registers, onOpen, inline }) {
  const [reg, setReg] = useState(registers[0]?.id ?? null); const [cash, setCash] = useState("0");
  useEffect(() => { if (reg == null && registers[0]) setReg(registers[0].id); }, [registers]);
  return (
    <Reveal><View style={inline ? { paddingTop: 4 } : st.openCard}>
      <Text style={st.openTitle}>Open a register to take payments</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
        {registers.map((r) => (
          <Press key={r.id} onPress={() => setReg(r.id)}>
            <View style={[st.rchip, reg === r.id && st.rchipOn]}><Text style={[st.rchipT, reg === r.id && { color: "#fff" }]}>{r.name}</Text></View>
          </Press>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 9 }}>
        <TextInput style={st.cashIn} keyboardType="numeric" value={cash} onChangeText={setCash} placeholder="Opening cash" placeholderTextColor={C.sub} />
        <Press onPress={() => reg != null && onOpen(reg, cash)} haptic><View style={st.openBtn}><Text style={st.openBtnT}>Open</Text></View></Press>
      </View>
    </View></Reveal>
  );
}

/* ---------------- Add Product (full detail form, admin/manager) ---------------- */
function AddProductPage({ onBack, onSaved }) {
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({ name: "", sku: "", barcode: "", category: null, selling_price: "", purchase_price: "", tax: "5", stock_quantity: "0", minimum_stock: "0" });
  const [photo, setPhoto] = useState(null); const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  useEffect(() => { api("/catalog/categories/").then((d) => setCats(listOf(d))).catch(() => {}); }, []);
  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Photos", "Allow photo access to add a product image.");
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    if (!res.canceled && res.assets?.[0]) setPhoto(res.assets[0]);
  }
  async function save() {
    if (!f.name.trim()) return Alert.alert("Add Product", "Product name is required.");
    if (!f.selling_price || isNaN(Number(f.selling_price))) return Alert.alert("Add Product", "Enter a valid selling price.");
    setBusy(true);
    try {
      const sku = f.sku.trim() || (f.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 12) + "-" + String(Date.now()).slice(-4));
      const body = {
        name: f.name.trim(), sku, selling_price: Number(f.selling_price).toFixed(2),
        purchase_price: Number(f.purchase_price || 0).toFixed(2),
        tax_rate: (Number(f.tax || 0) / 100).toFixed(4),
        stock_quantity: String(Number(f.stock_quantity || 0)), minimum_stock: String(Number(f.minimum_stock || 0)),
        ...(f.barcode.trim() ? { barcode: f.barcode.trim() } : {}),
        ...(f.category ? { category: f.category } : {}),
      };
      if (photo && isLocal()) body.image_uri = photo.uri;
      const p = await api("/catalog/products/", { method: "POST", body: JSON.stringify(body) });
      if (photo && !isLocal()) {
        const fd = new FormData();
        const name = (photo.fileName || "photo.jpg").replace(/[^\w.\-]/g, "_");
        fd.append("image", { uri: photo.uri, name, type: photo.mimeType || "image/jpeg" });
        try { await apiUpload(`/catalog/products/${p.id}/`, "PATCH", fd); }
        catch (e) { Alert.alert("Photo upload", "Product saved, but the photo failed: " + e.message); }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved ✓", `${p.name} was added to your catalog.`);
      onSaved();
    } catch (e) { Alert.alert("Couldn't save product", e.message); } finally { setBusy(false); }
  }
  return (
    <Slide>
      <Header title="Add Product" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <Press onPress={pickPhoto} to={0.98}>
          <View style={st.photoPick}>
            {photo ? <Image source={{ uri: photo.uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              : (<>
                <Feather name="camera" size={22} color={C.sub} />
                <Text style={[st.rcQty, { marginTop: 6 }]}>Add product photo</Text>
              </>)}
          </View>
        </Press>
        <Text style={st.fieldLbl2}>PRODUCT NAME *</Text>
        <TextInput style={st.formIn} placeholder="e.g. Orange Juice 1L" placeholderTextColor={C.sub} value={f.name} onChangeText={(v) => set("name", v)} />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={st.fieldLbl2}>SELLING PRICE ({CUR}) *</Text>
            <TextInput style={st.formIn} keyboardType="numeric" placeholder="0.00" placeholderTextColor={C.sub} value={f.selling_price} onChangeText={(v) => set("selling_price", v)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.fieldLbl2}>COST PRICE ({CUR})</Text>
            <TextInput style={st.formIn} keyboardType="numeric" placeholder="0.00" placeholderTextColor={C.sub} value={f.purchase_price} onChangeText={(v) => set("purchase_price", v)} />
          </View>
        </View>
        <Text style={[st.fieldLbl2, { marginTop: 12 }]}>CATEGORY</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {cats.map((c) => (
            <Press key={c.id} onPress={() => set("category", f.category === c.id ? null : c.id)}>
              <View style={[st.catChip, f.category === c.id && st.catChipOn]}><Text style={[st.catChipT, f.category === c.id && { color: "#fff" }]}>{c.name}</Text></View>
            </Press>
          ))}
          {!cats.length && <Text style={st.rcQty}>No categories yet — add one in More → Categories</Text>}
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={st.fieldLbl2}>TAX %</Text>
            <TextInput style={st.formIn} keyboardType="numeric" placeholder="5" placeholderTextColor={C.sub} value={f.tax} onChangeText={(v) => set("tax", v)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.fieldLbl2}>OPENING STOCK</Text>
            <TextInput style={st.formIn} keyboardType="numeric" placeholder="0" placeholderTextColor={C.sub} value={f.stock_quantity} onChangeText={(v) => set("stock_quantity", v)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.fieldLbl2}>LOW-STOCK ALERT</Text>
            <TextInput style={st.formIn} keyboardType="numeric" placeholder="0" placeholderTextColor={C.sub} value={f.minimum_stock} onChangeText={(v) => set("minimum_stock", v)} />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={st.fieldLbl2}>SKU (AUTO IF EMPTY)</Text>
            <TextInput style={st.formIn} autoCapitalize="characters" placeholder="AUTO" placeholderTextColor={C.sub} value={f.sku} onChangeText={(v) => set("sku", v)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.fieldLbl2}>BARCODE (OPTIONAL)</Text>
            <TextInput style={st.formIn} keyboardType="numeric" placeholder="Scan or type" placeholderTextColor={C.sub} value={f.barcode} onChangeText={(v) => set("barcode", v)} />
          </View>
        </View>
        <Press onPress={busy ? undefined : save} haptic>
          <View style={[st.blueBtn, busy && { opacity: 0.6 }]}><Text style={st.blueBtnT}>{busy ? "Saving…" : "Save Product"}</Text></View>
        </Press>
      </ScrollView>
    </Slide>
  );
}
/* ---------------- Cart ---------------- */
function CartPage({ cart, setQty, onBack, onClear, onCharge, disabled, dp, setDp, note, setNote, customer, onPickCustomer }) {
  const { sub, tax, discount, total } = cartTotals(cart, dp);
  return (
    <Slide>
      <Header title="Cart" onBack={onBack}
        right={<Press onPress={() => Alert.alert("Clear cart?", "Remove all items.", [{ text: "Cancel", style: "cancel" }, { text: "Clear", style: "destructive", onPress: onClear }])}><Text style={st.clearT}>Clear</Text></Press>} />
      <ScrollView style={{ flex: 1 }}>
        <Text style={st.hint}>Swipe an item left to remove it</Text>
        {cart.map((x) => (
          <SwipeRow key={x.id} onDelete={() => setQty(x.id, 0)}>
            <View style={st.cartRow}>
              <ProductArt item={x} style={st.pavaImg} />
              <View style={{ flex: 1 }}>
                <Text style={st.cartName} numberOfLines={1}>{x.name}</Text>
                <Text style={st.cartMeta}>{money(x.selling_price)} {CUR}</Text>
              </View>
              <View style={st.stepper}>
                <Press onPress={() => setQty(x.id, x.qty - 1)} to={0.85}><View style={st.stepBtn}><Text style={st.stepT}>−</Text></View></Press>
                <Text style={st.stepN}>{x.qty}</Text>
                <Press onPress={() => setQty(x.id, x.qty + 1)} to={0.85}><View style={[st.stepBtn, { backgroundColor: C.blueBg, borderColor: C.blueBg }]}><Text style={[st.stepT, { color: C.blue }]}>+</Text></View></Press>
              </View>
              <Text style={st.cartLineTotal}>{money(r2(Number(x.selling_price) * x.qty))}</Text>
            </View>
          </SwipeRow>
        ))}
        {!cart.length && <Text style={st.empty}>Cart is empty</Text>}
        <View style={{ paddingHorizontal: 14, marginTop: 10, gap: 9 }}>
          <Press onPress={onPickCustomer} to={0.98}>
            <View style={st.optRow}>
              <Feather name="user" size={15} color={C.sub} />
              <Text style={[st.optT, customer && { color: C.ink }]}>{customer ? customer.name : "Add Customer"}</Text>
              <Feather name="chevron-right" size={18} color="#c1c8d4" />
            </View>
          </Press>
          <View style={st.optRow}>
            <Feather name="edit-3" size={15} color={C.sub} />
            <TextInput style={[st.optT, { color: C.ink, paddingVertical: 0 }]} placeholder="Add Note (optional)"
              placeholderTextColor={C.sub} value={note} onChangeText={setNote} />
          </View>
          <View style={[st.optRow, { gap: 8 }]}>
            <Feather name="tag" size={15} color={C.sub} />
            <Text style={[st.optT, { flex: 0 }]}>Discount</Text>
            <View style={{ flex: 1, flexDirection: "row", justifyContent: "flex-end", gap: 6 }}>
              {[0, 5, 10, 15, 20].map((d) => (
                <Press key={d} onPress={() => { Haptics.selectionAsync(); setDp(d); }}>
                  <View style={[st.dpChip, dp === d && st.dpChipOn]}><Text style={[st.dpChipT, dp === d && { color: "#fff" }]}>{d}%</Text></View>
                </Press>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={st.totalsCard}>
        <View style={st.trow}><Text style={st.trowL}>Subtotal</Text><Text style={st.trowV}>{money(sub)} {CUR}</Text></View>
        {discount > 0 && <View style={st.trow}><Text style={st.trowL}>Discount ({dp}%)</Text><Text style={[st.trowV, { color: C.green }]}>− {money(discount)} {CUR}</Text></View>}
        <View style={st.trow}><Text style={st.trowL}>Tax</Text><Text style={st.trowV}>{money(tax)} {CUR}</Text></View>
        <View style={[st.trow, st.trowTotal]}>
          <Text style={st.trowTotalL}>Total</Text><CountUp value={total} style={st.trowTotalV} suffix={" " + CUR} />
        </View>
        <Press onPress={cart.length && !disabled ? onCharge : undefined} haptic to={0.97}>
          <View style={[st.blueBtn, (!cart.length || disabled) && { opacity: 0.4 }]}>
            <Text style={st.blueBtnT}>{disabled ? "Open a register first" : "Proceed to Payment  →"}</Text>
          </View>
        </Press>
      </View>
    </Slide>
  );
}
/* Customer picker (walk-in by default). */
function CustomerPage({ onBack, onPick }) {
  const [rows, setRows] = useState([]); const [q, setQ] = useState(""); const [busy, setBusy] = useState(true);
  useEffect(() => { api("/customers/customers/").then((d) => setRows(listOf(d))).catch(() => {}).finally(() => setBusy(false)); }, []);
  const shown = rows.filter((c) => !q || `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Slide>
      <Header title="Customers" onBack={onBack} />
      <View style={[st.searchRow, { paddingTop: 10 }]}>
        <View style={st.searchBox}><Feather name="search" size={16} color={C.sub} style={{ marginRight: 7 }} /><TextInput style={st.searchIn} placeholder="Search customers…" placeholderTextColor={C.sub} value={q} onChangeText={setQ} /></View>
      </View>
      {busy ? <View style={st.fill}><ActivityIndicator color={C.blue} /></View> : (
        <ScrollView style={{ flex: 1 }}>
          <Press onPress={() => onPick(null)}>
            <View style={[st.cartRow]}>
              <View style={[st.pava, { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line }]}><Feather name="user-x" size={17} color={C.sub} /></View>
              <Text style={[st.cartName, { flex: 1 }]}>Walk-in customer</Text>
            </View>
          </Press>
          {shown.map((c) => (
            <Press key={c.id} onPress={() => onPick(c)}>
              <View style={st.cartRow}>
                <View style={[st.pava, { backgroundColor: avaColor(c.name) }]}><Text style={st.pavaT}>{initials(c.name)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.cartName}>{c.name}</Text>
                  {!!(c.phone || c.email) && <Text style={st.cartMeta}>{c.phone || c.email}</Text>}
                </View>
                <Feather name="chevron-right" size={18} color="#c1c8d4" />
              </View>
            </Press>
          ))}
          {!shown.length && <Text style={st.empty}>No customers yet</Text>}
        </ScrollView>
      )}
    </Slide>
  );
}

/* ---------------- Payment ---------------- */
const METHODS = [
  ["CARD", "Card", "card-outline", "Tap, Insert or Swipe Card"],
  ["CASH", "Cash", "cash-outline", "Collect cash and give change if needed"],
  ["QR", "QR Code", "qr-code-outline", "Let the customer scan your payment QR"],
  ["WALLET", "Wallet", "wallet-outline", "Accept a mobile wallet payment"],
];
function PayPage({ cart, session, dp, customer, note, cashier, onBack, onDone }) {
  const { sub, tax, discount, total } = cartTotals(cart, dp);
  const [method, setMethod] = useState("CARD");
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(METHODS.map(([m]) => m));
  useEffect(() => { store.get("paymethods").then((v) => { if (v) { const e = JSON.parse(v); if (e.length) { setEnabled(e); if (!e.includes("CARD")) setMethod(e[0]); } } }); }, []);
  const shownMethods = METHODS.filter(([m]) => enabled.includes(m));
  const sel = METHODS.find(([m]) => m === method) || shownMethods[0];
  async function execute(amount) {
    return api("/checkout/executions/execute/", { method: "POST", body: JSON.stringify({
      session_id: session.id,
      items: cart.map((x) => ({ product_id: x.id, quantity: x.qty })),
      discount_percent: String(dp || 0),
      ...(customer ? { customer_id: customer.id } : {}),
      payments: [{ method, amount, status: "CAPTURED" }],
    }) });
  }
  async function confirm() {
    if (busy) return; setBusy(true);
    let paid = total;
    try {
      try { await execute(total.toFixed(2)); }
      catch (e) {
        // If server pricing (e.g. promotions) differs, it tells us the real total — retry once with it.
        const m = /does not equal invoice total ([\d.]+)/.exec(e.message || "");
        if (!m) throw e;
        paid = Number(m[1]); await execute(m[1]);
      }
      let invoice = "";
      try { const s = listOf(await api("/sales/sales/"))[0]; invoice = s?.invoice_number || ""; } catch {}
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDone({ total: paid, sub, tax, discount, dp, method, invoice, customer: customer?.name || "", note, cashier,
        items: cart.map((x) => ({ name: x.name, qty: x.qty, line: r2(Number(x.selling_price) * x.qty) })), at: new Date() });
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Payment failed", e.message);
    } finally { setBusy(false); }
  }
  return (
    <Slide>
      <Header title="Payment" onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 20, width: "100%", maxWidth: 560, alignSelf: "center" }}>
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <Text style={st.payLbl}>Total Amount</Text>
          <Text style={st.payTotal}>{money(total)} <Text style={st.payCur}>{CUR}</Text></Text>
        </View>
        <View style={st.methodGrid}>
          {shownMethods.map(([m, label, ic], i) => (
            <Reveal key={m} index={i} style={{ width: "47.5%" }}>
              <Press onPress={() => { Haptics.selectionAsync(); setMethod(m); }} to={0.96}>
                <View style={[st.methodTile, method === m && st.methodTileOn]}>
                  <Ionicons name={ic} size={24} color={method === m ? C.blue : C.ink} />
                  <Text style={[st.methodT, method === m && { color: C.blue }]}>{label}</Text>
                </View>
              </Press>
            </Reveal>
          ))}
        </View>
        <View style={st.paySection}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={st.paySectionT}>{sel[1]} Payment</Text>
            <Text style={st.viewAll}>Change</Text>
          </View>
          <View style={st.payGraphic}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name={sel[2]} size={40} color={C.blue} />
              {method === "CARD" && <Ionicons name="wifi-outline" size={22} color={C.blue} style={{ transform: [{ rotate: "90deg" }] }} />}
            </View>
            <Text style={st.methodInfoT}>{sel[3]}</Text>
            {method === "CARD" && (<>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                {["VISA", "MC", "AMEX", "DISCOVER"].map((b) => (
                  <View key={b} style={st.brandBadge}><Text style={st.brandBadgeT}>{b}</Text></View>
                ))}
              </View>
              <Text style={{ color: C.sub, fontSize: 12, marginVertical: 4 }}>or</Text>
              <Press onPress={confirm} to={0.97}>
                <View style={[st.ghostBtn, { marginTop: 0, paddingVertical: 12, paddingHorizontal: 20, flexDirection: "row", gap: 8, alignItems: "center" }]}>
                  <Feather name="credit-card" size={15} color={C.ink} />
                  <Text style={[st.ghostBtnT, { fontSize: 13.5 }]}>Enter Card Manually</Text>
                </View>
              </Press>
            </>)}
          </View>
        </View>
      </ScrollView>
      <View style={st.totalsCard}>
        <Press onPress={confirm} haptic to={0.97}>
          <View style={[st.blueBtn, busy && { opacity: 0.6 }]}>
            <Text style={st.blueBtnT}>{busy ? "Processing…" : `Confirm ${sel[1]} Payment`}</Text>
          </View>
        </Press>
      </View>
    </Slide>
  );
}

/* ---------------- Receipt (success) ---------------- */
function Barcode({ seed }) {
  const s = String(seed || "SPOS");
  const bars = [];
  for (let i = 0; i < 42; i++) bars.push(1 + ((s.charCodeAt(i % s.length) * (i + 3)) % 3));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 1.5, height: 40 }}>
      {bars.map((w, i) => <View key={i} style={{ width: w, height: i % 7 === 0 ? 40 : 34, backgroundColor: C.ink }} />)}
    </View>
  );
}
function receiptText(sale, company, dateStr) {
  return `${company?.name || "S POS"} — Receipt ${sale.invoice || ""}\n${dateStr}\n` +
    (sale.customer ? `Customer: ${sale.customer}\n` : "") + "\n" +
    sale.items.map((i) => `${i.name} x${i.qty}  ${money(i.line)} ${CUR}`).join("\n") +
    `\n\nSubtotal: ${money(sale.sub)} ${CUR}` +
    (sale.discount > 0 ? `\nDiscount (${sale.dp}%): -${money(sale.discount)} ${CUR}` : "") +
    `\nTax: ${money(sale.tax)} ${CUR}\nTotal: ${money(sale.total)} ${CUR}\nPaid by ${sale.method}` +
    (sale.note ? `\nNote: ${sale.note}` : "") + `\n\nThank you! Visit us again!`;
}
function receiptHtml(sale, company, dateStr) {
  const rows = sale.items.map((i) => `<tr><td>${i.name} <span class="q">x${i.qty}</span></td><td class="r">${money(i.line)}</td></tr>`).join("");
  return `<html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;padding:24px;max-width:380px;margin:auto}
    h2{margin:0}.sub{color:#64748b;font-size:12px;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin-top:14px}td{padding:5px 0;font-size:13px}
    .r{text-align:right;font-weight:700}.q{color:#64748b}
    .line{border-top:1px dashed #cbd5e1;margin:10px 0}
    .tot{font-size:16px;font-weight:900}.grn{color:#16a34a}
    .foot{text-align:center;color:#64748b;font-size:12px;margin-top:16px}
  </style></head><body>
    ${company?.logo ? `<img src="${company.logo}" style="height:56px;border-radius:10px;display:block;margin:0 auto 8px"/>` : ""}
    <h2>${company?.name || "S POS"}</h2><div class="sub">${dateStr}${sale.invoice ? " · #" + sale.invoice : ""}${sale.customer ? " · " + sale.customer : ""}</div>
    <table>${rows}</table><div class="line"></div>
    <table>
      <tr><td>Subtotal</td><td class="r">${money(sale.sub)} ${CUR}</td></tr>
      ${sale.discount > 0 ? `<tr><td>Discount (${sale.dp}%)</td><td class="r grn">− ${money(sale.discount)} ${CUR}</td></tr>` : ""}
      <tr><td>Tax</td><td class="r">${money(sale.tax)} ${CUR}</td></tr>
      <tr><td class="tot">Total</td><td class="r tot">${money(sale.total)} ${CUR}</td></tr>
      <tr><td>Paid by</td><td class="r">${sale.method}</td></tr>
    </table>
    ${sale.note ? `<div class="sub" style="margin-top:10px">Note: ${sale.note}</div>` : ""}
    <div class="foot">Thank you! Visit us again!<br/>Powered by S POS</div>
  </body></html>`;
}
function ReceiptPage({ sale, company, onNew }) {
  const a = useRef(new Animated.Value(0)).current;
  const [footer, setFooter] = useState("Thank you! Visit us again!");
  const [showBarcode, setShowBarcode] = useState(true);
  useEffect(() => {
    Animated.spring(a, { toValue: 1, useNativeDriver: true, bounciness: 12, speed: 8 }).start();
    store.get("rc_footer").then((f) => f && setFooter(f));
    store.get("rc_barcode").then((b) => setShowBarcode(b !== "0"));
  }, []);
  const dt = sale.at instanceof Date ? sale.at : new Date();
  const dateStr = dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) + "  " + dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const doPrint = () => Print.printAsync({ html: receiptHtml(sale, company, dateStr) }).catch(() => Alert.alert("Print", "No printer available on this device."));
  const doEmail = () => Linking.openURL(`mailto:?subject=${encodeURIComponent(`Receipt ${sale.invoice || ""} — ${company?.name || "S POS"}`)}&body=${encodeURIComponent(receiptText(sale, company, dateStr))}`).catch(() => {});
  const doShare = () => Share.share({ message: receiptText(sale, company, dateStr) }).catch(() => {});
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, zIndex: 30 }]}>
      <Header title="Sale Completed" onBack={onNew} />
      <ScrollView contentContainerStyle={{ alignItems: "center", padding: 20, paddingTop: 22, width: "100%", maxWidth: 560, alignSelf: "center" }}>
        <Animated.View style={[st.okCircle, { transform: [{ scale: a }] }]}><Feather name="check" size={38} color="#fff" /></Animated.View>
        <Text style={st.okTitle}>Payment Successful!</Text>
        <Text style={st.okSub}>Thank you for your purchase</Text>
        <View style={st.receiptCard}>
          <View style={{ alignItems: "center" }}>
            <View style={[st.rcLogo, company?.logo && { overflow: "hidden" }]}>{company?.logo ? <Image source={{ uri: company.logo }} style={{ width: "100%", height: "100%" }} /> : <Feather name="shopping-bag" size={18} color={C.blue} />}</View>
            <Text style={st.rcStoreBig}>{company?.name || "My Store"}</Text>
            <Text style={st.rcMuted}>{dateStr}</Text>
          </View>
          <View style={st.rcDivider} />
          <View style={st.trow}><Text style={st.rcMuted}>Receipt</Text><Text style={st.rcMeta}>{sale.invoice ? "#" + sale.invoice : "—"}</Text></View>
          <View style={st.trow}><Text style={st.rcMuted}>Cashier</Text><Text style={st.rcMeta}>{sale.cashier || "—"}</Text></View>
          {!!sale.customer && <View style={st.trow}><Text style={st.rcMuted}>Customer</Text><Text style={st.rcMeta}>{sale.customer}</Text></View>}
          <View style={st.trow}><Text style={st.rcMuted}>Paid by</Text><Text style={st.rcMeta}>{sale.method}</Text></View>
          <View style={st.rcDivider} />
          {sale.items.map((i, k) => (
            <View key={k} style={{ marginBottom: 7 }}>
              <View style={st.trow}>
                <Text style={st.rcItem} numberOfLines={1}>{i.name}</Text>
                <Text style={st.rcItemV}>{money(i.line)}</Text>
              </View>
              <Text style={st.rcQty}>{i.qty} × {money(i.line / i.qty)} {CUR}</Text>
            </View>
          ))}
          <View style={st.rcDivider} />
          <View style={st.trow}><Text style={st.trowL}>Subtotal</Text><Text style={st.trowV}>{money(sale.sub)} {CUR}</Text></View>
          {sale.discount > 0 && <View style={st.trow}><Text style={st.trowL}>Discount ({sale.dp}%)</Text><Text style={[st.trowV, { color: C.green }]}>− {money(sale.discount)} {CUR}</Text></View>}
          <View style={st.trow}><Text style={st.trowL}>Tax</Text><Text style={st.trowV}>{money(sale.tax)} {CUR}</Text></View>
          <View style={st.rcTotalBox}>
            <Text style={st.trowTotalL}>Total</Text>
            <Text style={st.trowTotalV}>{money(sale.total)} {CUR}</Text>
          </View>
          {!!sale.note && <Text style={[st.rcMuted, { marginTop: 8 }]}>Note: {sale.note}</Text>}
          <View style={{ marginTop: 16 }}>
            {showBarcode && <Barcode seed={sale.invoice || String(sale.total)} />}
            {showBarcode && !!sale.invoice && <Text style={st.rcInv}>{sale.invoice}</Text>}
            <Text style={st.rcThanks}>{footer} 💙</Text>
            <Text style={st.rcPowered}>Powered by S POS</Text>
          </View>
        </View>
        <View style={{ width: "100%", marginTop: 14, gap: 9 }}>
          <Press onPress={doPrint} haptic to={0.97}><View style={[st.blueBtn, st.btnRow]}><Feather name="printer" size={16} color="#fff" /><Text style={st.blueBtnT}>Print Receipt</Text></View></Press>
          <Press onPress={doEmail} haptic to={0.97}><View style={[st.ghostBtn, st.btnRow]}><Feather name="mail" size={16} color={C.ink} /><Text style={st.ghostBtnT}>Email Receipt</Text></View></Press>
          <Press onPress={doShare} haptic to={0.97}><View style={[st.ghostBtn, st.btnRow]}><Feather name="share-2" size={16} color={C.ink} /><Text style={st.ghostBtnT}>Share Receipt</Text></View></Press>
          <Press onPress={onNew} haptic to={0.97}><View style={st.blueBtn}><Text style={st.blueBtnT}>New Sale</Text></View></Press>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------- Scanner ---------------- */
function ScanPage({ onScan, onBack }) {
  const [perm, requestPerm] = useCameraPermissions();
  useEffect(() => { if (!perm || !perm.granted) requestPerm(); }, []);
  return (
    <Slide>
      {perm?.granted ? (
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView style={{ flex: 1 }} onBarcodeScanned={onScan}
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "qr", "code128", "code39", "upc_a", "upc_e"] }} />
          <View style={st.scanFrame} pointerEvents="none" />
          <View style={st.scanTopBar}>
            <Press onPress={onBack} haptic><View style={st.scanBack}><Feather name="chevron-left" size={22} color="#fff" /></View></Press>
            <Text style={st.scanHint}>Point at a barcode</Text>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Header title="Scan" onBack={onBack} />
          <View style={st.fill}>
            <Text style={{ color: C.sub, marginBottom: 14, paddingHorizontal: 40, textAlign: "center" }}>Camera access is needed to scan barcodes.</Text>
            <Press onPress={requestPerm} haptic><View style={st.openBtn}><Text style={st.openBtnT}>Grant camera access</Text></View></Press>
          </View>
        </View>
      )}
    </Slide>
  );
}

/* ---------------- Sales tab ---------------- */
function SalesTab({ active, refreshKey, isTab }) {
  const cardW = isTab ? "23.5%" : "47.5%";
  const [d, setD] = useState({}); const [hours, setHours] = useState([]);
  const [top, setTop] = useState([]); const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(() => Promise.all([
    api(`/reports/dashboard/?date=${todayStr()}`).then(setD).catch(() => {}),
    api(`/reports/by-hour/?date=${todayStr()}`).then((r) => setHours(Array.isArray(r) ? r : [])).catch(() => {}),
    api(`/reports/by-item/?start=${todayStr()}&end=${todayStr()}`).then((r) => setTop((Array.isArray(r) ? r : []).slice(0, 5))).catch(() => {}),
    api("/sales/sales/").then((r) => setOrders(listOf(r).slice(0, 15))).catch(() => {}),
  ]), []);
  useEffect(() => { if (active && refreshKey == null) load(); }, [active, refreshKey, load]);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const maxH = Math.max(...hours.map((h) => Number(h.total || 0)), 1);
  const avg = Number(d.sales_count) ? Number(d.sales_total) / Number(d.sales_count) : 0;
  const fmtH = (h) => (h === 0 ? "12AM" : h < 12 ? h + "AM" : h === 12 ? "12PM" : (h - 12) + "PM");
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.blue} />}>
      <View style={st.salesHead}>
        <View>
          <Text style={st.prodTitle}>Sales</Text>
          <CountUp value={d.sales_total || 0} style={st.salesBig} suffix={" " + CUR} />
        </View>
        <View style={[st.todayChip, { flexDirection: "row", alignItems: "center", gap: 5 }]}>
          <Text style={st.todayChipT}>Today</Text><Feather name="chevron-down" size={13} color={C.sub} />
        </View>
      </View>
      {hours.length > 0 && (
        <Reveal><View style={st.chartCard}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: 110, gap: 4 }}>
            {hours.map((h, i) => (
              <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                <View style={{ width: "70%", maxWidth: 26, height: Math.max(6, 100 * Number(h.total || 0) / maxH), backgroundColor: C.blue, borderRadius: 4, opacity: 0.85 }} />
                <Text style={st.chartLbl}>{fmtH(Number(h.hour))}</Text>
              </View>
            ))}
          </View>
        </View></Reveal>
      )}
      <View style={[st.statGrid, { marginTop: 4 }, isTab && { justifyContent: "flex-start", columnGap: 14 }]}>
        <Reveal style={{ width: cardW }}>
          <View style={[st.statCard, { backgroundColor: C.blueBg }]}>
            <View style={st.statTop}><Text style={[st.statLbl, { color: C.blue }]}>Orders</Text><View style={st.statIcWrap}><Feather name="file-text" size={15} color={C.blue} /></View></View>
            <CountUp value={d.sales_count || 0} style={st.statVal} int />
          </View>
        </Reveal>
        <Reveal index={1} style={{ width: cardW }}>
          <View style={[st.statCard, { backgroundColor: C.greenBg }]}>
            <View style={st.statTop}><Text style={[st.statLbl, { color: C.green }]}>Avg. Order</Text><View style={st.statIcWrap}><Feather name="trending-up" size={15} color={C.green} /></View></View>
            <CountUp value={avg} style={st.statVal} suffix={" " + CUR} />
          </View>
        </Reveal>
      </View>
      {top.length > 0 && (<>
        <View style={st.secRow}><Text style={st.secTitle2}>Top Selling Products</Text><Text style={st.viewAll}>View All</Text></View>
        <View style={st.lowCard}>
          {top.map((r, i) => (
            <View key={i} style={[st.lowRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
              <ProductArt item={{ name: r.product_name, id: r.sku }} style={[st.pavaImg, { width: 36, height: 36 }]} />
              <View style={{ flex: 1 }}>
                <Text style={st.lowName} numberOfLines={1}>{r.product_name}</Text>
                <Text style={st.rcQty}>{Number(r.quantity)} sold</Text>
              </View>
              <Text style={st.trowV}>{money(r.revenue)} {CUR}</Text>
            </View>
          ))}
        </View>
      </>)}
      <Text style={st.secTitle2}>Recent Orders</Text>
      <View style={[st.lowCard, { marginBottom: 8 }]}>
        {orders.map((r, i) => (
          <View key={r.id} style={[st.lowRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
            <View style={[st.pava, { width: 36, height: 36, borderRadius: 10, backgroundColor: r.status === "COMPLETED" ? C.greenBg : C.redBg }]}>
              <Text style={{ color: r.status === "COMPLETED" ? C.green : C.red, fontWeight: "900" }}>{r.status === "COMPLETED" ? "✓" : "✕"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.lowName}>{r.invoice_number}</Text>
              <Text style={st.rcQty}>{String(r.created_at || "").slice(0, 16).replace("T", "  ")}</Text>
            </View>
            <Text style={st.trowV}>{money(r.total_amount)} {CUR}</Text>
          </View>
        ))}
        {!orders.length && <Text style={st.empty}>No sales yet</Text>}
      </View>
    </ScrollView>
  );
}

/* ---------------- More ---------------- */
function More({ me, company, onSignout, openPage }) {
  const menu = [
    ["Orders", "View and manage orders", "file-text", "orders"],
    ["Customers", "Manage customer data", "users", "customers"],
    ["Inventory", "Track stock levels", "box", "inventory"],
    ["Categories", "Organize your products", "grid", "categories"],
    ["Settings", "Customize your POS", "settings", "settings"],
  ];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={st.prodHead}><Text style={st.prodTitle}>More</Text></View>
      <View style={[st.lowCard, { marginTop: 4 }]}>
        {menu.map(([t, sub, ic, page], i) => (
          <Press key={t} onPress={() => openPage(page)} haptic to={0.98}>
            <View style={[st.lowRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
              <View style={st.moreIc}><Feather name={ic} size={15} color={C.blue} /></View>
              <View style={{ flex: 1 }}>
                <Text style={st.lowName}>{t}</Text>
                <Text style={st.rcQty}>{sub}</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#c1c8d4" />
            </View>
          </Press>
        ))}
      </View>
      <View style={[st.lowCard, { marginTop: 12 }]}>
        <View style={st.lowRow}>
          <View style={st.moreIc}><Feather name="info" size={15} color={C.blue} /></View>
          <Text style={[st.lowName, { flex: 1 }]}>About</Text>
          <Text style={st.trowV}>v1.0.0</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
        <Press onPress={() => Alert.alert("Sign out?", "", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: onSignout }])} haptic to={0.97}>
          <View style={[st.signoutBtn, st.btnRow]}><Feather name="log-out" size={16} color={C.red} /><Text style={st.signoutT}>Log Out</Text></View>
        </Press>
      </View>
      <Text style={st.credit}>© S POS · Developed by Sridhar Mahalingam</Text>
    </ScrollView>
  );
}
/* ---------------- Notifications (live: low stock + recent activity) ---------------- */
function timeAgo(iso) {
  const t = new Date(iso).getTime(); if (!t) return "";
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return "just now"; if (m < 60) return m + "m ago";
  const h = Math.round(m / 60); if (h < 24) return h + "h ago";
  return Math.round(h / 24) + "d ago";
}
function NotificationsPage({ onBack, openPage }) {
  const [low, setLow] = useState([]); const [sales, setSales] = useState([]); const [busy, setBusy] = useState(true);
  useEffect(() => { Promise.all([
    api("/reports/low-stock/").then((r) => setLow(Array.isArray(r) ? r : [])).catch(() => {}),
    api("/sales/sales/").then((r) => setSales(listOf(r).slice(0, 8))).catch(() => {}),
  ]).finally(() => setBusy(false)); }, []);
  const empty = !low.length && !sales.length;
  return (
    <Slide>
      <Header title="Notifications" onBack={onBack} />
      {busy ? <View style={st.fill}><ActivityIndicator color={C.blue} /></View> : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 26 }}>
          {empty && (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <View style={[st.rcLogo, { width: 56, height: 56, borderRadius: 18 }]}><Feather name="bell-off" size={24} color={C.blue} /></View>
              <Text style={[st.lowName, { marginTop: 12 }]}>You're all caught up</Text>
              <Text style={st.rcQty}>Alerts about stock and sales appear here</Text>
            </View>
          )}
          {low.length > 0 && (<>
            <Text style={[st.secTitle2, { paddingHorizontal: 4, marginTop: 0 }]}>Inventory alerts</Text>
            <View style={st.lowCard}>
              {low.slice(0, 8).map((r, i) => (
                <Press key={i} onPress={() => openPage("inventory")} to={0.98}>
                  <View style={[st.lowRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                    <View style={[st.moreIc, { backgroundColor: C.orangeBg }]}><Feather name="alert-triangle" size={15} color={C.orange} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.lowName} numberOfLines={1}>{r.product}</Text>
                      <Text style={st.lowLeft}>Only {Number(r.quantity)} left — reorder soon</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color="#c1c8d4" />
                  </View>
                </Press>
              ))}
            </View>
          </>)}
          {sales.length > 0 && (<>
            <Text style={[st.secTitle2, { paddingHorizontal: 4 }]}>Recent activity</Text>
            <View style={st.lowCard}>
              {sales.map((s, i) => (
                <Press key={s.id} onPress={() => openPage("orders")} to={0.98}>
                  <View style={[st.lowRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                    <View style={[st.moreIc, { backgroundColor: s.status === "COMPLETED" ? C.greenBg : C.redBg }]}>
                      <Feather name={s.status === "COMPLETED" ? "check-circle" : "x-circle"} size={15} color={s.status === "COMPLETED" ? C.green : C.red} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.lowName}>{s.status === "COMPLETED" ? "Sale completed" : "Sale voided"} · {money(s.total_amount)} {CUR}</Text>
                      <Text style={st.rcQty}>#{s.invoice_number} · {timeAgo(s.created_at)}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color="#c1c8d4" />
                  </View>
                </Press>
              ))}
            </View>
          </>)}
        </ScrollView>
      )}
    </Slide>
  );
}
/* ---------------- Orders / Customers / Inventory / Categories / Settings ---------------- */
function StatusPill({ status }) {
  const ok = status === "COMPLETED";
  return (
    <View style={{ backgroundColor: ok ? C.greenBg : C.redBg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text style={{ color: ok ? C.green : C.red, fontWeight: "800", fontSize: 10.5 }}>{ok ? "Completed" : status === "VOID" ? "Refunded" : String(status || "").toLowerCase()}</Text>
    </View>
  );
}
function SaleDetailPage({ sale, company, onBack }) {
  const dt = String(sale.created_at || "").slice(0, 16).replace("T", "  ");
  const items = Array.isArray(sale.items) ? sale.items : [];
  const payments = Array.isArray(sale.payments) ? sale.payments : [];
  return (
    <Slide>
      <Header title={"#" + sale.invoice_number} onBack={onBack} right={<StatusPill status={sale.status} />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30, width: "100%", maxWidth: 560, alignSelf: "center" }}>
        <View style={st.receiptCard}>
          <View style={{ alignItems: "center" }}>
            <View style={[st.rcLogo, company?.logo && { overflow: "hidden" }]}>{company?.logo ? <Image source={{ uri: company.logo }} style={{ width: "100%", height: "100%" }} /> : <Feather name="shopping-bag" size={18} color={C.blue} />}</View>
            <Text style={st.rcStoreBig}>{company?.name || "My Store"}</Text>
            <Text style={st.rcMuted}>{dt}</Text>
          </View>
          <View style={st.rcDivider} />
          {items.map((i) => (
            <View key={i.id} style={{ marginBottom: 7 }}>
              <View style={st.trow}>
                <Text style={st.rcItem} numberOfLines={1}>{i.product_name}</Text>
                <Text style={st.rcItemV}>{money(i.line_total)}</Text>
              </View>
              <Text style={st.rcQty}>{Number(i.quantity)} × {money(i.unit_price)} {CUR}</Text>
            </View>
          ))}
          <View style={st.rcDivider} />
          <View style={st.trow}><Text style={st.trowL}>Subtotal</Text><Text style={st.trowV}>{money(sale.subtotal)} {CUR}</Text></View>
          {Number(sale.discount_amount) > 0 && <View style={st.trow}><Text style={st.trowL}>Discount</Text><Text style={[st.trowV, { color: C.green }]}>− {money(sale.discount_amount)} {CUR}</Text></View>}
          <View style={st.trow}><Text style={st.trowL}>Tax</Text><Text style={st.trowV}>{money(sale.tax_amount)} {CUR}</Text></View>
          <View style={st.rcTotalBox}>
            <Text style={st.trowTotalL}>Total</Text>
            <Text style={st.trowTotalV}>{money(sale.total_amount)} {CUR}</Text>
          </View>
          {payments.map((p) => (
            <View key={p.id} style={[st.trow, { marginTop: 6 }]}>
              <Text style={st.rcMuted}>Paid by {p.method}</Text>
              <Text style={st.rcMeta}>{money(p.amount)} {CUR}</Text>
            </View>
          ))}
          <View style={{ marginTop: 14 }}>
            <Barcode seed={sale.invoice_number} />
            <Text style={st.rcInv}>{sale.invoice_number}</Text>
          </View>
        </View>
      </ScrollView>
    </Slide>
  );
}
function OrdersPage({ onBack, company }) {
  const [rows, setRows] = useState([]); const [f, setF] = useState("All"); const [busy, setBusy] = useState(true);
  const [sel, setSel] = useState(null);
  useEffect(() => { api("/sales/sales/").then((d) => setRows(listOf(d))).catch(() => {}).finally(() => setBusy(false)); }, []);
  const shown = rows.filter((r) => f === "All" || (f === "Completed" ? r.status === "COMPLETED" : f === "Refunded" ? r.status === "VOID" : r.status !== "COMPLETED" && r.status !== "VOID"));
  return (
    <Slide>
      <Header title="Orders" onBack={onBack} />
      <View style={{ flexDirection: "row", gap: 8, padding: 12, paddingBottom: 6 }}>
        {["All", "Completed", "Pending", "Refunded"].map((k) => (
          <Press key={k} onPress={() => setF(k)}><View style={[st.catChip, f === k && st.catChipOn]}><Text style={[st.catChipT, f === k && { color: "#fff" }]}>{k}</Text></View></Press>
        ))}
      </View>
      {busy ? <View style={st.fill}><ActivityIndicator color={C.blue} /></View> : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 26 }}>
          <View style={st.lowCard}>
            {shown.map((r, i) => (
              <Press key={r.id} onPress={() => setSel(r)} to={0.98}>
                <View style={[st.lowRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.lowName}>#{r.invoice_number}</Text>
                    <Text style={st.rcQty}>{String(r.created_at || "").slice(0, 16).replace("T", ", ")} · {(r.items || []).length} item{(r.items || []).length === 1 ? "" : "s"}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={st.receiptTotal}>{money(r.total_amount)} {CUR}</Text>
                    <StatusPill status={r.status} />
                  </View>
                  <Feather name="chevron-right" size={18} color="#c1c8d4" />
                </View>
              </Press>
            ))}
            {!shown.length && <Text style={st.empty}>No orders yet</Text>}
          </View>
        </ScrollView>
      )}
      {sel && <SaleDetailPage sale={sel} company={company} onBack={() => setSel(null)} />}
    </Slide>
  );
}
function CustomersPage({ onBack }) {
  const [rows, setRows] = useState([]); const [q, setQ] = useState(""); const [busy, setBusy] = useState(true); const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", email: "" });
  const [stats, setStats] = useState({});
  const load = () => api("/customers/customers/").then((d) => setRows(listOf(d))).catch(() => {});
  useEffect(() => {
    load().finally(() => setBusy(false));
    api("/sales/sales/").then((d) => {
      const m = {};
      for (const s of listOf(d)) if (s.customer && s.status === "COMPLETED") {
        m[s.customer] = m[s.customer] || { n: 0, total: 0 };
        m[s.customer].n += 1; m[s.customer].total += Number(s.total_amount || 0);
      }
      setStats(m);
    }).catch(() => {});
  }, []);
  async function create() {
    if (!f.name.trim()) return;
    try { await api("/customers/customers/", { method: "POST", body: JSON.stringify(f) }); setF({ name: "", phone: "", email: "" }); setAdding(false); load(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
    catch (e) { Alert.alert("Couldn't add customer", e.message); }
  }
  const shown = rows.filter((c) => !q || `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Slide>
      <Header title="Customers" onBack={onBack}
        right={<Press onPress={() => setAdding(!adding)} haptic><View style={st.addPill}><Feather name={adding ? "x" : "plus"} size={13} color="#fff" /><Text style={st.addPillT}>{adding ? "Close" : "Add"}</Text></View></Press>} />
      {adding && (
        <View style={{ padding: 12, gap: 8, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line }}>
          <TextInput style={st.formIn} placeholder="Full name" placeholderTextColor={C.sub} value={f.name} onChangeText={(v) => setF((s) => ({ ...s, name: v }))} />
          <TextInput style={st.formIn} placeholder="Phone (optional)" placeholderTextColor={C.sub} keyboardType="phone-pad" value={f.phone} onChangeText={(v) => setF((s) => ({ ...s, phone: v }))} />
          <TextInput style={st.formIn} placeholder="Email (optional)" placeholderTextColor={C.sub} autoCapitalize="none" keyboardType="email-address" value={f.email} onChangeText={(v) => setF((s) => ({ ...s, email: v }))} />
          <Press onPress={create} haptic><View style={[st.blueBtn, { marginTop: 2, paddingVertical: 12 }]}><Text style={st.blueBtnT}>Save Customer</Text></View></Press>
        </View>
      )}
      <View style={[st.searchRow, { paddingTop: 10 }]}>
        <View style={st.searchBox}><Feather name="search" size={16} color={C.sub} style={{ marginRight: 7 }} /><TextInput style={st.searchIn} placeholder="Search customers…" placeholderTextColor={C.sub} value={q} onChangeText={setQ} /></View>
      </View>
      {busy ? <View style={st.fill}><ActivityIndicator color={C.blue} /></View> : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 26 }}>
          <View style={st.lowCard}>
            {shown.map((c, i) => {
              const s = stats[c.id];
              return (
                <View key={c.id} style={[st.lowRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                  <View style={[st.pava, { width: 40, height: 40, borderRadius: 20, backgroundColor: avaColor(c.name) }]}><Text style={st.pavaT}>{initials(c.name)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.lowName}>{c.name}</Text>
                    {!!(c.email || c.phone) && <Text style={st.rcQty}>{c.email || c.phone}</Text>}
                  </View>
                  {s && (
                    <View style={{ alignItems: "flex-end", marginRight: 4 }}>
                      <Text style={st.rcQty}>{s.n} order{s.n === 1 ? "" : "s"}</Text>
                      <Text style={st.trowV}>{money(s.total)} {CUR}</Text>
                    </View>
                  )}
                  <Feather name="chevron-right" size={18} color="#c1c8d4" />
                </View>
              );
            })}
            {!shown.length && <Text style={st.empty}>No customers yet — tap Add</Text>}
          </View>
        </ScrollView>
      )}
    </Slide>
  );
}
function InventoryPage({ onBack }) {
  const [rows, setRows] = useState([]); const [f, setF] = useState("All"); const [busy, setBusy] = useState(true);
  useEffect(() => { api("/catalog/products/").then((d) => setRows(listOf(d))).catch(() => {}).finally(() => setBusy(false)); }, []);
  const stockOf = (p) => Number(p.stock_quantity ?? 0);
  const minOf = (p) => Number(p.minimum_stock ?? p.reorder_level ?? 0);
  const statusOf = (p) => (stockOf(p) <= 0 ? "Out of Stock" : stockOf(p) <= minOf(p) ? "Low Stock" : "In Stock");
  const shown = rows.filter((p) => f === "All" || statusOf(p) === f);
  const color = { "In Stock": [C.greenBg, C.green], "Low Stock": [C.orangeBg, C.orange], "Out of Stock": [C.redBg, C.red] };
  return (
    <Slide>
      <Header title="Inventory" onBack={onBack} />
      <View style={{ flexDirection: "row", gap: 8, padding: 12, paddingBottom: 6 }}>
        {["All", "Low Stock", "Out of Stock"].map((k) => (
          <Press key={k} onPress={() => setF(k)}><View style={[st.catChip, f === k && st.catChipOn]}><Text style={[st.catChipT, f === k && { color: "#fff" }]}>{k}</Text></View></Press>
        ))}
      </View>
      {busy ? <View style={st.fill}><ActivityIndicator color={C.blue} /></View> : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 26 }}>
          <View style={st.lowCard}>
            {shown.map((p, i) => {
              const s = statusOf(p); const [bg, fg] = color[s];
              return (
                <View key={p.id} style={[st.lowRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                  <ProductArt item={p} style={[st.pavaImg, { width: 40, height: 40 }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.lowName} numberOfLines={1}>{p.name}</Text>
                    <Text style={[st.rcQty, s !== "In Stock" && { color: fg, fontWeight: "700" }]}>{Number(stockOf(p))} left</Text>
                  </View>
                  <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                    <Text style={{ color: fg, fontWeight: "800", fontSize: 10.5 }}>{s}</Text>
                  </View>
                </View>
              );
            })}
            {!shown.length && <Text style={st.empty}>Nothing here</Text>}
          </View>
        </ScrollView>
      )}
    </Slide>
  );
}
const CAT_EMOJI = [["beverage", "🥤"], ["drink", "🥤"], ["grocery", "🛒"], ["food", "🍔"], ["snack", "🍿"], ["dairy", "🥛"], ["bakery", "🥐"], ["apparel", "👕"], ["electronic", "📱"], ["home", "🏠"], ["beauty", "💄"]];
function CategoriesPage({ onBack }) {
  const [cats, setCats] = useState([]); const [products, setProducts] = useState([]); const [busy, setBusy] = useState(true);
  const [adding, setAdding] = useState(false); const [name, setName] = useState(""); const [sel, setSel] = useState(null);
  const load = () => Promise.all([
    api("/catalog/categories/").then((d) => setCats(listOf(d))).catch(() => {}),
    api("/catalog/products/").then((d) => setProducts(listOf(d))).catch(() => {}),
  ]);
  useEffect(() => { load().finally(() => setBusy(false)); }, []);
  async function create() {
    if (!name.trim()) return;
    try { await api("/catalog/categories/", { method: "POST", body: JSON.stringify({ name: name.trim() }) }); setName(""); setAdding(false); load(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
    catch (e) { Alert.alert("Couldn't add category", e.message); }
  }
  const countFor = (name) => products.filter((p) => p.category_name === name).length;
  const emojiFor = (name) => { const s = String(name || "").toLowerCase(); const hit = CAT_EMOJI.find(([k]) => s.includes(k)); return hit ? hit[1] : "🏷️"; };
  return (
    <Slide>
      <Header title="Categories" onBack={onBack}
        right={<Press onPress={() => setAdding(!adding)} haptic><View style={st.addPill}><Feather name={adding ? "x" : "plus"} size={13} color="#fff" /><Text style={st.addPillT}>{adding ? "Close" : "Add"}</Text></View></Press>} />
      {adding && (
        <View style={{ padding: 12, gap: 8, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line }}>
          <TextInput style={st.formIn} placeholder="Category name (e.g. Beverages)" placeholderTextColor={C.sub} value={name} onChangeText={setName} />
          <Press onPress={create} haptic><View style={[st.blueBtn, { marginTop: 2, paddingVertical: 12 }]}><Text style={st.blueBtnT}>Save Category</Text></View></Press>
        </View>
      )}
      {busy ? <View style={st.fill}><ActivityIndicator color={C.blue} /></View> : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 26 }}>
          <View style={st.lowCard}>
            {cats.map((c, i) => (
              <Press key={c.id} onPress={() => setSel(c)} to={0.98}>
                <View style={[st.lowRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                  <View style={[st.pava, { width: 40, height: 40, backgroundColor: avaColor(c.name) + "22" }]}><Text style={{ fontSize: 18 }}>{emojiFor(c.name)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.lowName}>{c.name}</Text>
                    <Text style={st.rcQty}>{countFor(c.name)} product{countFor(c.name) === 1 ? "" : "s"}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#c1c8d4" />
                </View>
              </Press>
            ))}
            {!cats.length && <Text style={st.empty}>No categories yet</Text>}
          </View>
        </ScrollView>
      )}
      {sel && (
        <Slide>
          <Header title={sel.name} onBack={() => setSel(null)} />
          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 26 }}>
            <View style={st.lowCard}>
              {products.filter((p) => p.category_name === sel.name).map((p, i) => (
                <View key={p.id} style={[st.lowRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                  <ProductArt item={p} style={[st.pavaImg, { width: 40, height: 40 }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.lowName} numberOfLines={1}>{p.name}</Text>
                    <Text style={st.rcQty}>{p.sku} · {Number(p.stock_quantity ?? 0)} in stock</Text>
                  </View>
                  <Text style={st.trowV}>{money(p.selling_price)} {CUR}</Text>
                </View>
              ))}
              {!products.filter((p) => p.category_name === sel.name).length && <Text style={st.empty}>No products in this category yet</Text>}
            </View>
          </ScrollView>
        </Slide>
      )}
    </Slide>
  );
}
function Toggle({ value, onChange }) {
  return (
    <Press onPress={() => onChange(!value)} haptic to={0.9}>
      <View style={[st.toggle, value && { backgroundColor: C.blue }]}>
        <View style={[st.toggleDot, value && { alignSelf: "flex-end" }]} />
      </View>
    </Press>
  );
}
function SubHead({ title, onBack }) { return <Header title={title} onBack={onBack} />; }
function SettingsPage({ me, company, setCompany, onBack }) {
  const [registers, setRegisters] = useState([]); const [session, setSession] = useState(null);
  const [sub, setSub] = useState(null);
  const [closing, setClosing] = useState(false); const [closeCash, setCloseCash] = useState("0");
  const load = () => Promise.all([
    api("/registers/registers/").then((d) => setRegisters(listOf(d))).catch(() => {}),
    api("/registers/sessions/").then((d) => setSession(listOf(d).find((x) => String(x.status).toUpperCase() === "OPEN") || null)).catch(() => {}),
  ]);
  useEffect(() => { load(); }, []);
  async function openReg(regId, opening) {
    try { await api("/registers/sessions/open/", { method: "POST", body: JSON.stringify({ register_id: regId, opening_cash: opening || "0" }) }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); load(); }
    catch (e) { Alert.alert("Couldn't open register", e.message); }
  }
  async function closeReg() {
    try {
      const d = await api(`/registers/sessions/${session.id}/close/`, { method: "POST", body: JSON.stringify({ closing_cash: closeCash || "0" }) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setClosing(false); setCloseCash("0"); load();
      Alert.alert("Register closed", `Expected cash: ${money(d.expected_cash)} ${CUR}\nCounted: ${money(d.closing_cash)} ${CUR}\nDifference: ${money(d.difference)} ${CUR}`);
    } catch (e) { Alert.alert("Couldn't close register", e.message); }
  }
  const rows = [
    ["Store Profile", "shopping-bag", "profile"],
    ["Payment Methods", "credit-card", "payments"],
    ["Receipt Settings", "file-text", "receipt"],
    ["Users & Staff", "users", "staff"],
    ["App Preferences", "sliders", "prefs"],
    ["Help & Support", "help-circle", "help"],
  ];
  return (
    <Slide>
      <Header title="Settings" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 26 }}>
        <View style={st.lowCard}>
          <View style={st.lowRow}>
            <View style={[st.moreIc, { backgroundColor: session ? C.greenBg : C.orangeBg }]}>
              <Feather name="hard-drive" size={15} color={session ? C.green : C.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.lowName}>Register</Text>
              <Text style={st.rcQty}>{session ? `Open · ${registers.find((r) => r.id === session.register)?.name || "Register"}` : "Closed"}</Text>
            </View>
            <View style={[st.regPill, !session && { backgroundColor: C.orangeBg }]}>
              {session && <View style={st.regDot} />}
              <Text style={[st.regPillT, !session && { color: C.orange }]}>{session ? "open" : "closed"}</Text>
            </View>
          </View>
          {!session && <View style={{ paddingBottom: 12 }}><OpenRegister registers={registers} onOpen={openReg} inline /></View>}
          {session && !closing && (
            <View style={{ paddingBottom: 12, paddingHorizontal: 2 }}>
              <Press onPress={() => setClosing(true)} haptic to={0.97}>
                <View style={[st.ghostBtn, st.btnRow, { marginTop: 4, paddingVertical: 11 }]}><Feather name="lock" size={14} color={C.ink} /><Text style={[st.ghostBtnT, { fontSize: 13.5 }]}>Close register (end of day)</Text></View>
              </Press>
            </View>
          )}
          {session && closing && (
            <View style={{ paddingBottom: 12, gap: 8 }}>
              <Text style={st.fieldLbl2}>CASH COUNTED IN DRAWER</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput style={[st.formIn, { flex: 1 }]} keyboardType="numeric" value={closeCash} onChangeText={setCloseCash} placeholder="0.00" placeholderTextColor={C.sub} />
                <Press onPress={closeReg} haptic><View style={[st.openBtn, { backgroundColor: C.red }]}><Text style={st.openBtnT}>Close</Text></View></Press>
                <Press onPress={() => setClosing(false)}><View style={[st.openBtn, { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line }]}><Text style={[st.openBtnT, { color: C.ink }]}>Cancel</Text></View></Press>
              </View>
            </View>
          )}
        </View>
        <View style={[st.lowCard, { marginTop: 12 }]}>
          {rows.map(([t, ic, key], i) => (
            <Press key={t} onPress={() => setSub(key)} to={0.98}>
              <View style={[st.lowRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                <View style={st.moreIc}><Feather name={ic} size={15} color={C.blue} /></View>
                <Text style={[st.lowName, { flex: 1 }]}>{t}</Text>
                <Feather name="chevron-right" size={18} color="#c1c8d4" />
              </View>
            </Press>
          ))}
        </View>
      </ScrollView>
      {sub === "profile" && <StoreProfilePage company={company} setCompany={setCompany} onBack={() => setSub(null)} />}
      {sub === "payments" && <PaymentMethodsPage onBack={() => setSub(null)} />}
      {sub === "receipt" && <ReceiptSettingsPage onBack={() => setSub(null)} />}
      {sub === "staff" && <StaffPage me={me} onBack={() => setSub(null)} />}
      {sub === "prefs" && <PrefsPage onBack={() => setSub(null)} />}
      {sub === "help" && <HelpPage onBack={() => setSub(null)} />}
    </Slide>
  );
}
function StoreProfilePage({ company, setCompany, onBack }) {
  const [name, setName] = useState(company?.name || ""); const [cur, setCur] = useState(CUR); const [busy, setBusy] = useState(false);
  const [logo, setLogo] = useState(null); // newly picked image asset
  async function pickLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Photos", "Allow photo access to set your store logo.");
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets?.[0]) setLogo(res.assets[0]);
  }
  async function save() {
    if (!name.trim() || !company?.id) return;
    setBusy(true);
    try {
      const body = { name: name.trim(), currency: cur };
      if (logo && isLocal()) body.logo = logo.uri;
      let d = await api(`/stores/companies/${company.id}/`, { method: "PATCH", body: JSON.stringify(body) });
      if (logo && !isLocal()) {
        const fd = new FormData();
        const fn = (logo.fileName || "logo.jpg").replace(/[^\w.\-]/g, "_");
        fd.append("logo", { uri: logo.uri, name: fn, type: logo.mimeType || "image/jpeg" });
        try { d = await apiUpload(`/stores/companies/${company.id}/`, "PATCH", fd); }
        catch (e) { Alert.alert("Logo upload", "Profile saved, but the logo failed: " + e.message); }
      }
      setCompany && setCompany(d); CUR = d.currency || cur; store.set("cur", CUR);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Store profile updated."); onBack();
    } catch (e) { Alert.alert("Couldn't save", e.message); } finally { setBusy(false); }
  }
  return (
    <Slide>
      <SubHead title="Store Profile" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Text style={st.fieldLbl2}>STORE LOGO</Text>
        <Press onPress={pickLogo} to={0.98}>
          <View style={{ width: 86, height: 86, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 4 }}>
            {logo ? <Image source={{ uri: logo.uri }} style={{ width: "100%", height: "100%" }} />
              : company?.logo ? <Image source={{ uri: company.logo }} style={{ width: "100%", height: "100%" }} />
              : <Feather name="image" size={22} color={C.sub} />}
          </View>
        </Press>
        <Text style={[st.rcMeta, { marginBottom: 12 }]}>Tap to change — shown on your dashboard and receipts.</Text>
        <Text style={st.fieldLbl2}>STORE NAME</Text>
        <TextInput style={st.formIn} value={name} onChangeText={setName} placeholder="Store name" placeholderTextColor={C.sub} />
        <Text style={[st.fieldLbl2, { marginTop: 14 }]}>CURRENCY</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CURRENCIES.map((c) => (
            <Press key={c} onPress={() => setCur(c)}><View style={[st.catChip, cur === c && st.catChipOn]}><Text style={[st.catChipT, cur === c && { color: "#fff" }]}>{c}</Text></View></Press>
          ))}
        </View>
        <Text style={[st.fieldLbl2, { marginTop: 14 }]}>STORE DATA</Text>
        <Text style={st.rcMeta}>{isLocal() ? "Stored on this phone (offline)" : BASE.replace("/api/v1", "")}</Text>
        <Press onPress={busy ? undefined : save} haptic><View style={[st.blueBtn, busy && { opacity: 0.6 }]}><Text style={st.blueBtnT}>{busy ? "Saving…" : "Save Changes"}</Text></View></Press>
      </ScrollView>
    </Slide>
  );
}
function PaymentMethodsPage({ onBack }) {
  const [enabled, setEnabled] = useState(null);
  useEffect(() => { store.get("paymethods").then((v) => setEnabled(v ? JSON.parse(v) : METHODS.map(([m]) => m))); }, []);
  const flip = (m) => {
    const next = enabled.includes(m) ? enabled.filter((x) => x !== m) : [...enabled, m];
    if (!next.length) return Alert.alert("Payment Methods", "At least one method must stay enabled.");
    setEnabled(next); store.set("paymethods", JSON.stringify(next));
  };
  if (!enabled) return <Slide><SubHead title="Payment Methods" onBack={onBack} /><View style={st.fill}><ActivityIndicator color={C.blue} /></View></Slide>;
  return (
    <Slide>
      <SubHead title="Payment Methods" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        <View style={st.lowCard}>
          {METHODS.map(([m, label, ic], i) => (
            <View key={m} style={[st.lowRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
              <View style={st.moreIc}><Ionicons name={ic} size={15} color={C.blue} /></View>
              <Text style={[st.lowName, { flex: 1 }]}>{label}</Text>
              <Toggle value={enabled.includes(m)} onChange={() => flip(m)} />
            </View>
          ))}
        </View>
        <Text style={[st.rcQty, { textAlign: "center", marginTop: 10 }]}>Disabled methods are hidden on the payment screen.</Text>
      </ScrollView>
    </Slide>
  );
}
function ReceiptSettingsPage({ onBack }) {
  const [footer, setFooter] = useState(""); const [barcode, setBarcode] = useState(true); const [loaded, setLoaded] = useState(false);
  useEffect(() => { Promise.all([store.get("rc_footer"), store.get("rc_barcode")]).then(([f, b]) => { setFooter(f || "Thank you! Visit us again!"); setBarcode(b !== "0"); setLoaded(true); }); }, []);
  function save() {
    store.set("rc_footer", footer); store.set("rc_barcode", barcode ? "1" : "0");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", "Receipt settings updated."); onBack();
  }
  if (!loaded) return <Slide><SubHead title="Receipt Settings" onBack={onBack} /><View style={st.fill}><ActivityIndicator color={C.blue} /></View></Slide>;
  return (
    <Slide>
      <SubHead title="Receipt Settings" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Text style={st.fieldLbl2}>FOOTER MESSAGE</Text>
        <TextInput style={st.formIn} value={footer} onChangeText={setFooter} placeholder="Thank you! Visit us again!" placeholderTextColor={C.sub} />
        <View style={[st.lowCard, { marginTop: 14 }]}>
          <View style={st.lowRow}>
            <View style={st.moreIc}><Feather name="align-justify" size={15} color={C.blue} /></View>
            <Text style={[st.lowName, { flex: 1 }]}>Show barcode on receipt</Text>
            <Toggle value={barcode} onChange={setBarcode} />
          </View>
        </View>
        <Press onPress={save} haptic><View style={st.blueBtn}><Text style={st.blueBtnT}>Save Settings</Text></View></Press>
      </ScrollView>
    </Slide>
  );
}
function StaffPage({ me, onBack }) {
  const [rows, setRows] = useState([]); const [busy, setBusy] = useState(true);
  useEffect(() => { api("/auth/users/").then((d) => setRows(listOf(d))).catch(() => {}).finally(() => setBusy(false)); }, []);
  return (
    <Slide>
      <SubHead title="Users & Staff" onBack={onBack} />
      {busy ? <View style={st.fill}><ActivityIndicator color={C.blue} /></View> : (
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          <View style={st.lowCard}>
            {rows.map((u, i) => (
              <View key={u.id} style={[st.lowRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                <View style={[st.pava, { width: 38, height: 38, borderRadius: 19, backgroundColor: avaColor(u.username) }]}><Text style={st.pavaT}>{initials(u.username)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.lowName}>{u.username}{u.id === me?.id ? "  (you)" : ""}</Text>
                  <Text style={st.rcQty}>{u.role || "STAFF"}</Text>
                </View>
                <View style={{ backgroundColor: u.is_active !== false ? C.greenBg : C.redBg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                  <Text style={{ color: u.is_active !== false ? C.green : C.red, fontWeight: "800", fontSize: 10.5 }}>{u.is_active !== false ? "Active" : "Inactive"}</Text>
                </View>
              </View>
            ))}
            {!rows.length && <Text style={st.empty}>Only admins can view staff</Text>}
          </View>
          <Text style={[st.rcQty, { textAlign: "center", marginTop: 10 }]}>Add or edit staff from the desktop or web app.</Text>
        </ScrollView>
      )}
    </Slide>
  );
}
function PrefsPage({ onBack }) {
  const [haptic, setHaptic] = useState(true);
  useEffect(() => { store.get("haptics_off").then((v) => setHaptic(v !== "1")); }, []);
  const flip = (v) => { setHaptic(v); store.set("haptics_off", v ? "0" : "1"); HAPTIC.on = v; };
  return (
    <Slide>
      <SubHead title="App Preferences" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        <View style={st.lowCard}>
          <View style={st.lowRow}>
            <View style={st.moreIc}><Feather name="smartphone" size={15} color={C.blue} /></View>
            <Text style={[st.lowName, { flex: 1 }]}>Haptic feedback</Text>
            <Toggle value={haptic} onChange={flip} />
          </View>
          <View style={[st.lowRow, { borderTopWidth: 1, borderTopColor: C.line }]}>
            <View style={st.moreIc}><Feather name="info" size={15} color={C.blue} /></View>
            <Text style={[st.lowName, { flex: 1 }]}>Version</Text>
            <Text style={st.trowV}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </Slide>
  );
}
function HelpPage({ onBack }) {
  const steps = [
    ["shopping-cart", "Make a sale", "Open a register on the Products tab, tap items (or scan barcodes), review the cart, choose a payment method and confirm."],
    ["file-text", "Receipts", "After each sale you can print, email or share the receipt. Past sales live in More → Orders."],
    ["users", "Customers", "Attach a customer to a sale from the cart, or manage them in More → Customers."],
    ["bar-chart-2", "Reports", "The Sales tab shows today's revenue, hourly trend and top sellers. Pull down to refresh."],
    ["wifi", "Connection", "Your phone must reach the S POS server — same Wi-Fi as the shop PC, or your store website address."],
  ];
  return (
    <Slide>
      <SubHead title="Help & Support" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 26 }}>
        <View style={st.lowCard}>
          {steps.map(([ic, t, d], i) => (
            <View key={t} style={[st.lowRow, { alignItems: "flex-start" }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
              <View style={st.moreIc}><Feather name={ic} size={15} color={C.blue} /></View>
              <View style={{ flex: 1 }}>
                <Text style={st.lowName}>{t}</Text>
                <Text style={[st.rcQty, { lineHeight: 17, marginTop: 2 }]}>{d}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={st.credit}>© S POS · Developed by Sridhar Mahalingam</Text>
      </ScrollView>
    </Slide>
  );
}

/* ---------------- styles ---------------- */
const PT = Platform.OS === "android" ? RNStatusBar.currentHeight || 0 : 0;
const st = StyleSheet.create({
  fill: { flex: 1, justifyContent: "center", alignItems: "center" },
  splashT: { fontSize: 40, fontWeight: "900", color: C.ink, letterSpacing: -1 },
  /* onboarding */
  onboardScroll: { padding: 24, paddingTop: PT + 70, paddingBottom: 40, flexGrow: 1, justifyContent: "center" },
  obLogo: { width: 60, height: 60, borderRadius: 19, backgroundColor: C.blue, alignItems: "center", justifyContent: "center", marginBottom: 10, shadowColor: C.blue, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { height: 7, width: 0 }, elevation: 8 },
  obCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 18, marginTop: 18 },
  obField: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 13 },
  obFieldIn: { flex: 1, paddingVertical: 13, fontSize: 15, color: C.ink },
  brand: { color: C.ink, fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  onTitle: { color: C.ink, fontSize: 26, fontWeight: "900", marginTop: 16, letterSpacing: -0.7, textAlign: "center" },
  onSub: { color: C.sub, fontSize: 14.5, marginTop: 6, lineHeight: 20, textAlign: "center" },
  fieldLbl: { color: C.sub, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginBottom: 7 },
  fieldIn: { backgroundColor: C.card, borderRadius: 13, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: C.ink, borderWidth: 1, borderColor: C.line },
  bigBtn: { backgroundColor: C.blue, borderRadius: 13, paddingVertical: 15, alignItems: "center", marginTop: 20, flexDirection: "row", justifyContent: "center", gap: 8 },
  bigBtnT: { color: "#fff", fontWeight: "800", fontSize: 16 },
  errT: { color: C.red, marginTop: 12, fontSize: 13, fontWeight: "600" },
  credit: { color: "#9aa4b2", textAlign: "center", marginTop: 26, fontSize: 12 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap" },
  chip: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.blue, borderColor: C.blue },
  chipT: { color: C.ink, fontWeight: "800", fontSize: 13 },
  check: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: "#c6cede", marginRight: 10, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: C.blue, borderColor: C.blue },
  checkT: { color: C.ink, fontWeight: "600", fontSize: 14 },
  /* nav + headers */
  tabbar: { flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line, paddingBottom: Platform.OS === "ios" ? 22 : 8, paddingTop: 8 },
  tab: { flex: 1, alignItems: "center", gap: 3 },
  tabIc: { fontSize: 19, color: "#9aa4b2" },
  tabT: { fontSize: 11, fontWeight: "700", color: "#9aa4b2" },
  tabIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.blue },
  viewAll: { color: C.blue, fontWeight: "800", fontSize: 12.5, paddingRight: 18 },
  btnRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  moreIc: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.blueBg, alignItems: "center", justifyContent: "center" },
  pageHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: PT + 10, paddingBottom: 10, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line },
  pageTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "800", color: C.ink },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  backT: { fontSize: 25, fontWeight: "700", color: C.ink, marginTop: -3 },
  clearT: { color: C.red, fontWeight: "800", fontSize: 14 },
  /* home */
  homeHead: { flexDirection: "row", paddingHorizontal: 18, paddingTop: PT + 18, paddingBottom: 6 },
  storeDot: { width: 22, height: 22, borderRadius: 7, backgroundColor: C.blueBg, alignItems: "center", justifyContent: "center" },
  storeNameSm: { color: C.sub, fontWeight: "800", fontSize: 13 },
  greetT: { color: C.ink, fontSize: 26, fontWeight: "900", letterSpacing: -0.6, marginTop: 10, lineHeight: 31 },
  greetSub: { color: C.sub, fontSize: 13.5, marginTop: 5 },
  todayChip: { backgroundColor: C.card, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: C.line, alignSelf: "flex-start", marginTop: 4 },
  todayChipT: { fontWeight: "800", color: C.ink, fontSize: 13 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 12, gap: 0 },
  statCard: { borderRadius: 16, padding: 14, marginBottom: 12 },
  statTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statLbl: { fontSize: 13, fontWeight: "800" },
  statIcWrap: { width: 30, height: 30, borderRadius: 9, backgroundColor: "#ffffffbb", alignItems: "center", justifyContent: "center" },
  statVal: { color: C.ink, fontSize: 20, fontWeight: "900", marginTop: 8, letterSpacing: -0.5 },
  secTitle: { color: C.ink, fontSize: 16, fontWeight: "900", paddingHorizontal: 18, marginTop: 6 },
  secTitle2: { color: C.ink, fontSize: 16, fontWeight: "900", paddingHorizontal: 18, marginTop: 14, marginBottom: 8 },
  secRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 18, marginTop: 4 },
  qaGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 10 },
  qaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.card, borderRadius: 13, paddingVertical: 14, borderWidth: 1, borderColor: C.line, marginBottom: 10 },
  qaT: { fontWeight: "800", color: C.ink, fontSize: 14 },
  lowCount: { color: C.red, fontWeight: "800", fontSize: 12, backgroundColor: C.redBg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  lowCard: { backgroundColor: C.card, borderRadius: 16, marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12 },
  lowRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11 },
  lowName: { color: C.ink, fontWeight: "700", fontSize: 14 },
  lowLeft: { color: C.red, fontSize: 12, fontWeight: "700", marginTop: 1 },
  lowArrow: { color: "#c1c8d4", fontSize: 20, fontWeight: "600" },
  /* products */
  prodHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: PT + 16, paddingBottom: 8 },
  prodTitle: { fontSize: 24, fontWeight: "900", color: C.ink, letterSpacing: -0.6 },
  regPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.greenBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  regDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  regPillT: { fontSize: 11.5, fontWeight: "800", color: C.green },
  searchRow: { flexDirection: "row", gap: 9, paddingHorizontal: 14, paddingBottom: 10 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: C.line },
  searchIc: { fontSize: 17, color: C.sub, marginRight: 6 },
  searchIn: { flex: 1, paddingVertical: 11, fontSize: 14.5, color: C.ink },
  scanBtn: { width: 44, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  catChip: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, borderColor: C.line },
  catChipOn: { backgroundColor: C.blue, borderColor: C.blue },
  catChipT: { color: C.ink, fontWeight: "700", fontSize: 13 },
  errBanner: { backgroundColor: C.redBg, marginHorizontal: 14, marginBottom: 8, borderRadius: 10, padding: 11 },
  errBannerT: { color: C.red, fontWeight: "700", fontSize: 13, textAlign: "center" },
  gcard: { backgroundColor: C.card, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: C.line },
  gImg: { height: 74, width: "100%", borderRadius: 10, marginBottom: 7, overflow: "hidden" },
  gName: { color: C.ink, fontWeight: "700", fontSize: 12.5 },
  gPrice: { color: C.ink, fontWeight: "900", fontSize: 12.5, marginTop: 2 },
  gBadge: { position: "absolute", top: -6, right: -6, minWidth: 21, height: 21, borderRadius: 11, backgroundColor: C.blue, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, zIndex: 2, borderWidth: 2, borderColor: C.bg },
  gBadgeT: { color: "#fff", fontWeight: "900", fontSize: 10.5 },
  empty: { textAlign: "center", color: C.sub, padding: 40 },
  /* review bar */
  reviewWrap: { position: "absolute", left: 14, right: 14, bottom: 12 },
  reviewBar: { flexDirection: "row", alignItems: "center", backgroundColor: C.blue, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, gap: 10, shadowColor: C.blue, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { height: 6, width: 0 }, elevation: 8 },
  reviewCount: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: "#ffffff33", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  reviewCountT: { color: "#fff", fontWeight: "900", fontSize: 12 },
  reviewT: { flex: 1, color: "#fff", fontWeight: "800", fontSize: 16 },
  reviewTotal: { color: "#fff", fontWeight: "900", fontSize: 16 },
  /* register */
  openCard: { backgroundColor: C.card, marginHorizontal: 14, marginBottom: 10, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: C.line },
  openTitle: { fontWeight: "800", color: C.ink, fontSize: 14.5 },
  rchip: { backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 9, marginRight: 8, borderWidth: 1, borderColor: C.line },
  rchipOn: { backgroundColor: C.blue, borderColor: C.blue },
  rchipT: { color: C.ink, fontWeight: "800", fontSize: 13 },
  cashIn: { flex: 1, backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 13, color: C.ink, borderWidth: 1, borderColor: C.line },
  openBtn: { backgroundColor: C.blue, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  openBtnT: { color: "#fff", fontWeight: "800", fontSize: 13.5 },
  /* cart */
  hint: { textAlign: "center", color: C.sub, fontSize: 12, paddingVertical: 8 },
  swipeUnder: { ...StyleSheet.absoluteFillObject, backgroundColor: C.red, alignItems: "flex-end", justifyContent: "center", paddingRight: 22 },
  swipeUnderT: { color: "#fff", fontWeight: "900" },
  cartRow: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  pava: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pavaT: { fontWeight: "900", fontSize: 13, color: "#fff" },
  pavaImg: { width: 42, height: 42, borderRadius: 12, overflow: "hidden" },
  cartName: { color: C.ink, fontWeight: "800", fontSize: 14 },
  cartMeta: { color: C.sub, fontSize: 12, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: { width: 28, height: 28, borderRadius: 9, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  stepT: { color: C.ink, fontWeight: "900", fontSize: 15, marginTop: -1 },
  stepN: { minWidth: 18, textAlign: "center", fontWeight: "800", color: C.ink, fontSize: 14 },
  cartLineTotal: { minWidth: 58, textAlign: "right", fontWeight: "900", color: C.ink, fontSize: 13.5 },
  totalsCard: { backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line, padding: 16, paddingBottom: Platform.OS === "ios" ? 28 : 16 },
  trow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 3 },
  trowL: { color: C.sub, fontSize: 14, fontWeight: "600" },
  trowV: { color: C.ink, fontSize: 14, fontWeight: "800" },
  trowTotal: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, marginTop: 5 },
  trowTotalL: { color: C.ink, fontSize: 16.5, fontWeight: "900" },
  trowTotalV: { color: C.ink, fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  blueBtn: { backgroundColor: C.blue, borderRadius: 13, paddingVertical: 15, alignItems: "center", marginTop: 12 },
  blueBtnT: { color: "#fff", fontWeight: "900", fontSize: 15.5 },
  ghostBtn: { backgroundColor: C.card, borderRadius: 13, paddingVertical: 15, alignItems: "center", marginTop: 12, borderWidth: 1, borderColor: C.line },
  ghostBtnT: { color: C.ink, fontWeight: "800", fontSize: 15 },
  /* cart option rows */
  optRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 13, paddingVertical: 12 },
  optIc: { fontSize: 15 },
  optT: { flex: 1, color: C.sub, fontWeight: "700", fontSize: 13.5 },
  optArrow: { color: "#c1c8d4", fontSize: 20, fontWeight: "600" },
  dpChip: { backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: C.line },
  dpChipOn: { backgroundColor: C.blue, borderColor: C.blue },
  dpChipT: { color: C.ink, fontWeight: "800", fontSize: 12 },
  /* payment */
  paySection: { marginTop: 4, paddingHorizontal: 16 },
  paySectionT: { color: C.ink, fontWeight: "900", fontSize: 15, marginBottom: 8 },
  payGraphic: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, alignItems: "center", paddingVertical: 22, paddingHorizontal: 20, gap: 8 },
  brandBadge: { backgroundColor: C.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.line },
  brandBadgeT: { fontWeight: "900", fontSize: 10, color: C.sub, letterSpacing: 0.5 },
  payLbl: { color: C.sub, fontSize: 13, fontWeight: "700" },
  payTotal: { color: C.ink, fontSize: 38, fontWeight: "900", letterSpacing: -1.2, marginTop: 4 },
  payCur: { fontSize: 19, color: C.sub, fontWeight: "800" },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 18 },
  methodTile: { backgroundColor: C.card, borderRadius: 14, paddingVertical: 17, alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: C.line, marginBottom: 11 },
  methodTileOn: { borderColor: C.blue, backgroundColor: C.blueBg },
  methodT: { color: C.ink, fontWeight: "800", fontSize: 13.5 },
  methodInfo: { alignItems: "center", gap: 8, marginTop: 8, paddingHorizontal: 40 },
  methodInfoT: { color: C.sub, fontSize: 13, textAlign: "center", lineHeight: 19 },
  /* receipt */
  okCircle: { width: 78, height: 78, borderRadius: 39, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  okTick: { color: "#fff", fontSize: 38, fontWeight: "900" },
  okTitle: { color: C.ink, fontSize: 21, fontWeight: "900", marginTop: 16 },
  okSub: { color: C.sub, fontSize: 13.5, marginTop: 4 },
  receiptCard: { backgroundColor: C.card, borderRadius: 18, padding: 18, width: "100%", marginTop: 18, borderWidth: 1, borderColor: C.line },
  rcStore: { fontWeight: "900", color: C.ink, fontSize: 15 },
  rcDate: { color: C.sub, fontSize: 12, fontWeight: "600" },
  rcDivider: { borderBottomWidth: 1, borderBottomColor: C.line, marginVertical: 10, borderStyle: Platform.OS === "ios" ? "solid" : "dashed" },
  rcItem: { color: C.ink, fontWeight: "700", fontSize: 13.5, flex: 1, paddingRight: 10 },
  rcQty: { color: C.sub, fontWeight: "700", fontSize: 12 },
  rcItemV: { color: C.ink, fontWeight: "800", fontSize: 13.5 },
  rcInv: { textAlign: "center", color: C.sub, fontSize: 11.5, fontWeight: "700", marginTop: 6, letterSpacing: 1 },
  rcThanks: { textAlign: "center", color: C.ink, fontSize: 12.5, fontWeight: "800", marginTop: 12 },
  rcPowered: { textAlign: "center", color: "#9aa4b2", fontSize: 10.5, fontWeight: "600", marginTop: 4 },
  rcLogo: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.blueBg, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  rcStoreBig: { fontWeight: "900", color: C.ink, fontSize: 18, letterSpacing: -0.3 },
  rcMuted: { color: C.sub, fontSize: 12, fontWeight: "600" },
  rcMeta: { color: C.ink, fontSize: 12, fontWeight: "800" },
  rcTotalBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.bg, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 10, marginTop: 8 },
  bellBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  bellDot: { position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: C.red, borderWidth: 1.5, borderColor: C.card },
  addPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.blue, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  addPillT: { color: "#fff", fontWeight: "800", fontSize: 12 },
  formIn: { backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, color: C.ink, borderWidth: 1, borderColor: C.line },
  /* scanner */
  scanFrame: { position: "absolute", top: "30%", left: "12%", right: "12%", height: "26%", borderWidth: 3, borderColor: "#ffffffcc", borderRadius: 18 },
  scanTopBar: { position: "absolute", top: PT + 12, left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  scanBack: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#000000aa", alignItems: "center", justifyContent: "center" },
  scanHint: { color: "#fff", fontWeight: "700", backgroundColor: "#000000aa", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden", fontSize: 13 },
  /* sales tab */
  salesHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: PT + 16, paddingBottom: 4 },
  salesBig: { color: C.ink, fontSize: 30, fontWeight: "900", letterSpacing: -1, marginTop: 4 },
  chartCard: { backgroundColor: C.card, borderRadius: 16, marginHorizontal: 16, marginTop: 10, padding: 14, borderWidth: 1, borderColor: C.line },
  chartLbl: { fontSize: 8.5, color: C.sub, fontWeight: "700" },
  /* more */
  signoutBtn: { backgroundColor: C.redBg, borderRadius: 13, paddingVertical: 14, alignItems: "center" },
  signoutT: { color: C.red, fontWeight: "900", fontSize: 15 },
  fieldLbl2: { color: C.sub, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginBottom: 7, marginTop: 2 },
  photoPick: { height: 150, borderRadius: 16, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderStyle: "dashed", alignItems: "center", justifyContent: "center", marginBottom: 14, overflow: "hidden" },
  localCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.blueBg, borderRadius: 15, borderWidth: 1.5, borderColor: C.blue + "44", padding: 14 },
  localIc: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.blue, alignItems: "center", justifyContent: "center" },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: "#d3dae4", padding: 3, justifyContent: "center" },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignSelf: "flex-start", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { height: 1, width: 0 }, elevation: 2 },
  /* tablet sidebar */
  sidebar: { width: 210, backgroundColor: C.card, borderRightWidth: 1, borderRightColor: C.line, paddingTop: PT + 18, paddingBottom: 18, paddingHorizontal: 10 },
  sideBrandRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, marginBottom: 18 },
  sideBrand: { color: C.ink, fontWeight: "900", fontSize: 15, flex: 1 },
  sideItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 11, marginBottom: 3 },
  sideItemOn: { backgroundColor: C.blueBg },
  sideIc: { fontSize: 17, color: "#9aa4b2", width: 22, textAlign: "center" },
  sideT: { fontSize: 14, fontWeight: "800", color: "#5b6676" },
  sideUser: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: C.bg, borderRadius: 12, padding: 9, borderWidth: 1, borderColor: C.line },
  sideAva: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.blue, alignItems: "center", justifyContent: "center" },
  sideAvaT: { color: "#fff", fontWeight: "900", fontSize: 12 },
  sideUserN: { color: C.ink, fontWeight: "800", fontSize: 13 },
  sideUserR: { color: C.sub, fontSize: 11, fontWeight: "600" },
  /* tablet cart panel */
  cartPanel: { backgroundColor: C.card, borderLeftWidth: 1, borderLeftColor: C.line },
  cartPanelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: PT + 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  cartPanelTitle: { fontWeight: "900", color: C.ink, fontSize: 15 },
});
