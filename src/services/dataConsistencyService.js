import { KEYS, loadKey, saveKey } from "./storageService";
export const TENANT_CONTEXT_KEY = "erp_tenant_context";
export const MAX_ALLOWED_PCS = 4;
const DOMAINS = ["products","sales","arrivals","expenses","payables","receivables","cashLedger","distributors","shopConfig"];
const SETTERS = {products:"setProducts",sales:"setSales",arrivals:"setArrivals",expenses:"setExpenses",payables:"setPayables",receivables:"setReceivables",cashLedger:"setCashLedger",distributors:"setDistributors",shopConfig:"setShopConfig"};
export function getTenantContext(){ return loadKey(TENANT_CONTEXT_KEY,null); }
export function saveTenantContext(c){ if(c) saveKey(TENANT_CONTEXT_KEY,c); }
export function clearTenantContext(){ localStorage.removeItem(TENANT_CONTEXT_KEY); }
export function getShopId(){ return localStorage.getItem("erp_shop_id") || "local_shop"; }
export function getDeviceId(){ let id=localStorage.getItem("erp_device_id"); if(!id){id="PC-"+Math.random().toString(36).slice(2,7).toUpperCase();localStorage.setItem("erp_device_id",id)} return id; }
export function getActorId(){ return "local_user"; }
export function buildSnapshot(o={}){ const d={}; DOMAINS.forEach(k=>d[k]=o[k] ?? loadKey(KEYS[k], k==="shopConfig"?{}:[])); return d; }
export function applySnapshot(snapshot,setters={}){ const clean=buildSnapshot(snapshot); DOMAINS.forEach(k=>{saveKey(KEYS[k],clean[k]); if(typeof setters[SETTERS[k]]==="function") setters[SETTERS[k]](clean[k]);}); return clean; }
export function autoRestoreIfEmpty(setters={}){ const s=buildSnapshot(); applySnapshot(s,setters); return Promise.resolve({success:true,local:true}); }
export function registerSyncRetryHandlers(){ return ()=>{}; }
export function subscribeToMultiPCSync(){ return ()=>{}; }
export function syncFullSnapshot(snapshot){ applySnapshot(snapshot); return Promise.resolve({success:true,local:true,reason:"Saved locally"}); }
export function restoreFromCloud(setters){ const s=buildSnapshot(); applySnapshot(s,setters); return Promise.resolve({success:true,local:true}); }
