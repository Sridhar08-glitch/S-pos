import React,{useEffect,useMemo,useRef,useState,useCallback}from"react";
import{createRoot}from"react-dom/client";
import{Activity,AlertTriangle,Archive,ArrowLeftRight,BarChart3,Boxes,Building2,Check,CheckCircle2,ChevronRight,CircleDollarSign,ClipboardCheck,Clock3,CreditCard,Database,FileBarChart,FileText,Gift,HardDrive,Info,LayoutDashboard,LogIn,LogOut,Menu,Package,Percent,Plus,Printer,RefreshCw,Receipt,Search,Settings,Shield,ShieldCheck,ShoppingCart,Sparkles,Store,Tag,Trash2,TrendingUp,Truck,UserRound,Users,Wallet,Wifi,WifiOff,X,Zap}from"lucide-react";
import"./styles.css";
import{deviceId,readQueue,enqueue,removeLocalIds}from"./offline.js";

const API=(import.meta.env.VITE_API_URL||"http://127.0.0.1:8000/api/v1").replace(/\/$/,"");
const id=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const access=()=>localStorage.getItem("access_token");
const list=x=>Array.isArray(x)?x:(x?.results||x?.data||x?.items||[]);
// Currency is configured per company (Settings ▸ Companies). Any ISO code works worldwide.
let CUR=localStorage.getItem("nova_currency")||"QAR";
const BRAND={name:"",logo:""}; // filled from /stores/companies/ after sign-in; used on receipts
const setCurrency=c=>{if(c){CUR=String(c).toUpperCase();localStorage.setItem("nova_currency",CUR)}};
const money=x=>{const n=Number(x||0);try{return new Intl.NumberFormat(undefined,{style:"currency",currency:CUR,minimumFractionDigits:2,maximumFractionDigits:2}).format(n)}catch{return n.toFixed(2)+" "+CUR}};
const label=x=>String(x||"").replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
// Product imagery: use the model image when present, else a stable, grocery-relevant photo.
const IMG_TAGS=[["basmati","rice,bag"],["rice","rice,bag"],["chocolate","chocolate,bar"],["cola","cola,soda"],["cooking oil","olive,oil,bottle"],["oil","olive,oil,bottle"],["milk","milk,bottle"],["yogurt","yogurt,bowl"],["mineral water","water,bottle"],["water","water,bottle"],["orange juice","orange,juice"],["juice","juice,glass"],["chips","potato,chips"],["coffee","coffee,beans"],["tissue","tissue,box"],["bread","bread,loaf"],["sugar","sugar"],["tea","tea"],["egg","eggs"],["soap","soap"]];
const cleanKw=name=>String(name||"").toLowerCase().replace(/\d+\s*(kg|g|ml|l|pcs|pack)?/g," ").replace(/[^a-z ]/g," ").trim().split(/\s+/).filter(Boolean).slice(0,2).join(",")||"grocery";
const productImage=p=>{if(p?.image&&/^https?:\/\//.test(p.image))return p.image;const n=String(p?.name||"").toLowerCase();const hit=IMG_TAGS.find(([k])=>n.includes(k));const tag=hit?hit[1]:cleanKw(p?.name);return`https://loremflickr.com/400/240/${encodeURIComponent(tag)}?lock=${p?.id||1}`};
function downloadCSV(rows,filename){if(!rows||!rows.length){ui.toast("Nothing to export",{type:"warn"});return}const cols=Object.keys(rows[0]);const esc=v=>{const s=String(v??"").replace(/"/g,'""');return /[",\n]/.test(s)?`"${s}"`:s};const csv=[cols.join(","),...rows.map(r=>cols.map(c=>esc(r[c])).join(","))].join("\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url)}

async function api(path,opt={},retry=true){
  const method=(opt.method||"GET").toUpperCase();
  const isForm=opt.body instanceof FormData;
  const headers={...(isForm?{}:{"Content-Type":"application/json"}),"X-Request-ID":id(),...(opt.headers||{})};
  if(access())headers.Authorization=`Bearer ${access()}`;
  if(!["GET","HEAD","OPTIONS"].includes(method))headers["Idempotency-Key"]=headers["Idempotency-Key"]||id();
  const r=await fetch(API+path,{...opt,headers});
  if(r.status===401&&retry&&localStorage.getItem("refresh_token")){
    const q=await fetch(API+"/auth/token/refresh/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refresh:localStorage.getItem("refresh_token")})});
    if(q.ok){const d=await q.json();localStorage.setItem("access_token",d.access);if(d.refresh)localStorage.setItem("refresh_token",d.refresh);return api(path,opt,false)}
    localStorage.removeItem("access_token");localStorage.removeItem("refresh_token");throw Error("Session expired. Please sign in again.");
  }
  const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch{d={detail:raw}}
  if(!r.ok){
    const detail=d.detail||d.message||d.error?.message||(typeof d==="object"?Object.entries(d).map(([k,v])=>`${label(k)}: ${Array.isArray(v)?v.join(", "):typeof v==="string"?v:JSON.stringify(v)}`).join(" · "):"")||`Request failed (${r.status})`;
    throw Error(detail);
  }
  return d;
}

/* ---------- non-blocking UI: toasts + confirm + prompt ---------- */
const ui={toast:()=>{},confirm:()=>Promise.resolve(false),prompt:()=>Promise.resolve(null)};
function UIHost(){
  const[toasts,setToasts]=useState([]);
  const[dlg,setDlg]=useState(null);
  useEffect(()=>{
    ui.toast=(title,{type="info",desc=""}={})=>{const t={id:id(),title,type,desc};setToasts(a=>[...a,t]);setTimeout(()=>setToasts(a=>a.filter(x=>x.id!==t.id)),4200)};
    ui.confirm=(title,desc="",{danger=false,ok="Confirm"}={})=>new Promise(res=>setDlg({kind:"confirm",title,desc,danger,ok,res}));
    ui.prompt=(title,{value="",type="text",desc="",ok="Save"}={})=>new Promise(res=>setDlg({kind:"prompt",title,desc,type,value,ok,res}));
  },[]);
  const close=v=>{dlg?.res(v);setDlg(null)};
  return<>
    <div className="toasts">{toasts.map(t=><div key={t.id}className={"toast "+(t.type==="ok"?"ok":t.type==="err"?"err":t.type==="warn"?"warn":"")}>
      <span className="ti">{t.type==="ok"?<CheckCircle2 size={18}/>:t.type==="err"?<AlertTriangle size={18}/>:t.type==="warn"?<AlertTriangle size={18}/>:<Info size={18}/>}</span>
      <div><b>{t.title}</b>{t.desc&&<small>{t.desc}</small>}</div></div>)}</div>
    {dlg&&<div className="overlay"onMouseDown={()=>close(dlg.kind==="confirm"?false:null)}>
      <div className="modal"style={{maxWidth:440}}onMouseDown={e=>e.stopPropagation()}>
        <div className="modalhead"><h2>{dlg.title}</h2><button onClick={()=>close(dlg.kind==="confirm"?false:null)}><X/></button></div>
        {dlg.desc&&<p className="muted"style={{marginTop:0}}>{dlg.desc}</p>}
        {dlg.kind==="prompt"&&<input autoFocus type={dlg.type}defaultValue={dlg.value}onChange={e=>dlg.value=e.target.value}onKeyDown={e=>e.key==="Enter"&&close(dlg.value)}style={{width:"100%"}}/>}
        <div className="modalactions"><button className="ghost"onClick={()=>close(dlg.kind==="confirm"?false:null)}>Cancel</button>
          <button className={"primary"+(dlg.danger?" danger":"")}onClick={()=>close(dlg.kind==="confirm"?true:dlg.value)}>{dlg.ok}</button></div>
      </div></div>}
  </>;
}

/* ---------- resource config (CRUD engine) ---------- */
const RES={
 categories:{title:"Categories",path:"/catalog/categories/",fields:["name","active"]},
 products:{title:"Products",path:"/catalog/products/",fields:["name","sku","barcode","qr_code","category","purchase_price","selling_price","tax_rate","stock_quantity","minimum_stock","active"],relations:{category:"/catalog/categories/"}},
 barcodes:{title:"Product Barcodes",path:"/catalog/barcodes/",fields:["product","barcode","barcode_type","is_primary"],relations:{product:"/catalog/products/"}},
 bundles:{title:"Product Bundles",path:"/catalog/bundles/",fields:["product","name","active"],relations:{product:"/catalog/products/"}},
 bundleItems:{title:"Bundle Items",path:"/catalog/bundle-items/",fields:["bundle","component","quantity"],relations:{bundle:"/catalog/bundles/",component:"/catalog/products/"}},
 variants:{title:"Product Variants",path:"/catalog/variants/",fields:["product","name","sku","barcode","price","active"],relations:{product:"/catalog/products/"}},
 modifierGroups:{title:"Modifier Groups",path:"/catalog/modifier-groups/",fields:["name","min_select","max_select","active"]},
 modifiers:{title:"Modifiers",path:"/catalog/modifiers/",fields:["group","name","price_delta","active"],relations:{group:"/catalog/modifier-groups/"}},
 productModifiers:{title:"Product Modifiers",path:"/catalog/product-modifiers/",fields:["product","group"],relations:{product:"/catalog/products/",group:"/catalog/modifier-groups/"}},
 transfers:{title:"Transfers",path:"/inventory/transfers/",fields:["transfer_number","source_store","destination_store","status","created_by","approved_by","shipped_at","received_at","created_at"],relations:{source_store:"/stores/stores/",destination_store:"/stores/stores/",created_by:"/auth/users/",approved_by:"/auth/users/"},readonlyAll:true},
 purchases:{title:"Purchases",path:"/purchasing/purchases/",fields:["supplier","store","invoice_number","status","subtotal","tax_amount","total_amount","created_by","created_at"],relations:{supplier:"/purchasing/suppliers/",store:"/stores/stores/",created_by:"/auth/users/"},readonlyAll:true},
 inventory:{title:"Store Inventory",path:"/inventory/stock/",fields:["store","product","quantity","reserved_quantity","minimum_stock","reorder_level","product_name","sku"],relations:{store:"/stores/stores/",product:"/catalog/products/"},noEdit:true,noDelete:true},
 ledger:{title:"Inventory Ledger",path:"/inventory/ledger/",fields:["store","product","transaction_type","quantity","before_quantity","after_quantity","reference_type","reference_id","note","created_at"],relations:{store:"/stores/stores/",product:"/catalog/products/"},readonlyAll:true},
 serials:{title:"Product Serials",path:"/inventory/serials/",fields:["product","serial_number","store","status","sale_id"],relations:{product:"/catalog/products/",store:"/stores/stores/"},readonlyAll:true},
 batches:{title:"Product Batches",path:"/inventory/batches/",fields:["product","store","batch_number","expiry_date","quantity","unit_cost"],relations:{product:"/catalog/products/",store:"/stores/stores/"},readonlyAll:true},
 suppliers:{title:"Suppliers",path:"/purchasing/suppliers/",fields:["name","phone","email","tax_number","address","active"]},
 purchaseItems:{title:"Purchase Items",path:"/purchasing/items/",fields:["purchase","product","quantity","received_quantity","unit_cost","tax_rate"],relations:{purchase:"/purchasing/purchases/",product:"/catalog/products/"},readonlyAll:true},
 customers:{title:"Customers",path:"/customers/customers/",fields:["name","phone","email","address","notes","active"]},
 creditAccounts:{title:"Customer Credit",path:"/customers/credit-accounts/",fields:["customer","credit_limit","balance","active"],relations:{customer:"/customers/customers/"},readonly:["balance"],noDelete:true},
 giftCards:{title:"Gift Cards",path:"/customers/gift-cards/",fields:["code","original_amount","balance","active","expires_at"],readonly:["balance"],noDelete:true,actions:["redeem"]},
 storeCredits:{title:"Store Credits",path:"/customers/store-credits/",fields:["customer","amount","balance","reason"],relations:{customer:"/customers/customers/"},readonly:["balance"],noDelete:true},
 creditLedger:{title:"Customer Credit Ledger",path:"/customers/credit-ledger/",fields:["account","transaction_type","amount","balance_after","reference_type","reference_id","note","created_by","created_at"],relations:{account:"/customers/credit-accounts/",created_by:"/auth/users/"},readonlyAll:true},
 giftCardLedger:{title:"Gift Card Ledger",path:"/customers/gift-card-ledger/",fields:["gift_card","transaction_type","amount","balance_after","reference_type","reference_id","created_by","created_at"],relations:{gift_card:"/customers/gift-cards/",created_by:"/auth/users/"},readonlyAll:true},
 storeCreditLedger:{title:"Store Credit Ledger",path:"/customers/store-credit-ledger/",fields:["store_credit","transaction_type","amount","balance_after","reference_type","reference_id","created_by","created_at"],relations:{store_credit:"/customers/store-credits/",created_by:"/auth/users/"},readonlyAll:true},
 registers:{title:"Registers",path:"/registers/registers/",fields:["store","name","code","active"],relations:{store:"/stores/stores/"}},
 sessions:{title:"Register Sessions",path:"/registers/sessions/",fields:["register","store","cashier","status","opening_cash","closing_cash","expected_cash","difference","opened_at","closed_at"],relations:{register:"/registers/registers/",store:"/stores/stores/",cashier:"/auth/users/"},readonlyAll:true},
 cashMovements:{title:"Cash Movements",path:"/registers/cash-movements/",fields:["session","movement_type","amount","reason","created_by","created_at"],choices:{movement_type:["IN","OUT"]},relations:{session:"/registers/sessions/",created_by:"/auth/users/"},readonly:["created_by","created_at"],noEdit:true,noDelete:true},
 sales:{title:"Sales",path:"/sales/sales/",fields:["invoice_number","store","register","register_session","customer","cashier","status","subtotal","discount_amount","tax_amount","total_amount","notes","created_at"],relations:{store:"/stores/stores/",register:"/registers/registers/",register_session:"/registers/sessions/",customer:"/customers/customers/",cashier:"/auth/users/"},readonlyAll:true},
 refunds:{title:"Refunds",path:"/sales/refunds/",fields:["sale","refund_number","cashier","amount","reason","created_at"],relations:{sale:"/sales/sales/",cashier:"/auth/users/"},readonlyAll:true},
 payments:{title:"Sale Payments",path:"/sales/payments/",fields:["sale","method","status","provider","idempotency_key","amount","reference","paid_at"],relations:{sale:"/sales/sales/"},readonlyAll:true},
 paymentIntents:{title:"Payment Intents",path:"/payments/intents/",fields:["intent_id","method","provider","amount","currency","state","provider_reference","idempotency_key","metadata","created_at","updated_at"],readonly:["intent_id","idempotency_key","created_at","updated_at"],actions:["transition"]},
 pricingLists:{title:"Price Lists",path:"/pricing/lists/",fields:["name","currency","active"]},
 pricingItems:{title:"Price List Items",path:"/pricing/items/",fields:["price_list","product","price"],relations:{price_list:"/pricing/lists/",product:"/catalog/products/"}},
 customerLists:{title:"Customer Price Lists",path:"/pricing/customer-lists/",fields:["customer","price_list"],relations:{customer:"/customers/customers/",price_list:"/pricing/lists/"}},
 units:{title:"Units",path:"/pricing/units/",fields:["code","name","decimals","weight_based"]},
 promotions:{title:"Promotions",path:"/promotions/promotions/",fields:["name","kind","value","buy_quantity","get_quantity","product","category","starts_at","ends_at","active"],relations:{product:"/catalog/products/",category:"/catalog/categories/"},choices:{kind:["PERCENT","FIXED","BUY_X_GET_Y"]}},
 loyaltyAccounts:{title:"Loyalty Accounts",path:"/loyalty/accounts/",fields:["customer","points","lifetime_points","updated_at"],relations:{customer:"/customers/customers/"},readonly:["points","lifetime_points","updated_at"],actions:["earn","redeem"]},
 loyaltyTransactions:{title:"Loyalty Transactions",path:"/loyalty/transactions/",fields:["account","transaction_type","points","reference","created_by","created_at"],choices:{transaction_type:["EARN","REDEEM","ADJUST"]},relations:{account:"/loyalty/accounts/",created_by:"/auth/users/"},readonlyAll:true},
 accounts:{title:"Finance Accounts",path:"/finance/accounts/",fields:["code","name","account_type","active"]},
 journal:{title:"Journal Entries",path:"/finance/journal/",fields:["reference_type","reference_id","description","store","created_by","created_at"],relations:{store:"/stores/stores/",created_by:"/auth/users/"},readonlyAll:true},
 reconciliation:{title:"Payment Reconciliation",path:"/finance/reconciliation/",fields:["store","payment_method","business_date","expected_amount","actual_amount","difference","status","created_at"],relations:{store:"/stores/stores/"},readonly:["difference","status","created_at"],noDelete:true},
 expenses:{title:"Expenses",path:"/expenses/expenses/",noEdit:true,fields:["store","category","description","amount","payment_method","status","created_by","approved_by","created_at","paid_at"],relations:{store:"/stores/stores/",created_by:"/auth/users/",approved_by:"/auth/users/"},choices:{payment_method:["CASH","CARD","QR","BANK","WALLET"]},readonly:["status","created_by","approved_by","created_at","paid_at"],actions:["approve","pay","void"]},
 approvals:{title:"Approval Requests",path:"/approvals/requests/",noEdit:true,fields:["action","reference_type","reference_id","reason","requested_by","approved_by","status","created_at","decided_at"],relations:{requested_by:"/auth/users/",approved_by:"/auth/users/"},readonly:["requested_by","approved_by","status","created_at","decided_at"],actions:["approve","reject"]},
 devices:{title:"Hardware Devices",path:"/hardware/devices/",fields:["store","register","device_id","name","kind","connection_type","address","active","last_seen_at"],relations:{store:"/stores/stores/",register:"/registers/registers/"},choices:{kind:["POS","SCANNER","PRINTER","SCALE","DISPLAY","CASH_DRAWER"],connection_type:["USB","SERIAL","NETWORK","BLUETOOTH"]},readonly:["last_seen_at"],actions:["heartbeat"]},
 audit:{title:"Audit Logs",path:"/audit/logs/",fields:["action","entity_type","entity_id","user","store","created_at"],relations:{user:"/auth/users/",store:"/stores/stores/"},readonlyAll:true},
 transactions:{title:"Business Transactions",path:"/transactions/transactions/",fields:["transaction_id","transaction_type","store","status","idempotency_key","device_id","user","created_at","committed_at"],relations:{store:"/stores/stores/",user:"/auth/users/"},readonlyAll:true},
 productionAudit:{title:"Production Audit Events",path:"/production/audit/",fields:["actor","action","reference_type","reference_id","store_id","register_id","device_id","request_id","ip_address","reason","created_at"],relations:{actor:"/auth/users/"},readonlyAll:true},
 heartbeats:{title:"Device Heartbeats",path:"/production/heartbeats/",fields:["device_id","store_id","last_seen","app_version","status"],readonlyAll:true,readonly:["last_seen"],actions:["heartbeat"]},
 companies:{title:"Companies",path:"/stores/companies/",fields:["name","legal_name","tax_number","currency","logo","active"],fileFields:["logo"],choices:{currency:["QAR","USD","EUR","GBP","INR","AED","SAR","KWD","BHD","OMR","PKR","BDT","EGP","NGN","KES","ZAR","JPY","CNY","AUD","CAD","BRL","MXN","TRY","IDR","MYR","PHP","THB","VND"]}},
 stores:{title:"Stores",path:"/stores/stores/",fields:["company","name","code","address","phone","active"],relations:{company:"/stores/companies/"}},
 users:{title:"Users",path:"/auth/users/",fields:["username","first_name","last_name","email","phone","role","store","is_active"],relations:{store:"/stores/stores/"}},
 taxRates:{title:"Tax Rates",path:"/taxes/rates/",fields:["name","code","rate","inclusive","active"]},
 settings:{title:"Company Settings",path:"/tenancy/settings/",fields:["company","default_currency","timezone","tax_enabled","offline_enabled"],relations:{company:"/stores/companies/"}},
 sequences:{title:"Company Sequences",path:"/tenancy/sequences/",fields:["company","name","next_value"],relations:{company:"/stores/companies/"},readonlyAll:true},
};

/* ---------- grouped, role-aware navigation ---------- */
// Role tiers: 0 = every staff member (cashier), 1 = manager/inventory, 2 = owner/admin.
const roleLevel=r=>r==="ADMIN"?2:(r==="MANAGER"||r==="INVENTORY")?1:0;
const NAVGROUPS=[
 {label:"",min:0,items:[["dashboard","Overview",LayoutDashboard],["pos","Point of Sale",ShoppingCart]]},
 {label:"Sell",min:0,items:[["sales","Sales",Receipt],["customers","Customers",Users],["giftCards","Gift Cards",Gift],["loyaltyAccounts","Loyalty",Gift],["timeClock","Time Clock",Clock3]]},
 {label:"Catalog",min:1,items:[["productsView","Products",Package],["categories","Categories",Tag],["variants","Variants",Boxes],["promotions","Promotions",Percent],["pricingLists","Price Lists",Tag]]},
 {label:"Inventory",min:1,items:[["inventory","Stock",Boxes],["stockCounts","Stock Counts",ClipboardCheck],["transfers","Transfers",ArrowLeftRight],["suppliers","Suppliers",Building2],["purchases","Purchasing",Truck]]},
 {label:"Money & Reports",min:1,items:[["reports","Reports",BarChart3],["refunds","Refunds",RefreshCw],["expenses","Expenses",Wallet],["approvals","Approvals",ClipboardCheck],["reconciliation","Reconciliation",Check]]},
 {label:"Store Setup",min:2,items:[["registers","Registers",CircleDollarSign],["sessions","Sessions",Clock3],["cashMovements","Cash Movements",Wallet],["stores","Stores",Store],["companies","Companies",Building2],["users","Users",UserRound],["taxRates","Tax Rates",Percent],["settings","Settings",Settings]]},
 {label:"Advanced",min:2,adv:true,items:[["modifierGroups","Modifier Groups",Boxes],["modifiers","Modifiers",Tag],["productModifiers","Product Modifiers",Boxes],["bundles","Bundles",Boxes],["bundleItems","Bundle Items",Boxes],["barcodes","Barcodes",Archive],["pricingItems","Price Items",Tag],["customerLists","Customer Pricing",Users],["units","Units",Package],["creditAccounts","Customer Credit",Wallet],["creditLedger","Credit Ledger",FileText],["giftCardLedger","Gift Card Ledger",FileText],["storeCredits","Store Credit",CircleDollarSign],["storeCreditLedger","Store Credit Ledger",FileText],["loyaltyTransactions","Loyalty Log",FileText],["ledger","Inventory Ledger",FileText],["serials","Serials",Database],["batches","Batches",Archive],["purchaseItems","Purchase Items",FileText],["payments","Payments",CreditCard],["paymentIntents","Payment Intents",CreditCard],["accounts","Chart of Accounts",FileBarChart],["journal","Journal",FileText],["devices","Hardware",HardDrive],["audit","Audit Log",Shield],["offline","Offline Sync",WifiOff],["transactions","Transactions",Database],["productionAudit","Activity Log",Shield],["heartbeats","Device Status",Activity],["sequences","Sequences",FileText]]},
];

/* ---------- login ---------- */
function Login({done}){
  const[u,setU]=useState(""),[p,setP]=useState(""),[e,setE]=useState(""),[busy,setBusy]=useState(false);
  async function submit(ev){ev.preventDefault();setBusy(true);setE("");try{const d=await api("/auth/token/",{method:"POST",body:JSON.stringify({username:u,password:p})});localStorage.setItem("access_token",d.access);if(d.refresh)localStorage.setItem("refresh_token",d.refresh);done()}catch(x){setE(x.message)}finally{setBusy(false)}}
  const feats=[[Zap,"Sell in seconds — scan, tap, done"],[TrendingUp,"Track stock, staff and cash in real time"],[ShieldCheck,"Works offline, on any device"]];
  return<div className="login">
    <div className="login-hero">
      <div className="logo">S<span> POS</span><i className="dot"/></div>
      <div>
        <h2>Run your entire<br/>retail operation.</h2>
        <p>Point of sale, inventory, purchasing, customers, loyalty and accounting — unified in one fast, offline-ready workspace.</p>
        <div className="hero-feats">{feats.map(([I,t],i)=><div key={i}><span><I size={16}/></span>{t}</div>)}</div>
      </div>
      <div className="muted"style={{color:"#cbd0ff"}}>© S POS · Developed by Sridhar Mahalingam</div>
    </div>
    <div className="login-form"><form className="loginbox"onSubmit={submit}>
      <div className="logo"style={{color:"var(--ink)"}}>S<span> POS</span><i className="dot"/></div>
      <p className="cap">Sign in to your store workspace</p>
      <label>Username<input value={u}onChange={e=>setU(e.target.value)}autoFocus required/></label>
      <label>Password<input type="password"value={p}onChange={e=>setP(e.target.value)}required/></label>
      {e&&<div className="error"><AlertTriangle size={15}/>{e}</div>}
      <button className="primary wide"disabled={busy}style={{marginTop:8}}>{busy?"Signing in…":"Sign in"}<LogIn size={16}/></button>
    </form></div>
  </div>;
}

/* ---------- shell ---------- */
function Shell({page,setPage,me,children,online,company,logo}){
  const[open,setOpen]=useState(false);
  const[advOpen,setAdvOpen]=useState(false);
  const lvl=roleLevel(me?.role);
  const uname=me?.username||"user";
  const full=[me?.first_name,me?.last_name].filter(Boolean).join(" ")||uname;
  const roleLabel={ADMIN:"Owner",MANAGER:"Manager",INVENTORY:"Inventory",CASHIER:"Cashier"}[me?.role]||"Staff";
  async function signout(){try{const rt=localStorage.getItem("refresh_token");if(rt)await api("/auth/logout/",{method:"POST",body:JSON.stringify({refresh:rt})})}catch{}localStorage.clear();location.reload()}
  return<div className="shell">
    <aside className={open?"side show":"side"}>
      <div className="brand"><span className="mark"style={logo?{background:"#fff",overflow:"hidden",padding:0}:undefined}>{logo?<img src={logo}alt=""style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<Sparkles size={18}color="#fff"/>}</span><span className="logo"style={{color:"#fff"}}>{company?<span style={{fontSize:15}}>{company}</span>:<>S<span> POS</span></>}</span></div>
      <div className="navwrap"><div className="nav">{NAVGROUPS.map((g,gi)=>{
        if(g.min>lvl)return null;
        const collapsible=g.adv;
        const showItems=!collapsible||advOpen;
        return<div key={gi}className="navgrp"style={{animationDelay:(gi*40)+"ms"}}>
          {g.label&&(collapsible
            ?<button className="navgroup navtoggle"onClick={()=>setAdvOpen(v=>!v)}>{g.label}<ChevronRight size={13}style={{marginLeft:"auto",transform:advOpen?"rotate(90deg)":"none",transition:"transform .2s"}}/></button>
            :<div className="navgroup">{g.label}</div>)}
          {showItems&&g.items.map(([k,t,I])=>
            <button key={k}className={page===k?"sel":""}onClick={()=>{setPage(k);setOpen(false)}}><I size={16}/>{t}</button>)}
        </div>;
      })}</div></div>
      <div className="side-foot">
        <div className="userchip"><div className="av">{full.slice(0,1).toUpperCase()}</div><div><b>{full}</b><small>{roleLabel}{company?" · "+company:""}</small></div></div>
        <button className="logout"onClick={signout}><LogOut size={16}/>Sign out</button>
      </div>
    </aside>
    <main>
      <header>
        <button className="menub"onClick={()=>setOpen(!open)}><Menu size={18}/></button>
        <div className="topsearch"><Search size={16}/><input placeholder="Search…"/></div>
        <div className="hdr-right">{!online&&<div className="connection offline"><WifiOff size={14}/>Working offline</div>}<div className="hdr-store"style={{display:"flex",alignItems:"center",gap:8}}>{logo&&<img src={logo}alt=""style={{height:22,width:22,borderRadius:6,objectFit:"cover"}}/>}{company||"S POS"}</div></div>
      </header>
      <section className="body"key={page}>{children}</section>
    </main>
  </div>;
}
function Head({title,sub,action}){return<div className="head"><div><h1>{title}</h1><p>{sub}</p></div>{action}</div>}

/* ---------- lookups + inputs ---------- */
function useLookups(relations){const[out,setOut]=useState({});const key=JSON.stringify(relations||{});useEffect(()=>{let on=true;const entries=Object.entries(relations||{});Promise.all(entries.map(async([field,path])=>[field,list(await api(path))])).then(pairs=>{if(on)setOut(Object.fromEntries(pairs))}).catch(()=>{});return()=>{on=false}},[key]);return out}
const BOOL=new Set(["active","inclusive","weight_based","tax_enabled","offline_enabled","is_active","is_primary"]);
function Input({name,value,onChange,meta,readonly,lookup,choices}){
  const v=value??"";
  if(readonly)return<div className="readonly">{typeof v==="object"?JSON.stringify(v):String(v||"—")}</div>;
  if(meta?.file)return<div>
    {typeof v==="string"&&v&&<img src={v}alt=""style={{height:44,borderRadius:8,display:"block",marginBottom:6,background:"#fff",border:"1px solid var(--line,#e5e7eb)"}}/>}
    {v instanceof File&&<img src={URL.createObjectURL(v)}alt=""style={{height:44,borderRadius:8,display:"block",marginBottom:6}}/>}
    <input type="file"accept="image/*"onChange={e=>onChange(e.target.files?.[0]||"")}/>
  </div>;
  if(BOOL.has(name))return<label style={{flexDirection:"row",alignItems:"center",gap:8,margin:0}}><input type="checkbox"checked={!!value}onChange={e=>onChange(e.target.checked)}/>Enabled</label>;
  if(choices?.length)return<select value={value??""}onChange={e=>onChange(e.target.value)}><option value="">Select…</option>{choices.map(x=><option key={x}value={x}>{label(x)}</option>)}</select>;
  if(meta?.relation)return<select value={value??""}onChange={e=>onChange(e.target.value)}><option value="">Select…</option>{lookup.map(x=><option value={x.id}key={x.id}>{x.name||x.code||x.username||x.invoice_number||x.id}</option>)}</select>;
  if(name.endsWith("_at")||name==="business_date"||name==="expiry_date")return<input type={name.endsWith("_at")?"datetime-local":"date"}value={String(v).slice(0,name.endsWith("_at")?16:10)}onChange={e=>onChange(e.target.value)}/>;
  if(/quantity|amount|price|tax_rate|rate|balance|points|decimals|next_value|credit_limit|value/.test(name))return<input type="number"step={name.includes("quantity")?"0.001":"0.01"}value={v}onChange={e=>onChange(e.target.value)}/>;
  return<input value={v}onChange={e=>onChange(e.target.value)}/>;
}

/* ---------- generic CRUD ---------- */
function CRUD({kind}){
  const cfg=RES[kind];
  const[items,setItems]=useState([]),[busy,setBusy]=useState(false),[q,setQ]=useState(""),[err,setErr]=useState(""),[edit,setEdit]=useState(null),[form,setForm]=useState({});
  const lookups=useLookups(cfg.relations||{});
  const load=useCallback(()=>{setBusy(true);api(cfg.path).then(d=>setItems(list(d))).catch(x=>setErr(x.message)).finally(()=>setBusy(false))},[cfg.path]);
  useEffect(load,[load]);
  const shown=items.filter(r=>!q||JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  function begin(r=null){const f={};(cfg.fields||[]).forEach(x=>f[x]=r?.[x]??(BOOL.has(x)?true:""));setForm(f);setEdit(r||{})}
  async function save(e){e.preventDefault();setErr("");try{
    const fileFields=cfg.fileFields||[];
    const hasFile=fileFields.some(f=>form[f]instanceof File);
    let body;
    if(hasFile){
      body=new FormData();
      for(const f of cfg.fields||[]){if(cfg.readonly?.includes(f))continue;const v=form[f];if(v===undefined||v==="")continue;
        if(fileFields.includes(f)){if(v instanceof File)body.append(f,v);continue}
        body.append(f,typeof v==="boolean"?String(v):v)}
    }else{
      const o={};for(const f of cfg.fields||[]){if(cfg.readonly?.includes(f)||fileFields.includes(f))continue;if(form[f]!==undefined&&form[f]!==""){o[f]=form[f]}}
      body=JSON.stringify(o);
    }
    await api(edit?.id?`${cfg.path}${edit.id}/`:cfg.path,{method:edit?.id?"PATCH":"POST",body});setEdit(null);load();ui.toast(edit?.id?"Saved":"Created",{type:"ok",desc:cfg.title})}catch(x){setErr(x.message);ui.toast("Save failed",{type:"err",desc:x.message})}}
  async function remove(r){if(cfg.noDelete)return;if(!await ui.confirm("Delete record?","This cannot be undone.",{danger:true,ok:"Delete"}))return;try{await api(`${cfg.path}${r.id}/`,{method:"DELETE"});load();ui.toast("Deleted",{type:"ok"})}catch(x){setErr(x.message);ui.toast("Delete failed",{type:"err",desc:x.message})}}
  async function action(r,a){setErr("");try{
    let payload={};
    if(a==="close"){const v=await ui.prompt("Actual closing cash",{type:"number",value:"0"});if(v===null)return;payload={closing_cash:v}}
    else if(a==="redeem"){const v=await ui.prompt("Redemption amount",{type:"number",value:"0"});if(v===null)return;payload={amount:v}}
    else if(a==="earn"){const v=await ui.prompt("Points to earn",{type:"number",value:"0"});if(v===null)return;payload={points:v}}
    else if(a==="void"){const v=await ui.prompt("Reason",{value:""});if(v===null)return;payload={reason:v}}
    else if(a==="transition"){const v=await ui.prompt("New state",{value:"CAPTURED"});if(v===null)return;payload={state:v}}
    await api(`${cfg.path}${r.id}/${a}/`,{method:"POST",body:JSON.stringify(payload)});load();ui.toast(label(a)+" done",{type:"ok"})}catch(x){setErr(x.message);ui.toast(label(a)+" failed",{type:"err",desc:x.message})}}
  return<><Head title={cfg.title}sub={`Manage ${cfg.title.toLowerCase()}`}action={!cfg.readonlyAll&&!cfg.noCreate&&<button className="primary"onClick={()=>begin()}><Plus size={16}/>Add {cfg.title.replace(/s$/,"")}</button>}/>
    {err&&<div className="error"><AlertTriangle size={15}/>{err}</div>}
    <div className="toolbar"><div className="search"><Search size={16}/><input value={q}onChange={e=>setQ(e.target.value)}placeholder={`Search ${cfg.title.toLowerCase()}…`}/></div><button className="ghost"onClick={load}><RefreshCw size={15}/>{busy?"Loading":"Refresh"}</button><span>{shown.length} records</span></div>
    <div className="table"><table><thead><tr>{cfg.fields.map(f=><th key={f}>{label(f)}</th>)}<th>Actions</th></tr></thead><tbody>
      {shown.map(r=><tr key={r.id}>{cfg.fields.map(f=><td key={f}>{cfg.fileFields?.includes(f)?(r[f]?<img src={r[f]}alt=""style={{height:26,borderRadius:6,verticalAlign:"middle"}}/>:"—"):typeof r[f]==="object"?JSON.stringify(r[f]):String(r[f]??"—")}</td>)}<td className="actions">
        {cfg.actions?.map(a=><button key={a}title={label(a)}onClick={()=>action(r,a)}>{a==="approve"?<Check size={14}/>:a==="reject"?<X size={14}/>:a==="heartbeat"?<Activity size={14}/>:a==="close"?<LogOut size={14}/>:a==="redeem"?<Gift size={14}/>:a==="earn"?<Plus size={14}/>:a==="pay"?<CreditCard size={14}/>:a==="void"?<X size={14}/>:<Settings size={14}/>}</button>)}
        {!cfg.readonlyAll&&!cfg.noEdit&&<button title="Edit"onClick={()=>begin(r)}><Settings size={14}/></button>}
        {!cfg.readonlyAll&&!cfg.noDelete&&<button className="danger"title="Delete"onClick={()=>remove(r)}><Trash2 size={14}/></button>}
      </td></tr>)}
      {!shown.length&&<tr><td className="empty"colSpan={cfg.fields.length+1}>No records</td></tr>}
    </tbody></table></div>
    {edit!==null&&<div className="overlay"onMouseDown={()=>setEdit(null)}><div className="modal"onMouseDown={e=>e.stopPropagation()}><div className="modalhead"><h2>{edit.id?"Edit":"Add"} {cfg.title}</h2><button onClick={()=>setEdit(null)}><X/></button></div>
      <form onSubmit={save}><div className="formgrid">{cfg.fields.map(f=><label key={f}>{label(f)}<Input name={f}value={form[f]}onChange={v=>setForm({...form,[f]:v})}meta={{relation:!!cfg.relations?.[f],file:cfg.fileFields?.includes(f)}}readonly={cfg.readonly?.includes(f)}lookup={lookups[f]||[]}choices={cfg.choices?.[f]}/></label>)}</div>
      <div className="modalactions"><button type="button"className="ghost"onClick={()=>setEdit(null)}>Cancel</button><button className="primary">Save</button></div></form></div></div>}
  </>;
}

/* ---------- stock badge ---------- */
function StockBadge({p}){const q=Number(p.stock_quantity||0),m=Number(p.minimum_stock||0);if(q<=0)return<span className="pill bad">Out</span>;if(q<=m)return<span className="pill warn">Low · {q}</span>;return<span className="pill ok">{q} in stock</span>}

/* ---------- products catalog (card grid) ---------- */
function ProductsPage(){
  const[items,setItems]=useState([]),[cats,setCats]=useState([]),[q,setQ]=useState(""),[busy,setBusy]=useState(true),[err,setErr]=useState(""),[edit,setEdit]=useState(null),[form,setForm]=useState({});
  const load=useCallback(()=>{setBusy(true);api("/catalog/products/").then(d=>setItems(list(d))).catch(x=>setErr(x.message)).finally(()=>setBusy(false))},[]);
  useEffect(()=>{load();api("/catalog/categories/").then(d=>setCats(list(d))).catch(()=>{})},[load]);
  const F=RES.products.fields;
  const shown=items.filter(r=>!q||`${r.name} ${r.sku} ${r.barcode} ${r.category_name}`.toLowerCase().includes(q.toLowerCase()));
  function begin(r=null){const f={};F.forEach(x=>f[x]=r?.[x]??(x==="active"?true:""));setForm(f);setEdit(r||{})}
  async function save(e){e.preventDefault();setErr("");try{const body={};for(const f of F){if(form[f]!==undefined&&form[f]!=="")body[f]=form[f]}await api(edit?.id?`/catalog/products/${edit.id}/`:"/catalog/products/",{method:edit?.id?"PATCH":"POST",body:JSON.stringify(body)});setEdit(null);load();ui.toast(edit?.id?"Product saved":"Product created",{type:"ok"})}catch(x){setErr(x.message);ui.toast("Save failed",{type:"err",desc:x.message})}}
  async function remove(r){if(!await ui.confirm(`Delete ${r.name}?`,"",{danger:true,ok:"Delete"}))return;try{await api(`/catalog/products/${r.id}/`,{method:"DELETE"});load();ui.toast("Deleted",{type:"ok"})}catch(x){ui.toast("Delete failed",{type:"err",desc:x.message})}}
  return<><Head title="Products"sub={`${items.length} products in catalog`}action={<button className="primary"onClick={()=>begin()}><Plus size={16}/>Add Product</button>}/>
    {err&&<div className="error"><AlertTriangle size={15}/>{err}</div>}
    <div className="toolbar"><div className="search"><Search size={16}/><input value={q}onChange={e=>setQ(e.target.value)}placeholder="Search products by name, SKU, barcode…"/></div><button className="ghost"onClick={load}><RefreshCw size={15}/>Refresh</button><span>{shown.length} shown</span></div>
    {busy?<div className="empty">Loading products…</div>:!shown.length?<div className="empty">No products found</div>:
    <div className="pgrid">{shown.map(p=><div className="pcard"key={p.id}>
      <div className="thumb"><img src={productImage(p)}alt={p.name}loading="lazy"onError={e=>{e.target.style.display="none"}}/><Package size={30}className="ph"/>{p.category_name&&<span className="cat">{p.category_name}</span>}<span className="stk"><StockBadge p={p}/></span></div>
      <div className="pinfo"><b>{p.name}</b><small>{p.sku||p.barcode||"—"}</small><div className="price">{money(p.selling_price)}</div>
        <div className="actions"style={{marginTop:6}}><button onClick={()=>begin(p)}><Settings size={13}/>Edit</button><button className="danger"onClick={()=>remove(p)}><Trash2 size={13}/></button></div>
      </div></div>)}</div>}
    {edit!==null&&<div className="overlay"onMouseDown={()=>setEdit(null)}><div className="modal"onMouseDown={e=>e.stopPropagation()}><div className="modalhead"><h2>{edit.id?"Edit":"New"} product</h2><button onClick={()=>setEdit(null)}><X/></button></div>
      <form onSubmit={save}><div className="formgrid">{F.map(f=><label key={f}>{label(f)}{f==="category"?<select value={form[f]??""}onChange={e=>setForm({...form,[f]:e.target.value})}><option value="">Select…</option>{cats.map(c=><option key={c.id}value={c.id}>{c.name}</option>)}</select>:f==="active"?<label style={{flexDirection:"row",alignItems:"center",gap:8,margin:0}}><input type="checkbox"checked={!!form[f]}onChange={e=>setForm({...form,[f]:e.target.checked})}/>Active</label>:<input type={/price|rate|quantity|stock/.test(f)?"number":"text"}step="0.01"value={form[f]??""}onChange={e=>setForm({...form,[f]:e.target.value})}/>}</label>)}</div>
      <div className="modalactions"><button type="button"className="ghost"onClick={()=>setEdit(null)}>Cancel</button><button className="primary">Save product</button></div></form></div></div>}
  </>;
}

/* ---------- dashboard ---------- */
function AnimatedNumber({value,fmt=x=>x}){
  const[n,setN]=useState(0);const prev=useRef(0);
  useEffect(()=>{const from=prev.current,to=Number(value)||0,start=performance.now(),dur=700;let raf;
    const tick=t=>{const k=Math.min(1,(t-start)/dur),e=1-Math.pow(1-k,3);setN(from+(to-from)*e);if(k<1)raf=requestAnimationFrame(tick);else prev.current=to};
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)},[value]);
  return<>{fmt(n)}</>;
}
function Dashboard({go,me}){
  const[s,setS]=useState({}),[sales,setSales]=useState({}),[low,setLow]=useState([]),[live,setLive]=useState(true);
  const warned=useRef(false);
  const refresh=useCallback(()=>{api("/reports/dashboard/").then(setS).catch(()=>{});api("/reports/sales/").then(setSales).catch(()=>{});api("/reports/low-stock/").then(d=>setLow(list(d))).catch(()=>{})},[]);
  useEffect(()=>{refresh()},[refresh]);
  useEffect(()=>{if(!live)return;const t=setInterval(refresh,10000);return()=>clearInterval(t)},[live,refresh]);
  useEffect(()=>{if(low.length&&!warned.current){warned.current=true;ui.toast(`${low.length} item(s) low on stock`,{type:"warn",desc:"See the low-stock panel below."})}},[low]);
  const cards=[["Today's sales",Number(s.sales_total||0),CircleDollarSign,"c1",money],["Sales today",Number(s.sales_count||0),Receipt,"c2",n=>Math.round(n)],["Low stock",Number(s.low_stock_count||0),AlertTriangle,"c3",n=>Math.round(n)],["All-time revenue",Number(sales.gross_sales||0),TrendingUp,"c4",money]];
  const quick=[["pos","New sale",ShoppingCart],["productsView","Add product",Package],["purchases","New purchase",Truck],["transfers","Transfer stock",ArrowLeftRight],["customers","Customer",Users],["reports","Reports",BarChart3]];
  return<>
    <div className="banner reveal">
      <h1>Welcome back, {me?.first_name||me?.username||"there"} 👋</h1>
      <p>Here's your store at a glance — start a sale, restock inventory, or review today's numbers.</p>
      <div className="b-actions"><button className="solid"onClick={()=>go("pos")}><ShoppingCart size={16}/>Open Point of Sale</button><button onClick={()=>go("reports")}><BarChart3 size={16}/>View reports</button><button className={live?"livebtn on":"livebtn"}onClick={()=>setLive(v=>!v)}title="Auto-refresh"><span className="livedot"/>{live?"Live":"Paused"}</button></div>
    </div>
    <div className="cards">{cards.map(([t,v,I,c,f],i)=><div className={"card "+c}key={i}style={{animationDelay:(i*70)+"ms"}}><div className="ic"><I size={20}/></div><span>{t}</span><strong><AnimatedNumber value={v}fmt={f}/></strong></div>)}</div>
    {low.length>0&&<div className="section"><h2><AlertTriangle size={17}color="#f59e0b"/>Low stock · {low.length}<button className="ghost"style={{marginLeft:"auto"}}onClick={()=>go("stockCounts")}><ClipboardCheck size={14}/>Count stock</button></h2>
      <div className="table"><table><thead><tr><th>Product</th><th>SKU</th><th>Store</th><th>On hand</th><th>Minimum</th></tr></thead><tbody>{low.slice(0,12).map((r,i)=><tr key={i}><td>{r.product}</td><td>{r.sku}</td><td>{r.store}</td><td><span className="pill warn">{r.quantity}</span></td><td>{r.minimum_stock}</td></tr>)}</tbody></table></div></div>}
    <div className="section"><h2><Zap size={17}/>Quick actions</h2><div className="quick">{quick.map(([k,t,I],i)=><button key={k}onClick={()=>go(k)}style={{animationDelay:(i*45)+"ms"}}><span className="qi"><I size={19}/></span><b>{t}</b><ChevronRight size={16}/></button>)}</div></div>
  </>;
}

/* ---------- POS ---------- */
const TENDERS=[["CASH",Wallet],["CARD",CreditCard],["QR",Tag],["BANK",Building2],["WALLET",Wallet]];
const readHeld=()=>{try{return JSON.parse(localStorage.getItem("nova_held")||"[]")}catch{return[]}};
const writeHeld=h=>localStorage.setItem("nova_held",JSON.stringify(h));
const effUnit=x=>(x.override!==undefined&&x.override!=="")?Number(x.override||0):Number(x.selling_price||0);
function POS({me}){
  const[products,setProducts]=useState([]),[pq,setPq]=useState(""),[code,setCode]=useState(""),[cart,setCart]=useState([]);
  const[registers,setRegisters]=useState([]),[session,setSession]=useState(null),[register,setRegister]=useState(""),[opening,setOpening]=useState("0");
  const[customer,setCustomer]=useState(""),[customers,setCustomers]=useState([]),[priceLists,setPriceLists]=useState([]),[priceList,setPriceList]=useState(""),[discount,setDiscount]=useState("0");
  const[payments,setPayments]=useState({CASH:"",CARD:"",QR:"",BANK:"",WALLET:""}),[err,setErr]=useState(""),[busy,setBusy]=useState(false),[receipt,setReceipt]=useState(null);
  const[held,setHeld]=useState(readHeld),[showHeld,setShowHeld]=useState(false);
  const[showCustom,setShowCustom]=useState(false),[cform,setCform]=useState({name:"",price:"",qty:"1",tax:"0.05"}),[round,setRound]=useState(""),[sel,setSel]=useState(null);
  const ref=useRef();
  useEffect(()=>{
    api("/catalog/products/").then(d=>setProducts(list(d))).catch(()=>{});
    api("/registers/registers/").then(d=>setRegisters(list(d))).catch(x=>setErr(x.message));
    api("/customers/customers/").then(d=>setCustomers(list(d))).catch(()=>{});
    api("/pricing/lists/").then(d=>setPriceLists(list(d))).catch(()=>{});
    api("/registers/sessions/").then(d=>{const s=list(d).find(x=>String(x.status).toUpperCase()==="OPEN");if(s){setSession(s);setRegister(s.register)}}).catch(()=>{});
  },[]);
  function addProduct(p){
    if((p.variants&&p.variants.length)||(p.modifier_groups&&p.modifier_groups.length)){setSel({product:p,variant:"",mods:{}});return}
    setCart(c=>{const o=c.find(x=>x.id===p.id);return o?c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...c,{...p,qty:1,override:"",ldisc:""}]});
  }
  function addConfigured(){
    const p=sel.product,v=(p.variants||[]).find(x=>String(x.id)===String(sel.variant));
    const modIds=Object.values(sel.mods).flat();
    const mods=(p.modifier_groups||[]).flatMap(g=>g.modifiers||[]).filter(m=>modIds.includes(m.id));
    const base=v?Number(v.price):Number(p.selling_price||0);
    const price=Number((base+mods.reduce((a,m)=>a+Number(m.price_delta||0),0)).toFixed(2));
    const name=p.name+(v?` — ${v.name}`:"")+(mods.length?` (+${mods.map(m=>m.name).join(", ")})`:"");
    setCart(c=>[...c,{id:"V"+id(),product_id:p.id,name,selling_price:price,tax_rate:p.tax_rate,qty:1,variant_id:v?v.id:null,modifiers:mods.map(m=>m.id),override:"",ldisc:""}]);
    setSel(null);
  }
  function setLine(idv,patch){setCart(c=>c.map(y=>y.id===idv?{...y,...patch}:y))}
  function park(){if(!cart.length)return;const h=[{id:id(),when:new Date().toLocaleString(),cart,customer,discount,priceList,count:cart.length},...held].slice(0,50);setHeld(h);writeHeld(h);setCart([]);setPayments({CASH:"",CARD:"",QR:"",BANK:"",WALLET:""});ui.toast("Sale parked",{type:"ok",desc:`${h[0].count} items held`})}
  function retrieve(h){setCart(h.cart);setCustomer(h.customer||"");setDiscount(h.discount||"0");setPriceList(h.priceList||"");const rest=held.filter(x=>x.id!==h.id);setHeld(rest);writeHeld(rest);setShowHeld(false);ui.toast("Sale retrieved",{type:"ok"})}
  function delHeld(hid){const rest=held.filter(x=>x.id!==hid);setHeld(rest);writeHeld(rest)}
  function addCustom(e){e.preventDefault();if(!cform.name||!cform.price)return;setCart(c=>[...c,{id:"C"+id(),_custom:true,name:cform.name,selling_price:Number(cform.price),tax_rate:Number(cform.tax||0),qty:Number(cform.qty||1),override:"",ldisc:""}]);setShowCustom(false);setCform({name:"",price:"",qty:"1",tax:"0.05"});ui.toast("Custom item added",{type:"ok"})}
  async function scan(){if(!code.trim())return;setErr("");try{const p=await api(`/catalog/products/lookup/?code=${encodeURIComponent(code.trim())}`);addProduct(p);setCode("");ref.current?.focus()}catch(x){setErr(x.message);ui.toast("Not found",{type:"warn",desc:code})}}
  function dec(idv){setCart(c=>c.map(y=>y.id===idv?{...y,qty:Math.max(1,y.qty-1)}:y))}
  function inc(idv){setCart(c=>c.map(y=>y.id===idv?{...y,qty:y.qty+1}:y))}
  function rm(idv){setCart(c=>c.filter(y=>y.id!==idv))}
  async function openRegister(){try{setBusy(true);const s=await api("/registers/sessions/open/",{method:"POST",body:JSON.stringify({register_id:register,opening_cash:opening})});setSession(s);setErr("");ui.toast("Register opened",{type:"ok"})}catch(x){setErr(x.message);ui.toast("Open failed",{type:"err",desc:x.message})}finally{setBusy(false)}}
  async function closeRegister(){const v=await ui.prompt("Close register",{type:"number",value:"0",desc:"Enter counted (actual) closing cash."});if(v===null)return;try{const s=await api(`/registers/sessions/${session.id}/close/`,{method:"POST",body:JSON.stringify({closing_cash:v})});setSession(null);ui.toast("Register closed",{type:"ok",desc:`Difference: ${money(s.difference)}`})}catch(x){ui.toast("Close failed",{type:"err",desc:x.message})}}
  const calc=useMemo(()=>{const lineNet=x=>effUnit(x)*x.qty*(1-Number(x.ldisc||0)/100);const sub=cart.reduce((a,x)=>a+lineNet(x),0),disc=sub*Number(discount||0)/100,tax=cart.reduce((a,x)=>a+lineNet(x)*Number(x.tax_rate||0),0)*(sub?((sub-disc)/sub):0);return{sub,disc,total:Number((sub-disc+tax).toFixed(2)),tax}},[cart,discount]);
  const grand=useMemo(()=>{const inc=Number(round||0);return inc>0?Number((Math.round(calc.total/inc)*inc).toFixed(2)):calc.total},[calc.total,round]);
  const paid=Object.values(payments).reduce((a,v)=>a+Number(v||0),0);
  const remaining=Number((grand-paid).toFixed(2));
  function setPay(m,v){setPayments(p=>({...p,[m]:v}))}
  function payExact(){setPayments({CASH:String(grand.toFixed(2)),CARD:"",QR:"",BANK:"",WALLET:""})}
  async function pay(){
    if(!session||!cart.length)return;
    if(Math.abs(paid-grand)>0.009){setErr(`Payment must equal ${money(grand)} (remaining ${money(remaining)}).`);ui.toast("Balance mismatch",{type:"warn"});return}
    const tender=Object.entries(payments).filter(([,v])=>Number(v)>0).map(([method,amount])=>({method,amount,status:"CAPTURED"}));
    const items=cart.map(x=>x._custom
      ?{custom:true,name:x.name,unit_price:x.selling_price,quantity:x.qty,tax_rate:x.tax_rate,...(Number(x.ldisc)>0?{line_discount_percent:x.ldisc}:{})}
      :{product_id:x.product_id||x.id,quantity:x.qty,...(x.variant_id?{variant_id:x.variant_id}:{}),...(x.modifiers&&x.modifiers.length?{modifiers:x.modifiers}:{}),...(x.override!==""&&x.override!=null?{unit_price_override:x.override}:{}),...(Number(x.ldisc)>0?{line_discount_percent:x.ldisc}:{})});
    const hasOverride=cart.some(x=>x._custom||(x.override!==""&&x.override!=null)||Number(x.ldisc)>0);
    let manager_pin=null;
    if(hasOverride&&me?.role==="CASHIER"){manager_pin=await ui.prompt("Manager approval",{type:"password",desc:"A manager PIN is required to authorize price changes."});if(manager_pin===null)return;}
    try{setBusy(true);setErr("");
      const d=await api("/checkout/executions/execute/",{method:"POST",body:JSON.stringify({session_id:session.id,customer_id:customer||null,discount_percent:discount,price_list_id:priceList||null,round_to:round||null,items,manager_pin,payments:tender})});
      const cust=customers.find(c=>String(c.id)===String(customer));
      setReceipt({transaction_id:d.transaction_id,status:d.status,lines:cart.map(x=>({name:x.name,qty:x.qty,price:effUnit(x),total:effUnit(x)*x.qty*(1-Number(x.ldisc||0)/100)})),...calc,total:grand,tender,customer:cust?.name||"Walk-in",when:new Date().toLocaleString()});
      setCart([]);setPayments({CASH:"",CARD:"",QR:"",BANK:"",WALLET:""});setDiscount("0");
      ui.toast("Sale completed",{type:"ok",desc:d.transaction_id});
      api("/catalog/products/").then(x=>setProducts(list(x))).catch(()=>{});
    }catch(x){setErr(x.message);ui.toast("Checkout failed",{type:"err",desc:x.message})}finally{setBusy(false)}
  }
  const shownP=products.filter(p=>p.active!==false&&(!pq||`${p.name} ${p.sku} ${p.barcode} ${p.category_name}`.toLowerCase().includes(pq.toLowerCase())));
  return<>
    <Head title="Point of Sale"sub="Scan or tap products · automatic discounts & tax · split payments · fast, reliable checkout"/>
    <div className="posbar">{session?
      <div className="sessionbar"><span className="av"><Check size={16}/></span><b>Register session open</b><span className="pill ok">Register #{session.register}</span><span className="muted">Opening {money(session.opening_cash)}</span><button className="ghost"onClick={closeRegister}><LogOut size={14}/>Close register</button></div>:
      <div className="registeropen"><div><b>Open a register to start selling</b><span>A cash session is required before checkout.</span></div>
        <select value={register}onChange={e=>setRegister(e.target.value)}><option value="">Select register…</option>{registers.map(r=><option value={r.id}key={r.id}>{r.name} · {r.code}</option>)}</select>
        <input type="number"step="0.01"value={opening}onChange={e=>setOpening(e.target.value)}placeholder="Opening cash"/>
        <button className="primary"disabled={!register||busy}onClick={openRegister}>Open register</button></div>}
    </div>
    {err&&<div className="error"><AlertTriangle size={15}/>{err}</div>}
    <div className="posgrid">
      <div className="posmain">
        <div className="scan"><Search size={17}/><input ref={ref}autoFocus value={code}onChange={e=>setCode(e.target.value)}onKeyDown={e=>e.key==="Enter"&&scan()}placeholder="Scan barcode / QR / SKU, then Enter"/><button className="primary"onClick={scan}>Add</button><button className="ghost"onClick={()=>setShowCustom(true)}><Plus size={15}/>Custom</button></div>
        <div className="posfilters">
          <select value={customer}onChange={e=>setCustomer(e.target.value)}><option value="">Walk-in customer</option>{customers.map(c=><option key={c.id}value={c.id}>{c.name}{c.phone?" · "+c.phone:""}</option>)}</select>
          <select value={priceList}onChange={e=>setPriceList(e.target.value)}><option value="">Default pricing</option>{priceLists.filter(x=>x.active!==false).map(x=><option key={x.id}value={x.id}>{x.name} · {x.currency}</option>)}</select>
          <input type="number"min="0"max="100"step="0.01"value={discount}onChange={e=>setDiscount(e.target.value)}placeholder="Discount %"/>
          <select value={round}onChange={e=>setRound(e.target.value)}title="Cash rounding"><option value="">No rounding</option><option value="0.05">Round 0.05</option><option value="0.25">Round 0.25</option><option value="0.50">Round 0.50</option><option value="1">Round 1.00</option></select>
        </div>
        <div className="scan"style={{padding:"7px 11px"}}><Search size={15}/><input value={pq}onChange={e=>setPq(e.target.value)}placeholder="Filter product catalog…"/></div>
        <div className="pgrid">{shownP.slice(0,60).map(p=><button className="pcard"key={p.id}onClick={()=>addProduct(p)}>
          <div className="thumb"><img src={productImage(p)}alt={p.name}loading="lazy"onError={e=>{e.target.style.display="none"}}/><Package size={26}className="ph"/>{p.category_name&&<span className="cat">{p.category_name}</span>}<span className="stk"><StockBadge p={p}/></span></div>
          <div className="pinfo"><b>{p.name}</b><small>{p.sku||p.barcode||"—"}</small><div className="price">{money(p.selling_price)}</div></div>
        </button>)}{!shownP.length&&<div className="empty">No products</div>}</div>
        <div className="cart">
          {cart.length?cart.map(x=><div className="cartline"key={x.id}>
            <div><b>{x.name}</b><small>{x.sku}</small>
              <div className="lineedit"><span>@</span><input type="number"step="0.01"value={x.override}placeholder={Number(x.selling_price||0).toFixed(2)}onChange={e=>setLine(x.id,{override:e.target.value})}title="Price override"/><span>−</span><input type="number"step="1"min="0"max="100"value={x.ldisc}placeholder="0"onChange={e=>setLine(x.id,{ldisc:e.target.value})}title="Line discount %"/><span>%</span></div>
            </div>
            <div className="qty"><button onClick={()=>dec(x.id)}>−</button><b>{x.qty}</b><button onClick={()=>inc(x.id)}>+</button><button className="rm"onClick={()=>rm(x.id)}><Trash2 size={14}/></button></div>
            <b className="linetot">{money(effUnit(x)*x.qty*(1-Number(x.ldisc||0)/100))}</b>
          </div>):<div className="empty big"><ShoppingCart size={42}/><b>Cart is empty</b><span>Tap a product card or scan to begin.</span></div>}
        </div>
      </div>
      <aside className="paybox">
        <div className="prow"><span>Subtotal</span><b>{money(calc.sub)}</b></div>
        <div className="prow"><span>Discount</span><b>−{money(calc.disc)}</b></div>
        <div className="prow"><span>Tax (est.)</span><b>{money(calc.tax)}</b></div>
        {round&&<div className="prow"><span>Rounding</span><b>{money(grand-calc.total)}</b></div>}
        <div className="grand"><span>Total due</span><strong>{money(grand)}</strong></div>
        <div className="tender"><b>Split tender</b>{TENDERS.map(([m,I])=><label key={m}><I size={14}/>{m}<input type="number"min="0"step="0.01"value={payments[m]}onChange={e=>setPay(m,e.target.value)}placeholder="0.00"/></label>)}
          <button className="ghost wide"style={{marginTop:6}}onClick={payExact}>Exact cash</button></div>
        <div className={"paystate "+(Math.abs(remaining)<.01?"ok":"bad")}><span>Paid {money(paid)}</span><span>Remaining {money(remaining)}</span></div>
        <button className="primary wide"disabled={!cart.length||!session||busy||Math.abs(remaining)>.01}onClick={pay}>{busy?"Processing…":<>Complete sale · {money(grand)}</>}</button>
        <div className="posrow"><button className="ghost"disabled={!cart.length}onClick={park}><Archive size={14}/>Park</button><button className="ghost"onClick={()=>setShowHeld(true)}><Clock3 size={14}/>Held ({held.length})</button></div>
        <button className="ghost clear"onClick={()=>{setCart([]);setPayments({CASH:"",CARD:"",QR:"",BANK:"",WALLET:""})}}>Clear cart</button>
      </aside>
    </div>
    {receipt&&<div className="overlay"onMouseDown={()=>setReceipt(null)}><div className="modal"style={{maxWidth:420}}onMouseDown={e=>e.stopPropagation()}>
      <div className="modalhead"><h2>Sale receipt</h2><button onClick={()=>setReceipt(null)}><X/></button></div>
      <div className="receipt">
        <div className="r-h">{BRAND.logo&&<img src={BRAND.logo}alt=""style={{height:44,borderRadius:8,margin:"0 auto 6px",display:"block"}}/>}<b>{BRAND.name||"S POS"}</b><div>Tax Invoice</div><small>{receipt.when}</small></div>
        <div className="r-l"><span>Txn</span><span>{receipt.transaction_id}</span></div>
        <div className="r-l"><span>Customer</span><span>{receipt.customer}</span></div><hr/>
        {receipt.lines.map((l,i)=><div className="r-l"key={i}><span>{l.qty}× {l.name}</span><span>{money(l.total)}</span></div>)}<hr/>
        <div className="r-l"><span>Subtotal</span><span>{money(receipt.sub)}</span></div>
        <div className="r-l"><span>Discount</span><span>−{money(receipt.disc)}</span></div>
        <div className="r-l"><span>Tax</span><span>{money(receipt.tax)}</span></div>
        <div className="r-l"style={{fontWeight:700,fontSize:14}}><span>TOTAL</span><span>{money(receipt.total)}</span></div><hr/>
        {receipt.tender.map((t,i)=><div className="r-l"key={i}><span>{t.method}</span><span>{money(t.amount)}</span></div>)}
        <div className="r-h"style={{marginTop:10}}><small>Thank you for shopping!</small></div>
      </div>
      <div className="modalactions"><button className="ghost"onClick={()=>window.print()}><Printer size={15}/>Print</button><button className="primary"onClick={()=>setReceipt(null)}>New sale</button></div>
    </div></div>}
    {showHeld&&<div className="overlay"onMouseDown={()=>setShowHeld(false)}><div className="modal"style={{maxWidth:520}}onMouseDown={e=>e.stopPropagation()}><div className="modalhead"><h2>Parked sales ({held.length})</h2><button onClick={()=>setShowHeld(false)}><X/></button></div>
      {held.length?held.map(h=><div className="heldrow"key={h.id}><div><b>{h.count} item{h.count>1?"s":""}</b><small>{h.when}</small></div><div className="actions"><button className="ghost"onClick={()=>retrieve(h)}>Retrieve</button><button className="danger"onClick={()=>delHeld(h.id)}><Trash2 size={14}/></button></div></div>):<div className="empty">No parked sales</div>}
    </div></div>}
    {showCustom&&<div className="overlay"onMouseDown={()=>setShowCustom(false)}><div className="modal"style={{maxWidth:440}}onMouseDown={e=>e.stopPropagation()}><div className="modalhead"><h2>Custom / open item</h2><button onClick={()=>setShowCustom(false)}><X/></button></div>
      <form onSubmit={addCustom}><label>Name<input autoFocus value={cform.name}onChange={e=>setCform({...cform,name:e.target.value})}required/></label><div className="formgrid"><label>Unit price<input type="number"step="0.01"min="0"value={cform.price}onChange={e=>setCform({...cform,price:e.target.value})}required/></label><label>Quantity<input type="number"step="0.001"min="0.001"value={cform.qty}onChange={e=>setCform({...cform,qty:e.target.value})}/></label></div><label>Tax rate (e.g. 0.05 = 5%)<input type="number"step="0.0001"min="0"value={cform.tax}onChange={e=>setCform({...cform,tax:e.target.value})}/></label><p className="muted">Custom-priced items require manager authorization at checkout.</p><div className="modalactions"><button type="button"className="ghost"onClick={()=>setShowCustom(false)}>Cancel</button><button className="primary">Add to cart</button></div></form>
    </div></div>}
    {sel&&<div className="overlay"onMouseDown={()=>setSel(null)}><div className="modal"style={{maxWidth:460}}onMouseDown={e=>e.stopPropagation()}><div className="modalhead"><h2>{sel.product.name}</h2><button onClick={()=>setSel(null)}><X/></button></div>
      {sel.product.variants?.length>0&&<><h3>Choose variant</h3><div className="varlist">{sel.product.variants.filter(v=>v.active!==false).map(v=><label key={v.id}className={"varopt"+(String(sel.variant)===String(v.id)?" on":"")}><span>{v.name}</span><b>{money(v.price)}</b><input type="radio"name="variant"checked={String(sel.variant)===String(v.id)}onChange={()=>setSel(s=>({...s,variant:v.id}))}/></label>)}</div></>}
      {(sel.product.modifier_groups||[]).map(g=><div key={g.id}><h3>{g.name}{g.max_select?` · up to ${g.max_select}`:""}</h3><div className="varlist">{(g.modifiers||[]).filter(m=>m.active!==false).map(m=>{const on=(sel.mods[g.id]||[]).includes(m.id);return<label key={m.id}className={"varopt"+(on?" on":"")}><span>{m.name}</span><b>{Number(m.price_delta)?"+"+money(m.price_delta):"—"}</b><input type="checkbox"checked={on}onChange={()=>setSel(s=>{const cur=s.mods[g.id]||[];const nx=on?cur.filter(x=>x!==m.id):[...cur,m.id].slice(-Math.max(1,g.max_select||1));return{...s,mods:{...s.mods,[g.id]:nx}}})}/></label>})}</div></div>)}
      <div className="modalactions"><button className="ghost"onClick={()=>setSel(null)}>Cancel</button><button className="primary"disabled={sel.product.variants?.length>0&&!sel.variant}onClick={addConfigured}>Add to cart</button></div>
    </div></div>}
  </>;
}

/* ---------- purchasing ---------- */
function PurchasePage(){
  const[suppliers,setSuppliers]=useState([]),[stores,setStores]=useState([]),[products,setProducts]=useState([]),[purchases,setPurchases]=useState([]),[form,setForm]=useState({supplier:"",store:"",invoice_number:"",tax_amount:"0"}),[items,setItems]=useState([]),[receiving,setReceiving]=useState(null),[receiveRows,setReceiveRows]=useState([]),[err,setErr]=useState("");
  const load=()=>api("/purchasing/purchases/").then(d=>setPurchases(list(d))).catch(x=>setErr(x.message));
  useEffect(()=>{api("/purchasing/suppliers/").then(d=>setSuppliers(list(d)));api("/stores/stores/").then(d=>setStores(list(d)));api("/catalog/products/").then(d=>setProducts(list(d)));load()},[]);
  function add(){setItems([...items,{product:"",quantity:"1",unit_cost:"0",tax_rate:"0.05"}])}
  async function create(e){e.preventDefault();try{await api("/purchasing/purchases/",{method:"POST",body:JSON.stringify({...form,items})});setItems([]);setForm({...form,invoice_number:""});load();ui.toast("Purchase created",{type:"ok"})}catch(x){setErr(x.message);ui.toast("Failed",{type:"err",desc:x.message})}}
  function beginReceive(p){setReceiving(p);setReceiveRows((p.items||[]).filter(i=>Number(i.quantity)>Number(i.received_quantity||0)).map(i=>({item_id:i.id,product:i.product,quantity:String(Number(i.quantity)-Number(i.received_quantity||0))})));setErr("")}
  async function receive(){try{const its=receiveRows.filter(x=>Number(x.quantity)>0).map(x=>({item_id:x.item_id,quantity:x.quantity}));if(!its.length)throw Error("Enter at least one quantity");await api(`/purchasing/purchases/${receiving.id}/receive/`,{method:"POST",body:JSON.stringify({items:its})});setReceiving(null);load();ui.toast("Stock received",{type:"ok"})}catch(x){setErr(x.message);ui.toast("Failed",{type:"err",desc:x.message})}}
  return<><Head title="Purchasing"sub="Create purchases and receive stock partially or fully"/>
    <div className="notice">Totals and stock effects are calculated by the backend. The tax field is an optional estimate.</div>
    {err&&<div className="error"><AlertTriangle size={15}/>{err}</div>}
    <div className="split"><div className="section"><h2>New purchase</h2><form onSubmit={create}>
      <label>Supplier<select value={form.supplier}onChange={e=>setForm({...form,supplier:e.target.value})}required><option value="">Select…</option>{suppliers.map(x=><option key={x.id}value={x.id}>{x.name}</option>)}</select></label>
      <label>Store<select value={form.store}onChange={e=>setForm({...form,store:e.target.value})}required><option value="">Select…</option>{stores.map(x=><option key={x.id}value={x.id}>{x.name}</option>)}</select></label>
      <label>Invoice number<input value={form.invoice_number}onChange={e=>setForm({...form,invoice_number:e.target.value})}required/></label>
      <label>Tax estimate<input type="number"step="0.01"value={form.tax_amount}onChange={e=>setForm({...form,tax_amount:e.target.value})}/></label>
      <h3>Items</h3>{items.map((x,i)=><div className="itemrow"key={i}><select value={x.product}onChange={e=>{const a=[...items];a[i].product=e.target.value;setItems(a)}}><option value="">Product</option>{products.map(p=><option key={p.id}value={p.id}>{p.name} · {p.sku}</option>)}</select><input type="number"min="0.001"step="0.001"value={x.quantity}onChange={e=>{const a=[...items];a[i].quantity=e.target.value;setItems(a)}}/><input type="number"min="0"step="0.01"value={x.unit_cost}onChange={e=>{const a=[...items];a[i].unit_cost=e.target.value;setItems(a)}}/><button type="button"onClick={()=>setItems(items.filter((_,j)=>j!==i))}><Trash2 size={14}/></button></div>)}
      <button type="button"className="ghost"onClick={add}>+ Add item</button><div className="modalactions"><button className="primary">Create purchase</button></div></form></div>
    <div className="section"><h2>Purchases</h2><div className="table"><table><thead><tr><th>Invoice</th><th>Supplier</th><th>Store</th><th>Status</th><th>Total</th><th/></tr></thead><tbody>{purchases.map(p=><tr key={p.id}><td>{p.invoice_number}</td><td>{p.supplier}</td><td>{p.store}</td><td><span className={"pill "+(p.status==="RECEIVED"?"ok":"info")}>{p.status}</span></td><td>{money(p.total_amount)}</td><td>{p.status!=="RECEIVED"&&<button className="ghost"onClick={()=>beginReceive(p)}>Receive</button>}</td></tr>)}{!purchases.length&&<tr><td className="empty"colSpan={6}>No purchases</td></tr>}</tbody></table></div></div></div>
    {receiving&&<div className="overlay"onMouseDown={()=>setReceiving(null)}><div className="modal"onMouseDown={e=>e.stopPropagation()}><div className="modalhead"><h2>Receive · {receiving.invoice_number}</h2><button onClick={()=>setReceiving(null)}><X/></button></div>{receiveRows.map((x,i)=><label key={x.item_id}>Item #{x.item_id} · Product {x.product}<input type="number"min="0"step="0.001"value={x.quantity}onChange={e=>{const a=[...receiveRows];a[i]={...a[i],quantity:e.target.value};setReceiveRows(a)}}/></label>)}<div className="modalactions"><button className="ghost"onClick={()=>setReceiving(null)}>Cancel</button><button className="primary"onClick={receive}>Receive</button></div></div></div>}
  </>;
}

/* ---------- transfers ---------- */
function TransferPage(){
  const[stores,setStores]=useState([]),[products,setProducts]=useState([]),[rows,setRows]=useState([]),[form,setForm]=useState({source_store_id:"",destination_store_id:""}),[items,setItems]=useState([]),[receiving,setReceiving]=useState(null),[receiveRows,setReceiveRows]=useState([]),[err,setErr]=useState("");
  const load=()=>api("/inventory/transfers/").then(d=>setRows(list(d))).catch(x=>setErr(x.message));
  useEffect(()=>{api("/stores/stores/").then(d=>setStores(list(d)));api("/catalog/products/").then(d=>setProducts(list(d)));load()},[]);
  function add(){setItems([...items,{product:"",quantity:"1"}])}
  async function create(e){e.preventDefault();try{await api("/inventory/transfers/create/",{method:"POST",body:JSON.stringify({...form,items})});setItems([]);load();ui.toast("Transfer created",{type:"ok"})}catch(x){setErr(x.message);ui.toast("Failed",{type:"err",desc:x.message})}}
  function beginReceive(r){setReceiving(r);setReceiveRows((r.items||[]).filter(i=>Number(i.quantity)>Number(i.received_quantity||0)).map(i=>({item_id:i.id,product:i.product,quantity:String(Number(i.quantity)-Number(i.received_quantity||0))})))}
  async function receive(){try{const its=receiveRows.filter(x=>Number(x.quantity)>0).map(x=>({item_id:x.item_id,quantity:x.quantity}));if(!its.length)throw Error("Enter a quantity");await api(`/inventory/transfers/${receiving.id}/receive/`,{method:"POST",body:JSON.stringify({items:its})});setReceiving(null);load();ui.toast("Received",{type:"ok"})}catch(x){setErr(x.message)}}
  async function ship(idv){try{await api(`/inventory/transfers/${idv}/ship/`,{method:"POST",body:JSON.stringify({})});load();ui.toast("Shipped",{type:"ok"})}catch(x){setErr(x.message)}}
  return<><Head title="Transfers"sub="Create, ship and receive inter-store stock transfers"/>{err&&<div className="error"><AlertTriangle size={15}/>{err}</div>}
    <div className="split"><div className="section"><h2>Create transfer</h2><form onSubmit={create}>
      <label>Source store<select value={form.source_store_id}onChange={e=>setForm({...form,source_store_id:e.target.value})}required><option value="">Select…</option>{stores.map(s=><option key={s.id}value={s.id}>{s.name}</option>)}</select></label>
      <label>Destination store<select value={form.destination_store_id}onChange={e=>setForm({...form,destination_store_id:e.target.value})}required><option value="">Select…</option>{stores.map(s=><option key={s.id}value={s.id}>{s.name}</option>)}</select></label>
      {items.map((x,i)=><div className="itemrow"key={i}><select value={x.product}onChange={e=>{const a=[...items];a[i].product=e.target.value;setItems(a)}}><option value="">Product</option>{products.map(p=><option key={p.id}value={p.id}>{p.name}</option>)}</select><input type="number"min="0.001"step="0.001"value={x.quantity}onChange={e=>{const a=[...items];a[i].quantity=e.target.value;setItems(a)}}/><span/><button type="button"onClick={()=>setItems(items.filter((_,j)=>j!==i))}><Trash2 size={14}/></button></div>)}
      <button type="button"className="ghost"onClick={add}>+ Add item</button><div className="modalactions"><button className="primary">Create transfer</button></div></form></div>
    <div className="section"><h2>Transfer queue</h2><div className="table"><table><thead><tr><th>Number</th><th>Source</th><th>Destination</th><th>Status</th><th/></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.transfer_number}</td><td>{r.source_store}</td><td>{r.destination_store}</td><td><span className="pill info">{r.status}</span></td><td className="actions">{r.status==="APPROVED"&&<button className="ghost"onClick={()=>ship(r.id)}>Ship</button>}{r.status==="SHIPPED"&&<button className="ghost"onClick={()=>beginReceive(r)}>Receive</button>}</td></tr>)}{!rows.length&&<tr><td className="empty"colSpan={5}>No transfers</td></tr>}</tbody></table></div></div></div>
    {receiving&&<div className="overlay"onMouseDown={()=>setReceiving(null)}><div className="modal"onMouseDown={e=>e.stopPropagation()}><div className="modalhead"><h2>Receive · {receiving.transfer_number}</h2><button onClick={()=>setReceiving(null)}><X/></button></div>{receiveRows.map((x,i)=><label key={x.item_id}>Item #{x.item_id}<input type="number"min="0"step="0.001"value={x.quantity}onChange={e=>{const a=[...receiveRows];a[i]={...a[i],quantity:e.target.value};setReceiveRows(a)}}/></label>)}<div className="modalactions"><button className="ghost"onClick={()=>setReceiving(null)}>Cancel</button><button className="primary"onClick={receive}>Receive</button></div></div></div>}
  </>;
}

/* ---------- sales + refunds + receipt ---------- */
function SalesPage(){
  const[rows,setRows]=useState([]),[err,setErr]=useState(""),[refundSale,setRefundSale]=useState(null),[refundRows,setRefundRows]=useState([]),[reason,setReason]=useState(""),[busy,setBusy]=useState(false),[receipt,setReceipt]=useState(null),[q,setQ]=useState("");
  const load=()=>api("/sales/sales/").then(d=>setRows(list(d))).catch(x=>setErr(x.message));
  useEffect(()=>{load()},[]);
  const shown=rows.filter(r=>!q||`${r.invoice_number} ${r.customer||""} ${r.status}`.toLowerCase().includes(q.toLowerCase()));
  async function emailReceipt(){const to=await ui.prompt("Email receipt to",{type:"email",value:""});if(!to)return;try{await api(`/sales/sales/${receipt._id}/email-receipt/`,{method:"POST",body:JSON.stringify({to})});ui.toast("Receipt emailed",{type:"ok",desc:to})}catch(x){ui.toast("Email failed",{type:"err",desc:x.message})}}
  function beginRefund(r){const available=(r.items||[]).filter(i=>Number(i.quantity)>Number(i.refunded_quantity||0));setRefundSale(r);setReason("");setRefundRows(available.map(i=>({sale_item_id:i.id,product_name:i.product_name||i.sku||`Item ${i.id}`,max:Number(i.quantity)-Number(i.refunded_quantity||0),quantity:Number(i.quantity)-Number(i.refunded_quantity||0)})))}
  async function voidSale(r){if(!await ui.confirm(`Void invoice ${r.invoice_number}?`,"Inventory and accounting will be reversed.",{danger:true,ok:"Void"}))return;const reason=await ui.prompt("Void reason",{value:""});if(reason===null)return;try{setBusy(true);await api(`/sales/sales/${r.id}/void/`,{method:"POST",body:JSON.stringify({reason})});load();ui.toast("Voided",{type:"ok"})}catch(x){setErr(x.message);ui.toast("Void failed",{type:"err",desc:x.message})}finally{setBusy(false)}}
  async function viewReceipt(r){try{const d=await api(`/sales/sales/${r.id}/receipt/`);setReceipt({...d,_id:r.id})}catch(x){ui.toast("Receipt failed",{type:"err",desc:x.message})}}
  async function submitRefund(e){e.preventDefault();if(!refundSale)return;const items=refundRows.filter(x=>Number(x.quantity)>0).map(x=>({sale_item_id:x.sale_item_id,quantity:x.quantity}));if(!items.length){setErr("Enter at least one refund quantity.");return}try{setBusy(true);setErr("");await api(`/sales/sales/${refundSale.id}/refund/`,{method:"POST",body:JSON.stringify({reason,items})});setRefundSale(null);load();ui.toast("Refund processed",{type:"ok"})}catch(x){setErr(x.message);ui.toast("Refund failed",{type:"err",desc:x.message})}finally{setBusy(false)}}
  const cols=["invoice_number","store","customer","status","subtotal","discount_amount","tax_amount","total_amount","created_at"];
  return<><Head title="Sales"sub="Completed sales, controlled voids and partial or full refunds"/>{err&&<div className="error"><AlertTriangle size={15}/>{err}</div>}
    <div className="toolbar"><div className="search"><Search size={16}/><input value={q}onChange={e=>setQ(e.target.value)}placeholder="Find sale by invoice / customer for return…"/></div><button className="ghost"onClick={load}><RefreshCw size={15}/>Refresh</button><span>{shown.length} sales</span></div>
    <div className="table"><table><thead><tr>{cols.map(x=><th key={x}>{label(x)}</th>)}<th>Actions</th></tr></thead><tbody>{shown.map(r=><tr key={r.id}>
      <td>{r.invoice_number}</td><td>{r.store}</td><td>{r.customer||"—"}</td><td><span className={"pill "+(r.status==="COMPLETED"?"ok":r.status==="VOID"?"bad":"warn")}>{r.status}</span></td><td>{money(r.subtotal)}</td><td>{money(r.discount_amount)}</td><td>{money(r.tax_amount)}</td><td><b>{money(r.total_amount)}</b></td><td>{String(r.created_at||"").slice(0,19).replace("T"," ")}</td>
      <td className="actions"><button title="Receipt"onClick={()=>viewReceipt(r)}><Receipt size={14}/></button>{r.status==="COMPLETED"&&<><button title="Void"disabled={busy}onClick={()=>voidSale(r)}><X size={14}/></button><button title="Refund"disabled={busy}onClick={()=>beginRefund(r)}><RefreshCw size={14}/></button></>}</td>
    </tr>)}{!shown.length&&<tr><td className="empty"colSpan={cols.length+1}>No sales found</td></tr>}</tbody></table></div>
    {refundSale&&<div className="overlay"onMouseDown={()=>setRefundSale(null)}><div className="modal"onMouseDown={e=>e.stopPropagation()}><div className="modalhead"><h2>Refund · {refundSale.invoice_number}</h2><button onClick={()=>setRefundSale(null)}><X/></button></div><form onSubmit={submitRefund}><p className="muted">Select quantities to return. The server computes the refund and reverses inventory/accounting.</p>{refundRows.map((x,i)=><label key={x.sale_item_id}>{x.product_name} · max {x.max}<input type="number"min="0"max={x.max}step="0.001"value={x.quantity}onChange={e=>{const a=[...refundRows];a[i]={...a[i],quantity:Math.min(x.max,Math.max(0,Number(e.target.value)||0))};setRefundRows(a)}}/></label>)}<label>Reason<textarea value={reason}onChange={e=>setReason(e.target.value)}/></label><div className="modalactions"><button type="button"className="ghost"onClick={()=>setRefundSale(null)}>Cancel</button><button className="primary"disabled={busy}>Confirm refund</button></div></form></div></div>}
    {receipt&&<div className="overlay"onMouseDown={()=>setReceipt(null)}><div className="modal"style={{maxWidth:420}}onMouseDown={e=>e.stopPropagation()}><div className="modalhead"><h2>Receipt</h2><button onClick={()=>setReceipt(null)}><X/></button></div>
      <div className="receipt"><div className="r-h">{BRAND.logo&&<img src={BRAND.logo}alt=""style={{height:44,borderRadius:8,margin:"0 auto 6px",display:"block"}}/>}<b>{receipt.store||BRAND.name||"S POS"}</b><div>Invoice {receipt.invoice_number}</div><small>{String(receipt.created_at||"").slice(0,19).replace("T"," ")}</small></div>
        <div className="r-l"><span>Cashier</span><span>{receipt.cashier}</span></div><div className="r-l"><span>Customer</span><span>{receipt.customer||"Walk-in"}</span></div><hr/>
        {(receipt.items||[]).map((l,i)=><div className="r-l"key={i}><span>{l.quantity}× {l.name}</span><span>{money(l.line_total)}</span></div>)}<hr/>
        <div className="r-l"><span>Subtotal</span><span>{money(receipt.subtotal)}</span></div><div className="r-l"><span>Discount</span><span>−{money(receipt.discount_amount)}</span></div><div className="r-l"><span>Tax</span><span>{money(receipt.tax_amount)}</span></div>
        <div className="r-l"style={{fontWeight:700,fontSize:14}}><span>TOTAL</span><span>{money(receipt.total_amount)}</span></div><hr/>
        {(receipt.payments||[]).map((p,i)=><div className="r-l"key={i}><span>{p.method}</span><span>{money(p.amount)}</span></div>)}{receipt.tax_number&&<div className="r-l"><span>Tax No.</span><span>{receipt.tax_number}</span></div>}{receipt.qr&&<div style={{textAlign:"center",marginTop:12}}><img src={receipt.qr}alt="Fiscal QR"style={{width:110,height:110}}/><div style={{fontSize:10,color:"#888"}}>Scan for tax verification</div></div>}</div>
      <div className="modalactions"><button className="ghost"onClick={emailReceipt}>Email</button><button className="ghost"onClick={()=>window.print()}><Printer size={15}/>Print</button><button className="primary"onClick={()=>setReceipt(null)}>Close</button></div></div></div>}
  </>;
}

/* ---------- reports ---------- */
function Reports(){
  const[d,setD]=useState({}),[s,setS]=useState({}),[z,setZ]=useState({}),[x,setX]=useState({}),[byItem,setByItem]=useState([]),[byCashier,setByCashier]=useState([]),[byHour,setByHour]=useState([]),[filters,setFilters]=useState({date:"",start:"",end:"",store_id:"",register_id:"",register_session_id:"",cashier_id:""}),[stores,setStores]=useState([]),[registers,setRegisters]=useState([]),[sessions,setSessions]=useState([]),[users,setUsers]=useState([]),[err,setErr]=useState("");
  useEffect(()=>{api("/stores/stores/").then(a=>setStores(list(a))).catch(()=>{});api("/registers/registers/").then(a=>setRegisters(list(a))).catch(()=>{});api("/registers/sessions/").then(a=>setSessions(list(a))).catch(()=>{});api("/auth/users/").then(a=>setUsers(list(a))).catch(()=>{});load()},[]);
  function qs(){const q=new URLSearchParams;Object.entries(filters).forEach(([k,v])=>{if(v)q.set(k,v)});return q.toString()?`?${q}`:""}
  function load(){const q=qs();setErr("");Promise.all([api(`/reports/dashboard/${q}`),api(`/reports/sales/${q}`),api(`/reports/z-report/${q}`),api(`/reports/x-report/${q}`),api(`/reports/by-item/${q}`),api(`/reports/by-cashier/${q}`),api(`/reports/by-hour/${q}`)]).then(([a,b,c,e,f,g,h])=>{setD(a);setS(b);setZ(c);setX(e);setByItem(list(f));setByCashier(list(g));setByHour(list(h))}).catch(x=>setErr(x.message))}
  const cards=[["Sales count",d.sales_count??s.sales_count??"—",Receipt,"c2"],["Gross sales",money(s.gross_sales),CircleDollarSign,"c1"],["Tax",money(s.tax),Percent,"c3"],["Low stock",d.low_stock_count??"—",AlertTriangle,"c4"]];
  return<><Head title="Reports"sub="Filtered dashboard, sales, X (mid-shift) and Z reports"/>{err&&<div className="error"><AlertTriangle size={15}/>{err}</div>}
    <div className="section"><h2>Filters</h2><div className="formgrid">
      <label>Date<input type="date"value={filters.date}onChange={e=>setFilters({...filters,date:e.target.value})}/></label>
      <label>Start<input type="date"value={filters.start}onChange={e=>setFilters({...filters,start:e.target.value})}/></label>
      <label>End<input type="date"value={filters.end}onChange={e=>setFilters({...filters,end:e.target.value})}/></label>
      <label>Store<select value={filters.store_id}onChange={e=>setFilters({...filters,store_id:e.target.value})}><option value="">All stores</option>{stores.map(x=><option key={x.id}value={x.id}>{x.name}</option>)}</select></label>
      <label>Register<select value={filters.register_id}onChange={e=>setFilters({...filters,register_id:e.target.value})}><option value="">All registers</option>{registers.map(x=><option key={x.id}value={x.id}>{x.name}</option>)}</select></label>
      <label>Cashier<select value={filters.cashier_id}onChange={e=>setFilters({...filters,cashier_id:e.target.value})}><option value="">All cashiers</option>{users.map(x=><option key={x.id}value={x.id}>{x.username}</option>)}</select></label>
    </div><button className="primary"onClick={load}>Apply filters</button></div>
    <div className="cards">{cards.map(([t,v,I,c],i)=><div className={"card "+c}key={i}><div className="ic"><I size={20}/></div><span>{t}</span><strong>{v}</strong></div>)}</div>
    <div className="reportgrid">
      <div className="section"><h2>Sales report</h2><div className="metric"><span>Gross sales</span><b>{money(s.gross_sales)}</b></div><div className="metric"><span>Discounts</span><b>{money(s.discounts)}</b></div><div className="metric"><span>Tax</span><b>{money(s.tax)}</b></div><h3>Payments</h3>{(s.payments||[]).map(p=><div className="metric"key={p.method}><span>{p.method}</span><b>{money(p.total)}</b></div>)}</div>
      <div className="section"><h2>X report · open shift</h2><div className="metric"><span>Open sessions</span><b>{x.open_sessions??"—"}</b></div><div className="metric"><span>Sales</span><b>{x.sales_count??"—"}</b></div><div className="metric"><span>Gross</span><b>{money(x.gross_sales)}</b></div><h3>Z report</h3><div className="metric"><span>Sales</span><b>{z.sales_count??"—"}</b></div><div className="metric"><span>Gross</span><b>{money(z.gross_sales)}</b></div><div className="metric"><span>Tax</span><b>{money(z.tax)}</b></div></div>
    </div>
    <div className="section"><h2>Sales by item<button className="ghost"style={{marginLeft:"auto"}}onClick={()=>downloadCSV(byItem,"sales-by-item.csv")}><FileText size={14}/>Export CSV</button></h2>
      <div className="table"><table><thead><tr><th>Product</th><th>SKU</th><th>Qty sold</th><th>Revenue</th><th>Margin</th></tr></thead><tbody>{byItem.map((r,i)=><tr key={i}><td>{r.product_name}</td><td>{r.sku}</td><td>{Number(r.quantity||0).toFixed(3)}</td><td>{money(r.revenue)}</td><td>{money(r.margin)}</td></tr>)}{!byItem.length&&<tr><td className="empty"colSpan={5}>No data for this filter</td></tr>}</tbody></table></div></div>
    <div className="reportgrid">
      <div className="section"><h2>By cashier<button className="ghost"style={{marginLeft:"auto"}}onClick={()=>downloadCSV(byCashier,"by-cashier.csv")}><FileText size={14}/>CSV</button></h2>{byCashier.map((r,i)=><div className="metric"key={i}><span>{r.cashier__username||"—"} · {r.sales_count} sales</span><b>{money(r.total)}</b></div>)}{!byCashier.length&&<div className="empty">No data</div>}</div>
      <div className="section"><h2>By hour<button className="ghost"style={{marginLeft:"auto"}}onClick={()=>downloadCSV(byHour,"by-hour.csv")}><FileText size={14}/>CSV</button></h2>{byHour.map((r,i)=><div className="metric"key={i}><span>{String(r.hour).padStart(2,"0")}:00 · {r.sales_count} sales</span><b>{money(r.total)}</b></div>)}{!byHour.length&&<div className="empty">No data</div>}</div>
    </div>
  </>;
}

/* ---------- payment intents ---------- */
function PaymentIntentPage(){
  const[rows,setRows]=useState([]),[form,setForm]=useState({method:"CARD",amount:"0",currency:"QAR",provider:"",metadata:"{}"}),[err,setErr]=useState("");
  const load=()=>api("/payments/intents/").then(d=>setRows(list(d))).catch(x=>setErr(x.message));useEffect(()=>{load()},[]);
  async function create(e){e.preventDefault();try{let metadata={};try{metadata=JSON.parse(form.metadata||"{}")}catch{throw Error("Metadata must be valid JSON")}await api("/payments/intents/create-intent/",{method:"POST",body:JSON.stringify({...form,metadata})});setForm({...form,amount:"0",metadata:"{}"});load();ui.toast("Intent created",{type:"ok"})}catch(x){setErr(x.message)}}
  async function transition(r){const state=await ui.prompt("New state",{value:r.state||"CAPTURED",desc:"PENDING/AUTHORIZED/CAPTURED/FAILED/REFUNDED"});if(state===null)return;try{await api(`/payments/intents/${r.id}/transition/`,{method:"POST",body:JSON.stringify({state})});load();ui.toast("Transitioned",{type:"ok"})}catch(x){setErr(x.message)}}
  return<><Head title="Payment Intents"sub="Create and transition provider payment intents"/>{err&&<div className="error"><AlertTriangle size={15}/>{err}</div>}
    <div className="split"><div className="section"><h2>Create intent</h2><form onSubmit={create}>
      <label>Method<select value={form.method}onChange={e=>setForm({...form,method:e.target.value})}>{["CASH","CARD","QR","BANK","WALLET"].map(m=><option key={m}>{m}</option>)}</select></label>
      <label>Amount<input type="number"step="0.01"min="0.01"value={form.amount}onChange={e=>setForm({...form,amount:e.target.value})}required/></label>
      <label>Currency<input value={form.currency}onChange={e=>setForm({...form,currency:e.target.value})}/></label>
      <label>Provider<input value={form.provider}onChange={e=>setForm({...form,provider:e.target.value})}/></label>
      <label>Metadata JSON<textarea value={form.metadata}onChange={e=>setForm({...form,metadata:e.target.value})}/></label><button className="primary">Create intent</button></form></div>
    <div className="section"><h2>Intent queue</h2><div className="table"><table><thead><tr><th>Intent</th><th>Method</th><th>Amount</th><th>State</th><th/></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.intent_id}</td><td>{r.method}</td><td>{money(r.amount)} {r.currency}</td><td><span className="pill info">{r.state}</span></td><td><button className="ghost"onClick={()=>transition(r)}>Transition</button></td></tr>)}{!rows.length&&<tr><td className="empty"colSpan={5}>No intents</td></tr>}</tbody></table></div></div></div>
  </>;
}

/* ---------- users ---------- */
function UsersPage(){
  const[rows,setRows]=useState([]),[stores,setStores]=useState([]),[editing,setEditing]=useState(null),[form,setForm]=useState({username:"",password:"",first_name:"",last_name:"",email:"",phone:"",role:"CASHIER",store:"",is_active:true}),[pinUser,setPinUser]=useState(null),[pin,setPin]=useState(""),[err,setErr]=useState("");
  const load=()=>api("/auth/users/").then(d=>setRows(list(d))).catch(x=>setErr(x.message));
  useEffect(()=>{load();api("/stores/stores/").then(d=>setStores(list(d))).catch(()=>{})},[]);
  function reset(){setForm({username:"",password:"",first_name:"",last_name:"",email:"",phone:"",role:"CASHIER",store:"",is_active:true});setEditing(null)}
  async function submit(e){e.preventDefault();setErr("");try{
    if(editing){const body={username:form.username,first_name:form.first_name,last_name:form.last_name,email:form.email,phone:form.phone,role:form.role,store:form.store||null,is_active:form.is_active!==false};await api(`/auth/users/${editing.id}/`,{method:"PATCH",body:JSON.stringify(body)})}
    else{const body={...form};if(!body.store)delete body.store;await api("/auth/register/",{method:"POST",body:JSON.stringify(body)})}
    reset();load();ui.toast("User saved",{type:"ok"})}catch(x){setErr(x.message);ui.toast("Failed",{type:"err",desc:x.message})}}
  async function setUserPin(e){e.preventDefault();setErr("");try{await api(`/auth/users/${pinUser.id}/pin/`,{method:"POST",body:JSON.stringify({pin})});setPinUser(null);setPin("");ui.toast("PIN set",{type:"ok"})}catch(x){setErr(x.message)}}
  return<><Head title="Users & Access"sub="Create staff accounts, assign roles/stores and manage PIN access"/>{err&&<div className="error"><AlertTriangle size={15}/>{err}</div>}
    <div className="split"><div className="section"><h2>{editing?"Edit user":"Create user"}</h2><form onSubmit={submit}>
      <label>Username<input value={form.username}onChange={e=>setForm({...form,username:e.target.value})}required/></label>
      <label>Password<input type="password"value={form.password}onChange={e=>setForm({...form,password:e.target.value})}{...(editing?{}:{required:true})}/></label>
      <div className="formgrid"><label>First name<input value={form.first_name}onChange={e=>setForm({...form,first_name:e.target.value})}/></label><label>Last name<input value={form.last_name}onChange={e=>setForm({...form,last_name:e.target.value})}/></label></div>
      <label>Email<input type="email"value={form.email}onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label>Role<select value={form.role}onChange={e=>setForm({...form,role:e.target.value})}>{["CASHIER","MANAGER","ADMIN","INVENTORY"].map(r=><option key={r}>{r}</option>)}</select></label>
      <label>Store<select value={form.store}onChange={e=>setForm({...form,store:e.target.value})}><option value="">No store</option>{stores.map(x=><option key={x.id}value={x.id}>{x.name}</option>)}</select></label>
      {editing&&<label style={{flexDirection:"row",alignItems:"center",gap:8}}><input type="checkbox"checked={form.is_active!==false}onChange={e=>setForm({...form,is_active:e.target.checked})}/>Active</label>}
      <div className="modalactions">{editing&&<button type="button"className="ghost"onClick={reset}>Cancel</button>}<button className="primary">{editing?"Save user":"Create user"}</button></div></form></div>
    <div className="section"><h2>Staff accounts</h2><div className="table"><table><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Store</th><th>Active</th><th/></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.username}</td><td>{[r.first_name,r.last_name].filter(Boolean).join(" ")||"—"}</td><td><span className="pill info">{r.role}</span></td><td>{r.store||"—"}</td><td>{r.is_active?<span className="pill ok">Yes</span>:<span className="pill bad">No</span>}</td><td className="actions"><button title="Edit"onClick={()=>{setEditing(r);setForm({username:r.username||"",password:"",first_name:r.first_name||"",last_name:r.last_name||"",email:r.email||"",phone:r.phone||"",role:r.role||"CASHIER",store:r.store||"",is_active:r.is_active!==false})}}><Settings size={14}/></button><button title="Set PIN"onClick={()=>setPinUser(r)}><Shield size={14}/></button></td></tr>)}</tbody></table></div></div></div>
    {pinUser&&<div className="overlay"onMouseDown={()=>setPinUser(null)}><div className="modal"style={{maxWidth:420}}onMouseDown={e=>e.stopPropagation()}><div className="modalhead"><h2>Set PIN · {pinUser.username}</h2><button onClick={()=>setPinUser(null)}><X/></button></div><form onSubmit={setUserPin}><label>New PIN (4–6 digits)<input autoFocus inputMode="numeric"value={pin}onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,6))}required/></label><div className="modalactions"><button type="button"className="ghost"onClick={()=>setPinUser(null)}>Cancel</button><button className="primary">Save PIN</button></div></form></div></div>}
  </>;
}

