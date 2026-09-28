import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { T, DARK, LIGHT, LOGO_URI, syncTheme } from "../../constants/theme";
import { NAV, DEFAULT_SHOP } from "../../constants/config";
import { fmt, lower, n } from "../../utils/formatters";
import { KEYS, loadKey, saveKey, useDebouncedSave, getGlobalCSS } from "../../services/storageService";
import { autoRestoreIfEmpty, buildSnapshot, registerSyncRetryHandlers, restoreFromCloud, syncFullSnapshot, subscribeToMultiPCSync } from "../../services/dataConsistencyService";
import DataClearModal from "../common/DataClearModal";
import Dashboard from "../dashboard/Dashboard";
import Billing from "../billing/Billing";

import StockManagement from "../stock/StockManagement";
import StockArrival from "../arrival/StockArrival";
import Distributors from "../distributors/Distributors";
import SalesHistory from "../sales/SalesHistory";
import MonthlyReport from "../sales/MonthlyReport";
import FinancialReport from "../sales/FinancialReport";
import TableCash from "../accounting/TableCash";
import Expenses from "../accounting/Expenses";
import Accounting from "../accounting/Accounting";
import ShopSettings from "../settings/ShopSettings";
import UserManagement from "../settings/UserManagement";

const TabSkeleton = () => (
  <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, opacity: 0.6 }}>
    <div style={{ height: 32, width: 200, background: "rgba(255,255,255,0.1)", borderRadius: 6 }} />
    <div style={{ height: 120, width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: 10 }} />
    <div style={{ height: 250, width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: 10 }} />
  </div>
);

const SunIcon = () => <span style={{ fontSize: 14 }}>☀️</span>;

const MoonIcon = () => <span style={{ fontSize: 14 }}>🌙</span>;

const UserIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const BoxIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 3 }}>
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 003 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const ReceiptIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 3 }}>
    <path d="M14 2H6a2 2 0 00-2 2v16l3-2 3 2 3-2 3 2 3-2 3 2V4a2 2 0 00-2-2z"/>
    <line x1="8" y1="6" x2="16" y2="6"/>
    <line x1="8" y1="10" x2="16" y2="10"/>
    <line x1="8" y1="14" x2="12" y2="14"/>
  </svg>
);

const CloudCheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 3 }}>
    <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/>
  </svg>
);

