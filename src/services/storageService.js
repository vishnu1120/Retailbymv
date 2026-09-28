import { useEffect, useRef } from "react";

export const KEYS = {
  products: "erp_products", arrivals: "erp_arrivals", sales: "erp_sales", expenses: "erp_expenses",
  payables: "erp_payables", receivables: "erp_receivables", cashLedger: "erp_cashledger",
  distributors: "erp_distributors", shopConfig: "erp_shopconfig", theme: "erp_theme",
  auth: "erp_auth", session: "erp_session", billingCart: "erp_billing_cart", billingCustomer: "erp_billing_customer",
  billingPhone: "erp_billing_phone", billingDiscount: "erp_billing_discount", billingPayments: "erp_billing_payments",
  heldBills: "erp_held_bills", stockTab: "erp_stock_tab", stockGridRows: "erp_stock_gridrows", arrTab: "erp_arr_tab",
  arrHeader: "erp_arr_header", arrItemRows: "erp_arr_itemrows", distForm: "erp_dist_form",
};

export function loadKey(key, fallback) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; } }
export function saveKey(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error("Save failed:", key, e); } }
export function useDebouncedSave(key, data, delay = 300, enabled = true) {
  const didMount = useRef(false), lastSavedRef = useRef(data);
  useEffect(() => {
    if (!enabled) { lastSavedRef.current = data; return; }
    if (!didMount.current) { didMount.current = true; lastSavedRef.current = data; return; }
    if (lastSavedRef.current === data) return;
    lastSavedRef.current = data;
    const t = setTimeout(() => saveKey(key, data), delay);
    return () => clearTimeout(t);
  }, [key, data, delay, enabled]);
}
export function migrateIfNeeded() {
  try {
    const old = localStorage.getItem("retailerp_v4_data") || localStorage.getItem("retailerp_v3_data");
    if (!old) return;
    const d = JSON.parse(old);
    Object.entries(KEYS).forEach(([domain, key]) => { if (d[domain] !== undefined && !localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(d[domain])); });
    localStorage.removeItem("retailerp_v4_data"); localStorage.removeItem("retailerp_v3_data");
  } catch {}
}
export const getGlobalCSS = (T) => `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${T.subtle};border-radius:99px}::-webkit-scrollbar-thumb:hover{background:${T.muted}}
  body{background:${T.bg};color:${T.text};font-family:'Inter',sans-serif;font-size:13.5px;line-height:1.5;-webkit-font-smoothing:antialiased}
  button,input,select,textarea,a,label,[role="button"]{pointer-events:auto!important}input,select,textarea{font-family:'Inter',sans-serif;font-size:13px;background:${T.inputBg};color:${T.text};border:1.5px solid ${T.border};border-radius:8px;padding:8px 12px;outline:none;transition:border-color .12s,box-shadow .12s;width:100%;user-select:text!important;-webkit-user-select:text!important}
  input:focus,select:focus,textarea:focus{border-color:${T.accent};box-shadow:0 0 0 3px ${T.accentDim}}input::placeholder{color:${T.muted};opacity:.7}select option{background:${T.card};color:${T.text}}button{font-family:'Inter',sans-serif;cursor:pointer;transition:transform .08s ease,opacity .08s ease}.erp-btn:hover:not(:disabled){opacity:.88;transform:translateY(-1px)}.erp-btn:active:not(:disabled){opacity:1;transform:scale(.97)}
  .billing-shell{display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,400px);gap:16px;height:calc(100vh - 120px);align-items:start}.billing-products{display:flex;flex-direction:column;gap:10px;min-height:0;contain:layout style}.billing-toolbar{display:flex;gap:8px;position:relative;flex-wrap:wrap;align-items:stretch}.billing-search-wrap{flex:1 1 260px;min-width:220px;position:relative}.billing-grid{overflow-y:auto;flex:1;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,165px),1fr));gap:10px;align-content:start;contain:layout paint}.billing-product-card{background:${T.card};border:2px solid ${T.border};border-radius:10px;padding:12px;cursor:pointer;transition:border-color .12s,box-shadow .12s,transform .08s ease;min-width:0;overflow:hidden;contain:layout paint;user-select:none;touch-action:manipulation}.billing-product-card:hover{border-color:${T.accent};box-shadow:0 8px 22px ${T.shadow}}.billing-product-card:active{transform:scale(.97)}.billing-checkout{display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:calc(100vh - 120px);min-width:0;contain:layout style}.checkout-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.payment-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto auto;gap:5px;align-items:center}.rounding-options{display:flex;gap:5px;flex-wrap:wrap}.rounding-options button[data-recommended="true"]{border-color:${T.green};color:${T.green};background:${T.greenDim};font-weight:700}.truncate-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  @media (max-width:1100px){.billing-shell{grid-template-columns:1fr;height:auto;min-height:calc(100vh - 120px)}.billing-checkout{max-height:none;overflow:visible}}@media (max-width:720px){body{font-size:14px}input,select,textarea{font-size:16px;min-height:40px}.billing-toolbar{display:grid;grid-template-columns:1fr 1fr}.billing-search-wrap{grid-column:1/-1;min-width:0}.billing-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.checkout-fields{grid-template-columns:1fr}.payment-row{grid-template-columns:1fr 1fr}}
`;