/* ---------- offline ---------- */
function OfflinePage(){
  const[rows,setRows]=useState([]),[queue,setQueue]=useState(()=>readQueue()),[form,setForm]=useState({device_id:deviceId(),client_event_id:id(),event_type:"SALE",payload:"{}"}),[err,setErr]=useState(""),[syncing,setSyncing]=useState(false),[online,setOnline]=useState(navigator.onLine);
  const load=()=>api("/offline/events/").then(d=>setRows(list(d))).catch(x=>setErr(x.message));
  useEffect(()=>{load();const on=()=>{setOnline(true);sync()};const off=()=>setOnline(false);window.addEventListener("online",on);window.addEventListener("offline",off);return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off)}},[]);
  async function sync(){const q=readQueue();if(!q.length||!navigator.onLine||syncing)return;setSyncing(true);try{const d=await api("/offline/events/push/",{method:"POST",body:JSON.stringify({events:q.map(x=>({client_event_id:x.client_event_id,device_id:x.device_id,event_type:x.event_type,payload:x.payload}))})});const accepted=new Set(Array.isArray(d?.accepted)?d.accepted:[]);if(accepted.size)removeLocalIds([...accepted]);setQueue(readQueue());await load();ui.toast("Synced",{type:"ok"})}catch(x){setErr(x.message)}finally{setSyncing(false)}}
  function queueEvent(e){e.preventDefault();setErr("");let payload;try{payload=JSON.parse(form.payload||"{}")}catch{setErr("Payload must be valid JSON");return}const next=enqueue({...form,payload});setQueue(next);setForm({device_id:deviceId(),client_event_id:id(),event_type:"SALE",payload:"{}"});if(navigator.onLine)sync();ui.toast("Queued locally",{type:"ok"})}
  return<><Head title="Offline Sync"sub="Persistent local event queue with automatic retry when connectivity returns"/>{err&&<div className="error"><AlertTriangle size={15}/>{err}</div>}
    <div className="section"><div className="toolbar"style={{margin:0,border:0,padding:0,boxShadow:"none"}}><span className={online?"pill ok":"pill bad"}>{online?"Online":"Offline"}</span><span>{queue.length} local pending</span><button className="ghost"onClick={sync}disabled={syncing||!online}>{syncing?"Syncing…":"Sync pending"}</button><button className="ghost"onClick={load}><RefreshCw size={15}/>Server refresh</button></div></div>
    <div className="split"><div className="section"><h2>Queue event</h2><form onSubmit={queueEvent}><label>Device ID<input value={form.device_id}onChange={e=>setForm({...form,device_id:e.target.value})}required/></label><label>Event type<input value={form.event_type}onChange={e=>setForm({...form,event_type:e.target.value})}required/></label><label>Payload JSON<textarea value={form.payload}onChange={e=>setForm({...form,payload:e.target.value})}/></label><button className="primary">Queue locally</button></form></div>
    <div className="section"><h2>Server events</h2><div className="table"><table><thead><tr><th>Client ID</th><th>Type</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.client_event_id}</td><td>{r.event_type}</td><td>{r.status}</td></tr>)}{!rows.length&&<tr><td className="empty"colSpan={3}>No events</td></tr>}</tbody></table></div></div></div>
  </>;
}