export function AppShell({ currentUser, onLogout, tenantContext }) {
  const [page, setPage] = useState("dashboard");

  const [products, setProducts] = useState(() => loadKey(KEYS.products, []));
  const [arrivals, setArrivals] = useState(() => loadKey(KEYS.arrivals, []));
  const [sales, setSales] = useState(() => loadKey(KEYS.sales, []));
  const [expenses, setExpenses] = useState(() => loadKey(KEYS.expenses, []));
  const [payables, setPayables] = useState(() => loadKey(KEYS.payables, []));
  const [receivables, setRecievables] = useState(() => loadKey(KEYS.receivables, []));
  const [cashLedger, setCashLedger] = useState(() => loadKey(KEYS.cashLedger, []));
  const [distributors, setDistributors] = useState(() => loadKey(KEYS.distributors, []));
  const [shopConfig, setShopConfig] = useState(() => loadKey(KEYS.shopConfig, DEFAULT_SHOP));
  const [isDark, setIsDark] = useState(() => loadKey(KEYS.theme, true));
  const [acctTab, setAcctTab] = useState("summary");

  const [cart, setCart] = useState(() => loadKey(KEYS.billingCart, []));
  const [customer, setCustomer] = useState(() => loadKey(KEYS.billingCustomer, ""));
  const [phone, setPhone] = useState(() => loadKey(KEYS.billingPhone, ""));
  const [discount, setDiscount] = useState(() => loadKey(KEYS.billingDiscount, ""));
  const [payments, setPayments] = useState(() => loadKey(KEYS.billingPayments, [{ mode: "Cash", amount: "" }]));
  const [billingSearch, setBillingSearch] = useState("");
  const [heldBills, setHeldBills] = useState(() => loadKey(KEYS.heldBills, []));

  const [stockTab, setStockTab] = useState(() => loadKey(KEYS.stockTab, "list"));
  const [gridRows, setGridRows] = useState(() => loadKey(KEYS.stockGridRows, []));
  const [arrTab, setArrTab] = useState(() => loadKey(KEYS.arrTab, "list"));
  const [arrHeader, setArrHeader] = useState(() => loadKey(KEYS.arrHeader, { date: "", supplier: "", distributorGST: "", invoiceNo: "" }));
  const [arrItemRows, setArrItemRows] = useState(() => loadKey(KEYS.arrItemRows, []));
  const [distForm, setDistForm] = useState(() => loadKey(KEYS.distForm, { name: "", gstin: "", phone: "", address: "", email: "" }));

  syncTheme(isDark);

  const globalCSS = useMemo(() => getGlobalCSS(isDark ? DARK : LIGHT), [isDark]);

  useEffect(() => {
    let el = document.getElementById("erp-global-styles");
    if (!el) {
      el = document.createElement("style");
      el.id = "erp-global-styles";
      document.head.appendChild(el);
    }
    el.textContent = globalCSS;
  }, [globalCSS]);

  const [showClear, setShowClear] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState("");

  useDebouncedSave(KEYS.products, products, 300, !isRestoring);
  useDebouncedSave(KEYS.arrivals, arrivals, 300, !isRestoring);
  useDebouncedSave(KEYS.sales, sales, 300, !isRestoring);
  useDebouncedSave(KEYS.expenses, expenses, 300, !isRestoring);
  useDebouncedSave(KEYS.payables, payables, 300, !isRestoring);
  useDebouncedSave(KEYS.receivables, receivables, 300, !isRestoring);
  useDebouncedSave(KEYS.cashLedger, cashLedger, 300, !isRestoring);
  useDebouncedSave(KEYS.shopConfig, shopConfig, 300, !isRestoring);
  useDebouncedSave(KEYS.distributors, distributors, 300, !isRestoring);
  useDebouncedSave(KEYS.theme, isDark);
  useDebouncedSave(KEYS.billingCart, cart);
  useDebouncedSave(KEYS.billingCustomer, customer);
  useDebouncedSave(KEYS.billingPhone, phone);
  useDebouncedSave(KEYS.billingDiscount, discount);
  useDebouncedSave(KEYS.billingPayments, payments);
  useDebouncedSave(KEYS.heldBills, heldBills);
  useDebouncedSave(KEYS.stockTab, stockTab);
  useDebouncedSave(KEYS.stockGridRows, gridRows);
  useDebouncedSave(KEYS.arrTab, arrTab);
  useDebouncedSave(KEYS.arrHeader, arrHeader);
  useDebouncedSave(KEYS.arrItemRows, arrItemRows);
  useDebouncedSave(KEYS.distForm, distForm);

  const [syncStatus, setSyncStatus] = useState("synced");

  useEffect(() => {
    const setters = {
      setProducts,
      setSales,
      setArrivals,
      setExpenses,
      setPayables,
      setReceivables: setRecievables,
      setCashLedger,
      setDistributors,
      setShopConfig,
    };
    const unregisterRetry = registerSyncRetryHandlers(setters);
    const unsubscribeMultiPC = subscribeToMultiPCSync(setters, () => {
      setSyncStatus("synced");
    });
    autoRestoreIfEmpty(setters);
    return () => {
      unregisterRetry();
      unsubscribeMultiPC();
    };
  }, []);

  const cashBalance = useMemo(
    () => cashLedger.reduce((balance, entry) => {
      const isOut = lower(entry.type || "").includes("out") || lower(entry.type || "").includes("exp") || lower(entry.type || "").includes("debit") || lower(entry.type || "").includes("paid");
      return balance + (isOut ? -n(entry.amount) : n(entry.amount));
    }, 0),
    [cashLedger]
  );

  const handleClear = useCallback((what) => {
    let nextSnapshot = buildSnapshot({
      products,
      arrivals,
      sales,
      expenses,
      payables,
      receivables,
      cashLedger,
      distributors,
      shopConfig,
    });

    if (what === "all") {
      nextSnapshot = buildSnapshot({
        products: [],
        arrivals: [],
        sales: [],
        expenses: [],
        payables: [],
        receivables: [],
        cashLedger: [],
        distributors: [],
        shopConfig,
      });
      setProducts([]);
      setArrivals([]);
      setSales([]);
      setExpenses([]);
      setPayables([]);
      setRecievables([]);
      setCashLedger([]);
      setDistributors([]);
      Object.values(KEYS).forEach((k) => {
        if (k !== KEYS.theme) localStorage.removeItem(k);
      });
    } else if (what === "sales") {
      nextSnapshot = { ...nextSnapshot, sales: [] };
      setSales([]);
      saveKey(KEYS.sales, []);
    } else if (what === "products") {
      nextSnapshot = { ...nextSnapshot, products: [] };
      setProducts([]);
      saveKey(KEYS.products, []);
    } else if (what === "expenses") {
      nextSnapshot = { ...nextSnapshot, expenses: [] };
      setExpenses([]);
      saveKey(KEYS.expenses, []);
    } else if (what === "distributors") {
      nextSnapshot = { ...nextSnapshot, distributors: [] };
      setDistributors([]);
      saveKey(KEYS.distributors, []);
    }

    syncFullSnapshot(nextSnapshot).then((res) => {
      setCloudStatus("Saved Locally");
      setTimeout(() => setCloudStatus(""), 3000);
    });
  }, [products, arrivals, sales, expenses, payables, receivables, cashLedger, distributors, shopConfig]);

  const exportBackup = useCallback(() => {
    const shopName = (shopConfig.shopName || "WERP").replace(/[^a-zA-Z0-9]/g, "_");
    const ts = new Date()
      .toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-");
    const data = JSON.stringify(
      {
        products,
        arrivals,
        sales,
        expenses,
        payables,
        receivables,
        cashLedger,
        distributors,
        shopConfig,
      },
      null,
      2
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    a.download = `${shopName}_Backup_${ts}.json`;
    a.click();
  }, [products, arrivals, sales, expenses, payables, receivables, cashLedger, distributors, shopConfig]);

  const importRef = useRef(null);
  const handleRestoreBackup = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (!d || typeof d !== "object") throw new Error("Invalid backup format");

        // Save to the shared database first. Local storage is updated only after this succeeds.
        setIsRestoring(true);
        const domains = [
          ["products", KEYS.products, setProducts],
          ["arrivals", KEYS.arrivals, setArrivals],
          ["sales", KEYS.sales, setSales],
          ["expenses", KEYS.expenses, setExpenses],
          ["payables", KEYS.payables, setPayables],
          ["receivables", KEYS.receivables, setRecievables],
          ["cashLedger", KEYS.cashLedger, setCashLedger],
          ["distributors", KEYS.distributors, setDistributors],
          ["shopConfig", KEYS.shopConfig, setShopConfig],
        ];

        setRestoreProgress("Restoring data locally...");
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Apply one domain per event-loop turn so Electron remains responsive.
        for (const [name, key, setter] of domains) {
          if (d[name] === undefined) continue;
          setRestoreProgress(`Restoring ${name}...`);
          saveKey(key, d[name]);
          setter(d[name]);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Background cloud sync attempt (does not block local restore if cloud is offline/suspended)
        syncFullSnapshot(buildSnapshot(d)).catch((err) => {
          console.warn("Background cloud sync on restore:", err);
        });

        setRestoreProgress("Restore complete");
        alert("Data restored successfully!");
      } catch (error) {
        console.error("Backup restore failed:", error);
        alert(error?.message || "Restore failed. The backup was not applied locally or to the shared database.");
      } finally {
        setIsRestoring(false);
        setRestoreProgress("");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const [cloudStatus, setCloudStatus] = useState("");

  const handleCloudSync = useCallback(async () => {
    setCloudStatus("Saving locally...");
    const res = await syncFullSnapshot({
      products,
      sales,
      arrivals,
      expenses,
      payables,
      receivables,
      cashLedger,
      distributors,
      shopConfig,
    });
    if (res.success) {
      setCloudStatus("Saved Locally");
      setTimeout(() => setCloudStatus(""), 3000);
    } else {
      setCloudStatus("Local save failed");
      alert(res.error || res.reason || "Cloud sync failed");
    }
  }, [products, sales, arrivals, expenses, payables, receivables, cashLedger, distributors, shopConfig]);

  const handleCloudRestore = useCallback(async () => {
    if (!window.confirm("Fetch latest data from local saved data?")) return;
    setCloudStatus("Fetching...");
    const setters = {
      setProducts,
      setSales,
      setArrivals,
      setExpenses,
      setPayables,
      setReceivables: setRecievables,
      setCashLedger,
      setDistributors,
      setShopConfig,
    };
    let res = await restoreFromCloud(setters);
    if (res.conflict) {
      const force = window.confirm(`${res.message} Restore cloud data anyway?`);
      if (!force) {
        setCloudStatus("");
        return;
      }
      res = await restoreFromCloud(setters, { force: true });
    }
    if (res.success) {
      setCloudStatus("Data Restored");
      alert("Local data restored successfully!");
    } else {
      setCloudStatus("");
      alert(res.error || res.reason || "No cloud data found.");
    }
  }, []);

  const activePageComponent = useMemo(() => {
    switch (page) {
      case "dashboard":
        return (
          <Dashboard
            products={products}
            sales={sales}
            expenses={expenses}
            arrivals={arrivals}
            payables={payables}
            receivables={receivables}
            cashLedger={cashLedger}
          />
        );
      case "billing":
        return (
          <Billing
            products={products}
            setProducts={setProducts}
            sales={sales}
            setSales={setSales}
            cashLedger={cashLedger}
            setCashLedger={setCashLedger}
            shopConfig={shopConfig}
            arrivals={arrivals}
            cart={cart}
            setCart={setCart}
            customer={customer}
            setCustomer={setCustomer}
            phone={phone}
            setPhone={setPhone}
            discount={discount}
            setDiscount={setDiscount}
            payments={payments}
            setPayments={setPayments}
            billingSearch={billingSearch}
            setBillingSearch={setBillingSearch}
            heldBills={heldBills}
            setHeldBills={setHeldBills}
          />
        );
      case "stock":
        return (
          <StockManagement
            products={products}
            setProducts={setProducts}
            stockTab={stockTab}
            setStockTab={setStockTab}
            gridRows={gridRows}
            setGridRows={setGridRows}
          />
        );
      case "arrivals":
        return (
          <StockArrival
            products={products}
            setProducts={setProducts}
            arrivals={arrivals}
            setArrivals={setArrivals}
            distributors={distributors}
            setPayables={setPayables}
            arrTab={arrTab}
            setArrTab={setArrTab}
            arrHeader={arrHeader}
            setArrHeader={setArrHeader}
            arrItemRows={arrItemRows}
            setArrItemRows={setArrItemRows}
          />
        );
      case "distributors":
        return (
          <Distributors
            distributors={distributors}
            setDistributors={setDistributors}
            arrivals={arrivals}
            setArrivals={setArrivals}
            payables={payables}
            setPayables={setPayables}
            setCashLedger={setCashLedger}
            setPage={setPage}
            setAcctTab={setAcctTab}
            distForm={distForm}
            setDistForm={setDistForm}
          />
        );
      case "sales":
        return (
          <SalesHistory
            sales={sales}
            shopConfig={shopConfig}
          />
        );
      case "monthly":
      case "report":
      case "financial":
        return (
          <MonthlyReport
            sales={sales}
            products={products}
            arrivals={arrivals}
            expenses={expenses}
            shopConfig={shopConfig}
          />
        );
      case "tablecash":
      case "cash":
        return (
          <TableCash
            cashLedger={cashLedger}
            setCashLedger={setCashLedger}
          />
        );
      case "expenses":
        return (
          <Expenses
            expenses={expenses}
            setExpenses={setExpenses}
            setCashLedger={setCashLedger}
          />
        );
      case "accounting":
        return (
          <Accounting
            payables={payables}
            setPayables={setPayables}
            setCashLedger={setCashLedger}
            receivables={receivables}
            setRecievables={setRecievables}
            sales={sales}
            expenses={expenses}
            arrivals={arrivals}
            acctTab={acctTab}
            setAcctTab={setAcctTab}
          />
        );
      case "settings":
        return (
          <ShopSettings
            shopConfig={shopConfig}
            setShopConfig={setShopConfig}
            onCloudSync={handleCloudSync}
            onCloudRestore={handleCloudRestore}
          />
        );
      case "users":
        return <UserManagement currentUser={currentUser} tenantContext={tenantContext} />;
      default:
        return null;
    }
  }, [
    page,
    products,
    sales,
    expenses,
    arrivals,
    payables,
    receivables,
    cashLedger,
    distributors,
    shopConfig,
    acctTab,
    currentUser,
    isDark,
    cart,
    customer,
    phone,
    discount,
    payments,
    heldBills,
    stockTab,
    gridRows,
    arrTab,
    arrHeader,
    arrItemRows,
    distForm,
  ]);

  return (
    <>
      {isRestoring && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(5, 8, 15, .78)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              width: 360,
              maxWidth: "calc(100vw - 40px)",
              padding: "24px 26px",
              borderRadius: 16,
              background: T.card,
              border: `1px solid ${T.border}`,
              boxShadow: "0 24px 70px rgba(0,0,0,.45)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8 }}>
              Restoring backup
            </div>
            <div style={{ fontSize: 13, color: T.muted, minHeight: 20 }}>
              {restoreProgress || "Preparing backup..."}
            </div>
            <div style={{ height: 6, marginTop: 18, borderRadius: 99, background: T.border, overflow: "hidden" }}>
              <div
                style={{
                  width: "45%",
                  height: "100%",
                  borderRadius: 99,
                  background: `linear-gradient(90deg, ${T.accent}, #22d3ee)`,
                  animation: "restoreProgress 1.1s ease-in-out infinite alternate",
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 12 }}>
              Please keep this window open.
            </div>
          </div>
        </div>
      )}
      <div
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
          background: T.bg,
        }}
      >
        <div
          style={{
            width: 240,
            background: T.sidebar,
            borderRight: `1px solid ${T.sidebarBorder}`,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            boxShadow: `2px 0 12px ${T.shadow}`,
          }}
        >
          <div
            style={{
              padding: "20px 18px 16px",
              borderBottom: `1px solid ${T.sidebarBorder}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: `linear-gradient(135deg,${T.accent},${T.purple})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    boxShadow: `0 2px 8px ${T.accent}44`,
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={LOGO_URI}
                    width="28"
                    height="28"
                    alt="WERP Logo"
                    style={{
                      width: 28,
                      height: 28,
                      objectFit: "contain",
                      borderRadius: 5,
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#fff",
                      letterSpacing: "-.01em",
                    }}
                  >
                    WERP
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#ffffff55",
                      marginTop: 0,
                      fontFamily: "'JetBrains Mono',monospace",
                    }}
                  >
                    Well managed ERP
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsDark((d) => !d)}
                title={isDark ? "Light Mode" : "Dark Mode"}
                style={{
                  background: "#ffffff12",
                  border: "1px solid #ffffff1a",
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  transition: "all .15s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#ffffff22")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#ffffff12")
                }
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
            <div
              style={{
                marginTop: 12,
                background: "#ffffff08",
                borderRadius: 8,
                padding: "6px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid #ffffff10",
              }}
            >
              <span style={{ fontSize: 11, color: "#ffffff66" }}>
                Cash Balance
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: T.green,
                  fontFamily: "'JetBrains Mono',monospace",
                }}
              >
                {fmt(cashBalance)}
              </span>
            </div>
            <div
              style={{
                marginTop: 6,
                background: "#ffffff08",
                borderRadius: 8,
                padding: "6px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid #ffffff10",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "#ffffffaa",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: T.green,
                    display: "inline-block",
                    boxShadow: `0 0 6px ${T.green}`,
                  }}
                />
                🟢 Auto-Synced (Max 4 PCs)
              </span>
            </div>
          </div>

          <nav style={{ padding: "10px 8px", flex: 1, overflowY: "auto" }}>
            {NAV.filter((n) => n.id !== "users" || ["admin", "Admin", "shop_admin"].includes(currentUser?.role || "shop_admin")).map((n) => {
              const active = page === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setPage(n.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "none",
                    background: active ? "#ffffff18" : "transparent",
                    color: active ? "#fff" : "#ffffff66",
                    fontWeight: active ? 600 : 400,
                    fontSize: 13,
                    cursor: "pointer",
                    marginBottom: 2,
                    transition: "all .15s",
                    textAlign: "left",
                    boxShadow: active ? `inset 0 0 0 1px #ffffff14` : "none",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "#ffffff0e";
                      e.currentTarget.style.color = "#ffffffaa";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#ffffff66";
                    }
                  }}
                >
                  {active && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "20%",
                        bottom: "20%",
                        width: 3,
                        background: T.accent,
                        borderRadius: "0 3px 3px 0",
                      }}
                    />
                  )}
                  <span style={{ fontSize: 15, opacity: active ? 1 : 0.8 }}>
                    {n.icon}
                  </span>
                  <span>{n.label}</span>
                </button>
              );
            })}
          </nav>

          <div
            style={{
              padding: "10px 10px 12px",
              borderTop: `1px solid ${T.sidebarBorder}`,
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                color: "#ffffff44",
                padding: "0 4px",
                marginBottom: 2,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background:
                      "linear-gradient(135deg,#6366f144,#a855f722)",
                    border: "1px solid #6366f133",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#a78bfa",
                  }}
                >
                  <UserIcon />
                </div>
                <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                  <div
                    style={{
                      color: "#ffffffaa",
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={currentUser.name || currentUser.email}
                  >
                    {currentUser.name || currentUser.email}
                  </div>
                  <div
                    style={{
                      color: "#ffffff44",
                      fontSize: 10,
                      textTransform: "capitalize",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {currentUser.role}
                  </div>
                </div>
              </div>
              <div>
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                <BoxIcon /> {products.length} products &nbsp;·&nbsp; <ReceiptIcon /> {sales.length} sales
              </div>
              {saveMsg && (
                <div
                  style={{
                    color: T.green,
                    fontSize: 10,
                    marginTop: 2,
                    fontWeight: 600,
                  }}
                >
                  {saveMsg}
                </div>
              )}
              <div
                style={{
                  color: "#38bdf8",
                  fontSize: 10,
                  marginTop: 2,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {cloudStatus || "Local Storage"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => {
                  if (window.confirm("Sign out?")) {
                    onLogout();
                  }
                }}
                style={{
                  flex: 1,
                  background: "#1e1040",
                  color: "#a78bfa",
                  border: "1px solid #6366f133",
                  borderRadius: 7,
                  padding: "5px 0",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = ".8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Logout
              </button>
              <button
                onClick={() => setShowClear(true)}
                style={{
                  display: ["admin", "Admin", "shop_admin"].includes(currentUser.role) ? "flex" : "none",
                  flex: 1,
                  background: T.redDim,
                  color: T.red,
                  border: `1px solid ${T.red}44`,
                  borderRadius: 7,
                  padding: "5px 0",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all .15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = ".8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Clear
              </button>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={exportBackup}
                style={{
                  flex: 1,
                  background: "#ffffff0a",
                  color: "#ffffffaa",
                  border: "1px solid #ffffff15",
                  borderRadius: 7,
                  padding: "5px 0",
                  fontSize: 11,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#ffffff16")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#ffffff0a")
                }
              >
                Backup
              </button>
              <button
                onClick={() => importRef.current?.click()}
                style={{
                  flex: 1,
                  background: "#ffffff0a",
                  color: "#ffffffaa",
                  border: "1px solid #ffffff15",
                  borderRadius: 7,
                  padding: "5px 0",
                  fontSize: 11,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#ffffff16")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#ffffff0a")
                }
              >
                Restore
              </button>
            </div>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={handleRestoreBackup}
            />
            <div
              style={{
                textAlign: "center",
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid #ffffff08",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "#ffffff18",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                }}
              >
                Powered by
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: "linear-gradient(90deg,#6366f1,#06b6d4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: ".03em",
                  marginTop: 2,
                }}
              >
                Thiranity Tech
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24, background: T.bg }}>
          {activePageComponent}
        </div>
      </div>
      {showClear && (
        <DataClearModal
          onClose={() => setShowClear(false)}
          onClear={handleClear}
        />
      )}
    </>
  );
}

export default AppShell;




