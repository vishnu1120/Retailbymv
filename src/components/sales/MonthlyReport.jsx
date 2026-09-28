import React, { useState, useMemo } from "react";
import { T } from "../../constants/theme";
import { fmt, today, monthKey, n } from "../../utils/formatters";
import { exportToExcel } from "../../utils/excelUtils";
import StatCard from "../common/StatCard";
import Btn from "../common/Btn";
import Card from "../common/Card";
import Select from "../common/Select";

export function MonthlyReport({ sales = [], products = [], arrivals = [], expenses = [], shopConfig = {} }) {
  const [periodType, setPeriodType] = useState("monthly"); // 'daily' | 'weekly' | 'monthly'
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

  // Compute P&L statement data
  const data = useMemo(() => {
    let filteredSales = [];
    let filteredExpenses = [];
    let titleHeader = "";
    let shortCode = "";

    if (periodType === "daily") {
      titleHeader = `Daily Report — ${selectedDate}`;
      shortCode = selectedDate;
      filteredSales = sales.filter((s) => s.date && s.date.startsWith(selectedDate));
      filteredExpenses = expenses.filter((e) => e.date && e.date.startsWith(selectedDate));
    } else if (periodType === "weekly") {
      const end = new Date(selectedDate);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const startStr = start.toISOString().slice(0, 10);
      titleHeader = `Weekly Report — ${startStr} to ${selectedDate}`;
      shortCode = `${startStr}_${selectedDate}`;

      filteredSales = sales.filter((s) => s.date && s.date >= startStr && s.date <= selectedDate);
      filteredExpenses = expenses.filter((e) => e.date && e.date >= startStr && e.date <= selectedDate);
    } else {
      titleHeader = `Monthly Report — ${selectedMonth}`;
      shortCode = selectedMonth;
      filteredSales = sales.filter((s) => monthKey(s.date) === selectedMonth);
      filteredExpenses = expenses.filter((e) => monthKey(e.date) === selectedMonth);
    }

    // Itemized Sales & Cost Calculation
    const soldMap = {};
    filteredSales.forEach((s) => {
      (s.items || []).forEach((it) => {
        if (!soldMap[it.productId]) {
          soldMap[String(it.productId)] = { name: it.name, qty: 0, revenue: 0, cost: 0 };
        }
        const key = String(it.productId);
        soldMap[key].qty += n(it.qty);
        soldMap[key].revenue += n(it.total);

        const pr = products.find((p) => String(p.id) === key);
        soldMap[key].cost += n(pr?.cost) * n(it.qty);
      });
    });

    const rows = Object.entries(soldMap).sort((a, b) => b[1].revenue - a[1].revenue);
    const totalQty = rows.reduce((s, [, v]) => s + v.qty, 0);
    const revenue = rows.reduce((s, [, v]) => s + v.revenue, 0);
    const cogs = rows.reduce((s, [, v]) => s + v.cost, 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + (n(e.amount) || 0), 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;
    const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : "0.0";
    const netMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : "0.0";
    const cogsPct = revenue > 0 ? ((cogs / revenue) * 100).toFixed(1) : "0.0";
    const expPct = revenue > 0 ? ((totalExpenses / revenue) * 100).toFixed(1) : "0.0";

    return {
      titleHeader,
      shortCode,
      rows,
      totalQty,
      revenue,
      cogs,
      cogsPct,
      totalExpenses,
      expPct,
      grossProfit,
      netProfit,
      grossMargin,
      netMargin,
      salesCount: filteredSales.length,
    };
  }, [periodType, selectedDate, selectedMonth, sales, expenses, products]);

  const fmtNum = (v) => Number(v || 0).toFixed(2);

  // 1. Export to PDF (Window Print)
  const handlePrintPDF = () => {
    window.print();
  };

  // 2. Export to Excel (.xlsx format)
  const exportExcel = () => {
    const filename = `${data.titleHeader.replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`;
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          th { background-color: #000000; color: #ffffff; font-weight: bold; }
          .bold { font-weight: bold; }
          .green { color: #15803d; font-weight: bold; }
          .section-head { background-color: #f1f5f9; font-weight: bold; }
          td { padding: 6px 10px; }
        </style>
      </head>
      <body>
        <h2>${data.titleHeader}</h2>
        <p>Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} | RetailERP</p>

        <table border="1">
          <thead>
            <tr>
              <th colspan="3">Profit & Loss Statement</th>
            </tr>
            <tr className="section-head">
              <th>Item</th>
              <th>Amount (₹)</th>
              <th>% of Revenue</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Revenue from Sales</td>
              <td>${fmtNum(data.revenue)}</td>
              <td>100%</td>
            </tr>
            <tr>
              <td>Less: Cost of Goods</td>
              <td>${fmtNum(data.cogs)}</td>
              <td>${data.cogsPct}%</td>
            </tr>
            <tr style="background-color: #f0fdf4;">
              <td><b>Gross Profit</b></td>
              <td className="green">${fmtNum(data.grossProfit)}</td>
              <td className="green">${data.grossMargin}%</td>
            </tr>
            <tr>
              <td>Less: Expenses</td>
              <td>${fmtNum(data.totalExpenses)}</td>
              <td>${data.expPct}%</td>
            </tr>
            <tr style="background-color: #dcfce7; font-size: 14px;">
              <td><b>Net Profit / Loss</b></td>
              <td className="green"><b>${fmtNum(data.netProfit)}</b></td>
              <td className="green"><b>${data.netMargin}%</b></td>
            </tr>
          </tbody>
        </table>

        <br/>
        <h3>Product-wise Sales (${data.rows.length} products)</h3>
        <table border="1">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Units</th>
              <th>Revenue (₹)</th>
              <th>Cost (₹)</th>
              <th>Gross Profit (₹)</th>
              <th>Margin %</th>
            </tr>
          </thead>
          <tbody>
            ${data.rows
              .map(
                ([, v], i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${v.name}</td>
                <td>${v.qty}</td>
                <td>${fmtNum(v.revenue)}</td>
                <td>${fmtNum(v.cost)}</td>
                <td style="color:#15803d; font-weight:bold">${fmtNum(v.revenue - v.cost)}</td>
                <td>${v.revenue > 0 ? (((v.revenue - v.cost) / v.revenue) * 100).toFixed(1) : 0}%</td>
              </tr>
            `
              )
              .join("")}
            <tr style="background-color:#f1f5f9; font-weight:bold">
              <td colspan="2">TOTAL</td>
              <td>${data.totalQty}</td>
              <td>${fmtNum(data.revenue)}</td>
              <td>${fmtNum(data.cogs)}</td>
              <td style="color:#15803d">${fmtNum(data.grossProfit)}</td>
              <td>${data.grossMargin}%</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const rows = [
      { Section: "Profit & Loss Statement", Item: "Revenue from Sales", Amount: n(data.revenue), Percentage: "100%" },
      { Section: "Profit & Loss Statement", Item: "Less: Cost of Goods", Amount: n(data.cogs), Percentage: `${data.cogsPct}%` },
      { Section: "Profit & Loss Statement", Item: "Gross Profit", Amount: n(data.grossProfit), Percentage: `${data.grossMargin}%` },
      { Section: "Profit & Loss Statement", Item: "Less: Expenses", Amount: n(data.totalExpenses), Percentage: `${data.expPct}%` },
      { Section: "Profit & Loss Statement", Item: "Net Profit / Loss", Amount: n(data.netProfit), Percentage: `${data.netMargin}%` },
      ...data.rows.map(([, value], index) => ({
        Section: "Product-wise Sales",
        Item: value.name,
        Units: n(value.qty),
        Revenue: n(value.revenue),
        Cost: n(value.cost),
        GrossProfit: n(value.revenue) - n(value.cost),
        Row: index + 1,
      })),
    ];
    exportToExcel(filename, "Report", rows);
  };

  // 3. Export to CSV (.csv format)
  const exportCSV = () => {
    const filename = `${data.titleHeader.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`;
    const lines = [
      [`${data.titleHeader}`],
      [`Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} | RetailERP`],
      [],
      ["Profit & Loss Statement"],
      ["Item", "Amount (₹)", "% of Revenue"],
      ["Revenue from Sales", fmtNum(data.revenue), "100%"],
      ["Less: Cost of Goods", fmtNum(data.cogs), `${data.cogsPct}%`],
      ["Gross Profit", fmtNum(data.grossProfit), `${data.grossMargin}%`],
      ["Less: Expenses", fmtNum(data.totalExpenses), `${data.expPct}%`],
      ["Net Profit / Loss", fmtNum(data.netProfit), `${data.netMargin}%`],
      [],
      [`Product-wise Sales (${data.rows.length} products)`],
      ["#", "Product", "Units", "Revenue (₹)", "Cost (₹)", "Gross Profit (₹)", "Margin %"],
      ...data.rows.map(([, v], i) => {
        const profit = v.revenue - v.cost;
        const margin = v.revenue > 0 ? (((v.revenue - v.cost) / v.revenue) * 100).toFixed(1) : "0.0";
        return [i + 1, v.name, v.qty, fmtNum(v.revenue), fmtNum(v.cost), fmtNum(profit), margin + "%"];
      }),
      ["TOTAL", "", data.totalQty, fmtNum(data.revenue), fmtNum(data.cogs), fmtNum(data.grossProfit), `${data.grossMargin}%`],
    ];

    const csvContent = lines
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* High-Contrast Print & PDF Styling matching exact target document layout */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-report, .printable-report * { visibility: visible; }
          .printable-report { position: absolute; left: 0; top: 0; width: 100%; color: #000 !important; background: #fff !important; font-family: 'Inter', sans-serif !important; }
          .no-print { display: none !important; }
          .pnl-table, .pnl-table th, .pnl-table td { border: 1px solid #000 !important; }
          .pnl-table th { background: #000 !important; color: #fff !important; }
        }
      `}</style>

      {/* Screen Title & 3 Export Buttons: PDF, Excel, CSV */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>
            📈 Profit & Loss Statement Report
          </h2>
    
        </div>

        {/* 3 Dedicated Export Options */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={handlePrintPDF} style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "#fff" }}>
            📄 Save PDF / Print
          </Btn>
          <Btn onClick={exportExcel} style={{ background: "#10b981", color: "#fff", border: "none" }}>
            📊 Export Excel (.xlsx)
          </Btn>
          <Btn onClick={exportCSV} style={{ background: T.surface, color: T.text, border: `1px solid ${T.border}` }}>
            📑 Export CSV (.csv)
          </Btn>
        </div>
      </div>

      {/* Period Selection Controls Bar */}
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
                  outline: "none",
                }}
              />
            )}
          </div>
        </div>
      </Card>

      {/* Exact Target Document Print View Container */}
      <div className="printable-report">
        {/* Document Header */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: T.text, margin: 0, letterSpacing: "-.02em" }}>
            {data.titleHeader}
          </h1>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            Generated on {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} | RetailERP
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", fontWeight: 700 }}>REVENUE</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.green, marginTop: 2 }}>{fmt(data.revenue)}</div>
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", fontWeight: 700 }}>GROSS PROFIT</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.green, marginTop: 2 }}>{fmt(data.grossProfit)}</div>
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", fontWeight: 700 }}>NET PROFIT</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: data.netProfit >= 0 ? T.green : "#ef4444", marginTop: 2 }}>{fmt(data.netProfit)}</div>
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", fontWeight: 700 }}>EXPENSES</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#ef4444", marginTop: 2 }}>{fmt(data.totalExpenses)}</div>
          </div>
        </div>

        {/* Section 1: Profit & Loss Statement Table */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text, margin: "0 0 8px", borderBottom: `2px solid ${T.border}`, paddingBottom: 4 }}>
            Profit & Loss Statement
          </h3>
          <table className="pnl-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: `1px solid ${T.border}` }}>
            <thead>
              <tr style={{ background: T.surface, color: T.text, fontWeight: 800, borderBottom: `2px solid ${T.border}` }}>
                <th style={{ textAlign: "left", padding: "8px 12px", width: "45%" }}>Item</th>
                <th style={{ textAlign: "right", padding: "8px 12px", width: "30%" }}>Amount (₹)</th>
                <th style={{ textAlign: "right", padding: "8px 12px", width: "25%" }}>% of Revenue</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${T.border}44` }}>
                <td style={{ padding: "8px 12px", color: T.text }}>Revenue from Sales</td>
                <td style={{ textAlign: "right", padding: "8px 12px", fontWeight: 700, color: T.text }}>{fmtNum(data.revenue)}</td>
                <td style={{ textAlign: "right", padding: "8px 12px", color: T.muted }}>100%</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${T.border}44` }}>
                <td style={{ padding: "8px 12px", color: T.text }}>Less: Cost of Goods</td>
                <td style={{ textAlign: "right", padding: "8px 12px", color: T.text }}>{fmtNum(data.cogs)}</td>
                <td style={{ textAlign: "right", padding: "8px 12px", color: T.muted }}>{data.cogsPct}%</td>
              </tr>
              <tr style={{ borderBottom: `2px solid ${T.border}`, background: `${T.green}10`, fontWeight: 800 }}>
                <td style={{ padding: "8px 12px", color: T.text }}>Gross Profit</td>
                <td style={{ textAlign: "right", padding: "8px 12px", color: T.green }}>{fmtNum(data.grossProfit)}</td>
                <td style={{ textAlign: "right", padding: "8px 12px", color: T.green }}>{data.grossMargin}%</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${T.border}44` }}>
                <td style={{ padding: "8px 12px", color: T.text }}>Less: Expenses</td>
                <td style={{ textAlign: "right", padding: "8px 12px", color: T.text }}>{fmtNum(data.totalExpenses)}</td>
                <td style={{ textAlign: "right", padding: "8px 12px", color: T.muted }}>{data.expPct}%</td>
              </tr>
              <tr style={{ borderBottom: `2px solid ${T.border}`, background: data.netProfit >= 0 ? `${T.green}18` : "#ef444418", fontWeight: 800, fontSize: 13 }}>
                <td style={{ padding: "10px 12px", color: T.text }}>Net Profit / Loss</td>
                <td style={{ textAlign: "right", padding: "10px 12px", color: data.netProfit >= 0 ? T.green : "#ef4444" }}>{fmtNum(data.netProfit)}</td>
                <td style={{ textAlign: "right", padding: "10px 12px", color: data.netProfit >= 0 ? T.green : "#ef4444" }}>{data.netMargin}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Product-wise Sales Table */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text, margin: "0 0 8px", borderBottom: `2px solid ${T.border}`, paddingBottom: 4 }}>
            Product-wise Sales ({data.rows.length} products)
          </h3>
          <table className="pnl-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: `1px solid ${T.border}` }}>
            <thead>
              <tr style={{ background: T.surface, color: T.text, fontWeight: 800, borderBottom: `2px solid ${T.border}` }}>
                <th style={{ textAlign: "center", padding: "6px 8px", width: "5%" }}>#</th>
                <th style={{ textAlign: "left", padding: "6px 8px", width: "35%" }}>Product</th>
                <th style={{ textAlign: "center", padding: "6px 8px", width: "10%" }}>Units</th>
                <th style={{ textAlign: "right", padding: "6px 8px", width: "13%" }}>Revenue (₹)</th>
                <th style={{ textAlign: "right", padding: "6px 8px", width: "12%" }}>Cost (₹)</th>
                <th style={{ textAlign: "right", padding: "6px 8px", width: "15%" }}>Gross Profit (₹)</th>
                <th style={{ textAlign: "right", padding: "6px 8px", width: "10%" }}>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map(([, v], i) => {
                const profit = v.revenue - v.cost;
                const margin = v.revenue > 0 ? (((v.revenue - v.cost) / v.revenue) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}33` }}>
                    <td style={{ textAlign: "center", padding: "6px 8px", color: T.muted }}>{i + 1}</td>
                    <td style={{ padding: "6px 8px", color: T.text, fontWeight: 600 }}>{v.name}</td>
                    <td style={{ textAlign: "center", padding: "6px 8px", color: T.text, fontWeight: 700 }}>{v.qty}</td>
                    <td style={{ textAlign: "right", padding: "6px 8px", color: T.text, fontWeight: 700 }}>{fmtNum(v.revenue)}</td>
                    <td style={{ textAlign: "right", padding: "6px 8px", color: T.muted }}>{fmtNum(v.cost)}</td>
                    <td style={{ textAlign: "right", padding: "6px 8px", color: T.green, fontWeight: 700 }}>{fmtNum(profit)}</td>
                    <td style={{ textAlign: "right", padding: "6px 8px", color: T.green, fontWeight: 600 }}>{margin}%</td>
                  </tr>
                );
              })}
              {/* Summary Row */}
              <tr style={{ background: T.surface, fontWeight: 800, borderTop: `2px solid ${T.border}`, fontSize: 12 }}>
                <td colSpan="2" style={{ padding: "8px 12px", color: T.text }}>TOTAL</td>
                <td style={{ textAlign: "center", padding: "8px 6px", color: T.text }}>{data.totalQty}</td>
                <td style={{ textAlign: "right", padding: "8px 6px", color: T.text }}>{fmtNum(data.revenue)}</td>
                <td style={{ textAlign: "right", padding: "8px 6px", color: T.muted }}>{fmtNum(data.cogs)}</td>
                <td style={{ textAlign: "right", padding: "8px 6px", color: T.green }}>{fmtNum(data.grossProfit)}</td>
                <td style={{ textAlign: "right", padding: "8px 6px", color: T.green }}>{data.grossMargin}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Printable Footer */}
        <div style={{ marginTop: 24, textAlign: "center", fontSize: 10, color: T.muted, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
          RetailERP | {data.titleHeader} | Computer-generated report
        </div>
      </div>
    </div>
  );
}

export default MonthlyReport;