/* ---------- tax ---------- */
function TaxPage(){
  const[amount,setAmount]=useState("100"),[rate,setRate]=useState("5"),[inclusive,setInclusive]=useState(false),[result,setResult]=useState(null),[err,setErr]=useState("");
  async function calc(e){e.preventDefault();setErr("");try{const d=await api("/taxes/rates/calculate/",{method:"POST",body:JSON.stringify({amount,rate,inclusive})});setResult(d)}catch(x){setErr(x.message)}}
  return<><Head title="Tax Rates & Calculator"sub="Manage tax rates and calculate tax for any amount"/>{err&&<div className="error"><AlertTriangle size={15}/>{err}</div>}
    <div className="split"><div className="section"><h2>Tax calculator</h2><form onSubmit={calc}><label>Amount<input type="number"step="0.01"value={amount}onChange={e=>setAmount(e.target.value)}/></label><label>Rate %<input type="number"step="0.01"value={rate}onChange={e=>setRate(e.target.value)}/></label><label style={{flexDirection:"row",alignItems:"center",gap:8}}><input type="checkbox"checked={inclusive}onChange={e=>setInclusive(e.target.checked)}/>Tax inclusive</label><button className="primary">Calculate</button></form></div>
    <div className="section"><h2>Result</h2>{result?<div className="cards"style={{gridTemplateColumns:"1fr 1fr"}}>{Object.entries(result).map(([k,v])=><div className="card c1"key={k}><span>{label(k)}</span><strong>{typeof v==="number"?money(v):String(v)}</strong></div>)}</div>:<div className="empty">Enter an amount and rate.</div>}</div></div>
    <CRUD kind="taxRates"/>
  </>;
}

