import React, { useState, useMemo } from "react";
import { T } from "../../constants/theme";
import { fmt, today, monthKey, n } from "../../utils/formatters";
import StatCard from "../common/StatCard";
import Btn from "../common/Btn";
import Card from "../common/Card";
import Select from "../common/Select";

export function FinancialReport({
  sales = [],
  products = [],
  arrivals = [],
  expenses = [],
  payables = [],
  receivables = [],
  cashLedger = [],
  shopConfig = {},
}) {
  const [periodType, setPeriodType] = useState("daily"); // 'daily' | 'weekly' | 'monthly'
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedMonth, setSelectedMonth] = useState(today().slice(0, 7));

  // Available months list
  const months = useMemo(() => {
    const set = new Set([
      ...sales.map((s) => monthKey(s.date)),
      ...expenses.map((e) => monthKey(e.date)),
      today().slice(0, 7),
    ]);
    return [...set].sort().reverse();
  }, [sales, expenses]);

  // Compute period metrics
  const data = useMemo(() => {
    let filteredSales = [];
    let filteredExpenses = [];
    let periodLabel = "";

    if (periodType === "daily") {
      periodLabel = `Daily (${selectedDate})`;
      filteredSales = sales.filter((s) => s.date && s.date.startsWith(selectedDate));
      filteredExpenses = expenses.filter((e) => e.date && e.date.startsWith(selectedDate));
    } else if (periodType === "weekly") {
      const end = new Date(selectedDate);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const startStr = start.toISOString().slice(0, 10);
      periodLabel = `Weekly (${startStr} to ${selectedDate})`;

      filteredSales = sales.filter((s) => s.date && s.date >= startStr && s.date <= selectedDate);
      filteredExpenses = expenses.filter((e) => e.date && e.date >= startStr && e.date <= selectedDate);
    } else {
      periodLabel = `Monthly (${selectedMonth})`;
      filteredSales = sales.filter((s) => monthKey(s.date) === selectedMonth);
      filteredExpenses = expenses.filter((e) => monthKey(e.date) === selectedMonth);
    }

    // Revenue & Profit
    let totalSales = 0;
    let cogs = 0;

    filteredSales.forEach((s) => {
      totalSales += n(s.total);
      (s.items || []).forEach((it) => {
        const pr = products.find((p) => String(p.id) === String(it.productId));
        cogs += n(pr?.cost) * n(it.qty);
      });
    });

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (n(e.amount) || 0), 0);
    const grossProfit = totalSales - cogs;
    const netProfit = grossProfit - totalExpenses;

    // Crucial Balance Sheet Snapshot Metrics
    const cashInHand = cashLedger.reduce((balance, entry) => {
      const type = String(entry.type || "").toLowerCase();
      const isOut = type.includes("out") || type.includes("exp") || type.includes("debit") || type.includes("paid");
      return balance + (isOut ? -n(entry.amount) : n(entry.amount));
    }, 0);
    const stockValue = products.reduce((sum, p) => sum + n(p.stock) * n(p.cost), 0);
    const customerDues = receivables.reduce((sum, r) => sum + n(r.balance || r.amount), 0);
    const supplierDues = payables.reduce((sum, p) => sum + n(p.balance || p.amount), 0);

    const totalAssets = cashInHand + stockValue + customerDues;
    const netWorth = totalAssets - supplierDues;

    return {
      periodLabel,
      totalSales,
      totalExpenses,
      grossProfit,
      netProfit,
      cashInHand,
      stockValue,
      customerDues,
      supplierDues,
      totalAssets,
      netWorth,
    };
  }, [periodType, selectedDate, selectedMonth, sales, expenses, products, payables, receivables, cashLedger]);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-report, .printable-report * { visibility: visible; }
          .printable-report { position: absolute; left: 0; top: 0; width: 100%; color: #000 !important; background: #fff !important; }
          .no-print { display: none !important; }
          .card-box { border: 1px solid #ccc !important; background: #fff !important; color: #000 !important; box-shadow: none !important; }
        }
      `}</style>

      {/* Title & Controls */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>
            ⚖️ Financial Balance Sheet
          </h2>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            Crucial financial overview: Cash, Stock, Dues, and Net Worth.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={() => window.print()} style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "#fff" }}>
            🖨️ Print Report
          </Btn>
        </div>
      </div>

      {/* Period Selection Bar */}
      <Card className="no-print" style={{ marginBottom: 20, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Period:</span>
            <div style={{ display: "flex", background: T.bg, borderRadius: 8, padding: 3, border: `1px solid ${T.border}` }}>
              {["daily", "weekly", "monthly"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodType(p)}
                  style={{
                    background: periodType === p ? T.accent : "transparent",
                    color: periodType === p ? "#fff" : T.muted,
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {periodType === "monthly" ? (
              <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ width: 140 }}>
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
            ) : (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: "6px 12px",
                  color: T.text,
                  fontSize: 12,
                }}
              />
            )}
          </div>
        </div>
      </Card>

      {/* Printable Financial Summary */}
      <div className="printable-report">
        <div style={{ marginBottom: 20, paddingBottom: 12, borderBottom: `2px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: T.text, margin: 0 }}>{shopConfig.shopName || "Retail Shop"}</h1>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{shopConfig.address || "Store Balance Sheet"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.accent }}>BALANCE SHEET</div>
            <div style={{ fontSize: 12, color: T.text, fontWeight: 700 }}>{data.periodLabel}</div>
          </div>
        </div>

        {/* 4 Crucial Stat Highlights */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 24 }}>
          <StatCard label="Cash in Hand" value={fmt(data.cashInHand)} sub="Current cash balance" color={T.green} />
          <StatCard label="Stock Valuation" value={fmt(data.stockValue)} sub="Cost value of current inventory" color={T.accent} />
          <StatCard label="Customer Dues" value={fmt(data.customerDues)} sub="Receivables owed to shop" color="#38bdf8" />
          <StatCard label="Supplier Dues" value={fmt(data.supplierDues)} sub="Payables owed to distributors" color="#ef4444" />
        </div>

        {/* Core Balance Sheet Table */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          {/* ASSETS */}
          <Card className="card-box" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text, margin: "0 0 16px", borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
              🟢 ASSETS (What Shop Owns)
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: T.muted }}>Cash in Hand:</span>
                <span style={{ fontWeight: 700, color: T.text }}>{fmt(data.cashInHand)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: T.muted }}>Stock Inventory Value (at Cost):</span>
                <span style={{ fontWeight: 700, color: T.text }}>{fmt(data.stockValue)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: T.muted }}>Customer Pending Dues (Receivables):</span>
                <span style={{ fontWeight: 700, color: T.text }}>{fmt(data.customerDues)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: `2px solid ${T.border}`, fontSize: 14, fontWeight: 800 }}>
                <span>TOTAL ASSETS:</span>
                <span style={{ color: T.green }}>{fmt(data.totalAssets)}</span>
              </div>
            </div>
          </Card>

          {/* LIABILITIES & NET WORTH */}
          <Card className="card-box" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text, margin: "0 0 16px", borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
              🔴 LIABILITIES & NET WORTH
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: T.muted }}>Supplier Pending Dues (Payables):</span>
                <span style={{ fontWeight: 700, color: "#ef4444" }}>{fmt(data.supplierDues)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: T.muted }}>Net Business Value (Assets - Liabilities):</span>
                <span style={{ fontWeight: 700, color: T.accent }}>{fmt(data.netWorth)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 38, borderTop: `2px solid ${T.border}`, fontSize: 14, fontWeight: 800 }}>
                <span>TOTAL LIABILITIES & NET WORTH:</span>
                <span style={{ color: T.accent }}>{fmt(data.totalAssets)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Crucial Period Income & Expense Summary */}
        <Card className="card-box" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text, margin: "0 0 16px", borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
            📊 Income & Expense Summary ({data.periodLabel})
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase" }}>Total Sales</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginTop: 4 }}>{fmt(data.totalSales)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase" }}>Total Expenses</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444", marginTop: 4 }}>{fmt(data.totalExpenses)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase" }}>Gross Profit</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.accent, marginTop: 4 }}>{fmt(data.grossProfit)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase" }}>Net Profit</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: data.netProfit >= 0 ? T.green : "#ef4444", marginTop: 4 }}>{fmt(data.netProfit)}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default FinancialReport;