/* ---------- stock counts ---------- */
function StockCountPage(){
  const[stores,setStores]=useState([]),[products,setProducts]=useState([]),[counts,setCounts]=useState([]),[form,setForm]=useState({store:"",note:""}),[rows,setRows]=useState([]),[err,setErr]=useState("");
  const load=()=>api("/inventory/stock-counts/").then(d=>setCounts(list(d))).catch(x=>setErr(x.message));
  useEffect(()=>{api("/stores/stores/").then(d=>setStores(list(d)));api("/catalog/products/").then(d=>setProducts(list(d)));load()},[]);
  function add(){setRows([...rows,{product:"",counted_quantity:"0"}])}
  async function create(e){e.preventDefault();setErr("");try{const items=rows.filter(r=>r.product).map(r=>({product:r.product,counted_quantity:r.counted_quantity}));if(!items.length)throw Error("Add at least one product");await api("/inventory/stock-counts/",{method:"POST",body:JSON.stringify({...form,items})});setRows([]);setForm({store:"",note:""});load();ui.toast("Count created",{type:"ok"})}catch(x){setErr(x.message);ui.toast("Failed",{type:"err",desc:x.message})}}
  async function post(c){if(!await ui.confirm("Post stock count?","Inventory will be adjusted to the counted quantities.",{ok:"Post"}))return;try{await api(`/inventory/stock-counts/${c.id}/post/`,{method:"POST",body:JSON.stringify({})});load();ui.toast("Count posted — inventory adjusted",{type:"ok"})}catch(x){ui.toast("Post failed",{type:"err",desc:x.message})}}
  return<><Head title="Stock Counts"sub="Cycle-count inventory and post variances to stock"/>{err&&<div className="error"><AlertTriangle size={15}/>{err}</div>}
    <div className="split"><div className="section"><h2>New count</h2><form onSubmit={create}>
      <label>Store<select value={form.store}onChange={e=>setForm({...form,store:e.target.value})}required><option value="">Select…</option>{stores.map(s=><option key={s.id}value={s.id}>{s.name}</option>)}</select></label>
      <label>Note<input value={form.note}onChange={e=>setForm({...form,note:e.target.value})}/></label>
      <h3>Counted items</h3>{rows.map((x,i)=><div className="itemrow"key={i}><select value={x.product}onChange={e=>{const a=[...rows];a[i].product=e.target.value;setRows(a)}}><option value="">Product</option>{products.map(p=><option key={p.id}value={p.id}>{p.name} · {p.sku}</option>)}</select><input type="number"step="0.001"value={x.counted_quantity}onChange={e=>{const a=[...rows];a[i].counted_quantity=e.target.value;setRows(a)}}/><span/><button type="button"onClick={()=>setRows(rows.filter((_,j)=>j!==i))}><Trash2 size={14}/></button></div>)}
      <button type="button"className="ghost"onClick={add}>+ Add product</button><div className="modalactions"><button className="primary">Create count</button></div></form></div>
    <div className="section"><h2>Counts</h2><div className="table"><table><thead><tr><th>Reference</th><th>Store</th><th>Status</th><th>Items</th><th>Variance</th><th/></tr></thead><tbody>{counts.map(c=><tr key={c.id}><td>{c.reference}</td><td>{c.store}</td><td><span className={"pill "+(c.status==="POSTED"?"ok":"info")}>{c.status}</span></td><td>{(c.items||[]).length}</td><td>{(c.items||[]).reduce((a,i)=>a+Number(i.variance||0),0).toFixed(3)}</td><td>{c.status==="DRAFT"&&<button className="ghost"onClick={()=>post(c)}>Post</button>}</td></tr>)}{!counts.length&&<tr><td className="empty"colSpan={6}>No counts</td></tr>}</tbody></table></div></div></div>
  </>;
}

/* ---------- time clock ---------- */
function TimeClockPage(){
  const[cur,setCur]=useState(null),[rows,setRows]=useState([]),[err,setErr]=useState(""),[busy,setBusy]=useState(false);
  const load=()=>{api("/auth/time-entries/current/").then(d=>setCur(d&&d.id?d:null)).catch(()=>{});api("/auth/time-entries/").then(d=>setRows(list(d))).catch(x=>setErr(x.message))};
  useEffect(load,[]);
  async function clockIn(){setBusy(true);try{await api("/auth/time-entries/clock-in/",{method:"POST",body:JSON.stringify({})});load();ui.toast("Clocked in",{type:"ok"})}catch(x){ui.toast("Failed",{type:"err",desc:x.message})}finally{setBusy(false)}}
  async function clockOut(){setBusy(true);try{await api("/auth/time-entries/clock-out/",{method:"POST",body:JSON.stringify({})});load();ui.toast("Clocked out",{type:"ok"})}catch(x){ui.toast("Failed",{type:"err",desc:x.message})}finally{setBusy(false)}}
  const fmt=t=>t?String(t).slice(0,19).replace("T"," "):"—";
  return<><Head title="Time Clock"sub="Clock in and out · managers see all staff shifts"/>{err&&<div className="error"><AlertTriangle size={15}/>{err}</div>}
    <div className="section"><div className="sessionbar">{cur?<><span className="av"><Clock3 size={16}/></span><b>On the clock since {fmt(cur.clock_in)}</b><button className="primary"style={{marginLeft:"auto"}}disabled={busy}onClick={clockOut}><LogOut size={15}/>Clock out</button></>:<><span className="muted">You are not clocked in.</span><button className="primary"style={{marginLeft:"auto"}}disabled={busy}onClick={clockIn}><LogIn size={15}/>Clock in</button></>}</div></div>
    <div className="section"><h2>Recent shifts</h2><div className="table"><table><thead><tr><th>Staff</th><th>Clock in</th><th>Clock out</th><th>Minutes</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.username}</td><td>{fmt(r.clock_in)}</td><td>{fmt(r.clock_out)}</td><td>{r.minutes??"—"}</td></tr>)}{!rows.length&&<tr><td className="empty"colSpan={4}>No shifts yet</td></tr>}</tbody></table></div></div>
  </>;
}

/* ---------- router ---------- */
function Special({page,me,go}){
  if(page==="stockCounts")return<StockCountPage/>;
  if(page==="timeClock")return<TimeClockPage/>;
  if(page==="pos")return<POS me={me}/>;
  if(page==="productsView")return<ProductsPage/>;
  if(page==="purchases")return<PurchasePage/>;
  if(page==="transfers")return<TransferPage/>;
  if(page==="sales")return<SalesPage/>;
  if(page==="reports")return<Reports/>;
  if(page==="paymentIntents")return<PaymentIntentPage/>;
  if(page==="users")return<UsersPage/>;
  if(page==="offline")return<OfflinePage/>;
  if(page==="taxRates")return<TaxPage/>;
  if(RES[page])return<CRUD kind={page}/>;
  return<Dashboard go={go}me={me}/>;
}
/* ---------- first-run setup wizard ---------- */
const CURRENCIES=["USD","EUR","GBP","INR","AED","SAR","QAR","KWD","BHD","OMR","PKR","BDT","EGP","NGN","KES","ZAR","JPY","CNY","AUD","CAD","BRL","MXN","TRY","IDR","MYR","PHP","THB","VND"];
function Setup({done}){
  const[f,setF]=useState({company:"",currency:"USD",username:"",password:"",confirm:"",demo:false}),[e,setE]=useState(""),[busy,setBusy]=useState(false);
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  async function submit(ev){ev.preventDefault();setE("");
    if(f.password.length<8)return setE("Password must be at least 8 characters.");
    if(f.password!==f.confirm)return setE("Passwords do not match.");
    setBusy(true);
    try{
      const d=await api("/auth/bootstrap/",{method:"POST",body:JSON.stringify({company:f.company,currency:f.currency,username:f.username,password:f.password,demo:f.demo})});
      localStorage.setItem("access_token",d.access);if(d.refresh)localStorage.setItem("refresh_token",d.refresh);
      setCurrency(f.currency);ui.toast("Welcome to S POS!",{type:"ok",desc:"Your store is ready to go."});done();
    }catch(x){setE(x.message)}finally{setBusy(false)}
  }
  return<div className="login"><div className="login-hero">
      <div className="logo">S<span> POS</span><i className="dot"/></div>
      <div><h2>Let's set up<br/>your store.</h2><p>A few details and you're ready to sell — change anything later in Settings.</p>
        <div className="hero-feats"><div><span><Store size={16}/></span>Works for any shop, any country</div><div><span><CircleDollarSign size={16}/></span>Your currency &amp; tax, your way</div><div><span><ShieldCheck size={16}/></span>Your own owner account</div></div></div>
      <div className="muted"style={{color:"#cbd0ff"}}>© S POS · Developed by Sridhar Mahalingam</div>
    </div>
    <div className="login-form"><form className="loginbox"onSubmit={submit}>
      <div className="logo"style={{color:"var(--ink)"}}>S<span> POS</span><i className="dot"/></div>
      <p className="cap">Create your store &amp; owner account</p>
      <label>Store / business name<input value={f.company}onChange={e=>set("company",e.target.value)}placeholder="e.g. Sunrise Mart"autoFocus required/></label>
      <label>Currency<select value={f.currency}onChange={e=>set("currency",e.target.value)}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></label>
      <label>Owner username<input value={f.username}onChange={e=>set("username",e.target.value)}required/></label>
      <div className="formgrid"><label>Password<input type="password"value={f.password}onChange={e=>set("password",e.target.value)}required/></label><label>Confirm<input type="password"value={f.confirm}onChange={e=>set("confirm",e.target.value)}required/></label></div>
      <label style={{flexDirection:"row",alignItems:"center",gap:9}}><input type="checkbox"checked={f.demo}onChange={e=>set("demo",e.target.checked)}/>Add a few sample products so I can explore first</label>
      {e&&<div className="error"><AlertTriangle size={15}/>{e}</div>}
      <button className="primary wide"disabled={busy}style={{marginTop:8}}>{busy?"Setting up…":"Create my store"}<ChevronRight size={16}/></button>
    </form></div></div>;
}

function App(){
  const[auth,setAuth]=useState(!!access()),[page,setPage]=useState("dashboard"),[online,setOnline]=useState(navigator.onLine),[me,setMe]=useState(null),[,setCurTick]=useState(0),[company,setCompany]=useState(""),[logo,setLogo]=useState(""),[setup,setSetup]=useState(undefined);
  useEffect(()=>{const on=()=>setOnline(true),off=()=>setOnline(false);window.addEventListener("online",on);window.addEventListener("offline",off);return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off)}},[]);
  useEffect(()=>{let live=true;api("/auth/bootstrap/").then(d=>{if(live)setSetup(!!d.needs_setup)}).catch(()=>{if(live)setSetup(false)});return()=>{live=false}},[]);
  useEffect(()=>{if(!auth)return;let live=true;api("/stores/companies/").then(d=>{const co=list(d)[0];if(co&&live){setCurrency(co.currency);setCompany(co.name||"");setLogo(co.logo||"");BRAND.name=co.name||"";BRAND.logo=co.logo||"";setCurTick(t=>t+1)}}).catch(()=>{});return()=>{live=false}},[auth]);
  useEffect(()=>{if(!auth)return;let live=true;api("/auth/me/").then(d=>{if(live){setMe(d);setOnline(navigator.onLine)}}).catch(e=>{if(String(e.message).includes("Session expired")){localStorage.clear();if(live)setAuth(false)}else if(live)setOnline(false)});return()=>{live=false}},[auth]);
  if(setup===undefined)return<div className="splash"><div className="logo">S<span> POS</span><i className="dot"/></div><div className="spin"/></div>;
  if(setup)return<><UIHost/><Setup done={()=>{setSetup(false);setAuth(true)}}/></>;
  if(!auth)return<><UIHost/><Login done={()=>setAuth(true)}/></>;
  return<><UIHost/><Shell page={page}setPage={setPage}me={me}online={online}company={company}logo={logo}>{page==="dashboard"?<Dashboard go={setPage}me={me}/>:<Special page={page}me={me}go={setPage}/>}</Shell></>;
}
createRoot(document.getElementById("root")).render(<App/>);
