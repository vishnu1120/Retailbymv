import React, { useState, useMemo } from "react";
import { T } from "../../constants/theme";
import { LARGE_TABLE_LIMIT } from "../../constants/config";
import { fmt, lower, n, today } from "../../utils/formatters";
import { getPointsRule, isRealCustomer, calcPointsForAmount } from "../../utils/loyaltyUtils";
import { printGSTInvoice } from "../../services/printService";
import Badge from "../common/Badge";
import Btn from "../common/Btn";
import Card from "../common/Card";
import Modal from "../common/Modal";
import Input from "../common/Input";

const getDaysDiff = (dateStr) => {
  if (!dateStr) return 9999;
  const d = new Date(dateStr.slice(0, 10));
  if (isNaN(d.getTime())) return 9999;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const matchesPeriod = (saleDate, period, customDate, customMonth) => {
  if (!saleDate) return false;
  const dStr = String(saleDate).slice(0, 10);
  if (period === "all") return true;
  if (period === "daily") {
    const target = customDate || today();
    return dStr === target;
  }
  if (period === "weekly") {
    return getDaysDiff(dStr) <= 7;
  }
  if (period === "monthly") {
    const targetMonth = customMonth || today().slice(0, 7);
    return dStr.slice(0, 7) === targetMonth;
  }
  return true;
};

const matchesPayment = (sale, payMode) => {
  if (!payMode || payMode === "all") return true;
  const target = payMode.toLowerCase();
  const hasModeInPayments = sale.payments?.some((p) =>
    String(p.mode || "").toLowerCase().includes(target)
  );
  const hasModeInSingle = String(sale.paymentMode || "").toLowerCase().includes(target);
  return hasModeInPayments || hasModeInSingle;
};

export function SalesHistory({ sales, shopConfig }) {
  const pointsRule = useMemo(() => getPointsRule(shopConfig), [shopConfig]);
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedCustDetail, setSelectedCustDetail] = useState(null);
  const [tab, setTab] = useState("all"); // "all" | "customers"
  
  // Filters
  const [payFilter, setPayFilter] = useState("all"); // "all" | "Cash" | "UPI" | "Card" | "Credit"
  const [periodFilter, setPeriodFilter] = useState("all"); // "all" | "daily" | "weekly" | "monthly"
  const [customDate, setCustomDate] = useState(today());
  const [customMonth, setCustomMonth] = useState(today().slice(0, 7));
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCust, setSearchCust] = useState("");

  // Filtered Sales List for "All Invoices" tab
  const filteredSales = useMemo(() => {
    const q = lower(searchQuery);
    return sales.filter((s) => {
      const matchQ =
        !q ||
        lower(s.id).includes(q) ||
        lower(s.customer).includes(q) ||
        (s.phone && String(s.phone).includes(q));
      const matchP = matchesPeriod(s.date, periodFilter, customDate, customMonth);
      const matchPay = matchesPayment(s, payFilter);
      return matchQ && matchP && matchPay;
    }).sort((a, b) => {
      const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
      if (dateCompare) return dateCompare;
      return String(b.createdAt || b.created_at || "").localeCompare(String(a.createdAt || a.created_at || ""));
    });
  }, [sales, searchQuery, periodFilter, customDate, customMonth, payFilter]);

  const visibleSales = useMemo(
    () => filteredSales.slice(0, LARGE_TABLE_LIMIT),
    [filteredSales]
  );

  // Sales totals summary for filtered invoice list
  const salesSummary = useMemo(() => {
    let totalRev = 0;
    let cashRev = 0;
    let upiRev = 0;
    let cardRev = 0;
    let creditRev = 0;

    filteredSales.forEach((s) => {
      totalRev += n(s.total);
      if (s.payments && s.payments.length > 0) {
        s.payments.forEach((p) => {
          const m = lower(p.mode);
          const amt = n(p.amount);
          if (m.includes("cash")) cashRev += amt;
          else if (m.includes("upi")) upiRev += amt;
          else if (m.includes("card")) cardRev += amt;
          else if (m.includes("credit") || m.includes("khata")) creditRev += amt;
          else cashRev += amt;
        });
      } else {
        const m = lower(s.paymentMode || "cash");
        const amt = n(s.total);
        if (m.includes("cash")) cashRev += amt;
        else if (m.includes("upi")) upiRev += amt;
        else if (m.includes("card")) cardRev += amt;
        else if (m.includes("credit")) creditRev += amt;
        else cashRev += amt;
      }
    });

    return { totalRev, cashRev, upiRev, cardRev, creditRev };
  }, [filteredSales]);

  // Customer Rows with Period Filtering (Daily / Weekly / Monthly / All Time)
  const customerRows = useMemo(() => {
    const custMap = {};
    
    // Filter sales by selected period for customer analytics
    const salesInPeriod = sales.filter((s) =>
      matchesPeriod(s.date, periodFilter, customDate, customMonth)
    );

    salesInPeriod.forEach((s) => {
      const k = s.phone || s.customer || "Walk-in";
      if (!custMap[k]) {
        custMap[k] = {
          key: k,
          name: s.customer || "Walk-in",
          phone: s.phone || "",
          invoices: [],
          totalSpent: 0,
          points: 0,
          paymentModes: new Set(),
          lastVisit: s.date,
        };
      }
      custMap[k].invoices.push(s);
      custMap[k].totalSpent += n(s.total);

      // Payment modes used by this customer
      if (s.payments && s.payments.length > 0) {
        s.payments.forEach((p) => custMap[k].paymentModes.add(p.mode));
      } else if (s.paymentMode) {
        custMap[k].paymentModes.add(s.paymentMode);
      }

      // Calculate total loyalty points across all time for real customers
      const isReal = isRealCustomer(s.customer, s.phone);
      if (isReal) {
        custMap[k].points += Number.isFinite(Number(s.pointsEarned))
          ? Number(s.pointsEarned)
          : calcPointsForAmount(s.total, pointsRule);
      }
    });

    return Object.values(custMap).sort(
      (a, b) => b.totalSpent - a.totalSpent || b.invoices.length - a.invoices.length
    );
  }, [sales, periodFilter, customDate, customMonth, pointsRule]);

  const filteredCustomers = useMemo(() => {
    const q = lower(searchCust);
    return customerRows
      .filter((c) => {
        const matchQ =
          !q || lower(c.name).includes(q) || (c.phone && String(c.phone).includes(q));
        const matchPay =
          payFilter === "all" ||
          Array.from(c.paymentModes).some((m) => lower(m).includes(lower(payFilter)));
        return matchQ && matchPay;
      })
      .slice(0, LARGE_TABLE_LIMIT);
  }, [customerRows, searchCust, payFilter]);

  const customerTotalsSummary = useMemo(() => {
    const totalSpentInPeriod = filteredCustomers.reduce((s, c) => s + c.totalSpent, 0);
    const totalPoints = filteredCustomers.reduce((s, c) => s + c.points, 0);
    const giftReady = filteredCustomers.filter((c) => c.points >= pointsRule.giftAt).length;
    return { totalSpentInPeriod, totalPoints, giftReady };
  }, [filteredCustomers, pointsRule]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: T.text }}>
            Sales History & Customers
          </div>
          <div style={{ fontSize: 12, color: T.muted }}>
            View transactions, filter by payment methods & customer period statistics
          </div>
        </div>

        {/* Total Stat Badges */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              background: T.purpleDim,
              color: T.purple,
              border: `1px solid ${T.purple}44`,
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Loyalty Points: {customerTotalsSummary.totalPoints}
          </span>
          <span
            style={{
              background: T.greenDim,
              color: T.green,
              border: `1px solid ${T.green}44`,
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Gift Ready: {customerTotalsSummary.giftReady}
          </span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            ["all", "📋 All Invoices"],
            ["customers", "👥 Customer Period Sales"],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                border: `1px solid ${tab === k ? T.accent : T.border}`,
                background: tab === k ? T.accentDim : T.surface,
                color: tab === k ? T.accent : T.muted,
                transition: "all 0.15s ease",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Global Filter Bar (Period & Payment Mode) */}
      <Card style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          
          {/* Period Filter (Daily, Weekly, Monthly, All) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>
              Period:
            </span>
            {[
              ["all", "All Time"],
              ["daily", "Daily 📅"],
              ["weekly", "Weekly (7d) 🗓️"],
              ["monthly", "Monthly 📆"],
            ].map(([pk, pl]) => (
              <button
                key={pk}
                onClick={() => setPeriodFilter(pk)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `1px solid ${periodFilter === pk ? T.accent : T.border}`,
                  background: periodFilter === pk ? T.accent : "transparent",
                  color: periodFilter === pk ? "#fff" : T.text,
                }}
              >
                {pl}
              </button>
            ))}

            {/* Custom Date / Month Selector Inputs */}
            {periodFilter === "daily" && (
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                style={{ width: 140, padding: "4px 8px", fontSize: 12 }}
              />
            )}
            {periodFilter === "monthly" && (
              <Input
                type="month"
                value={customMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
                style={{ width: 150, padding: "4px 8px", fontSize: 12 }}
              />
            )}
          </div>

          {/* Payment Method Filter (Cash, UPI, Card) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>
              Payment Mode:
            </span>
            {[
              ["all", "All Modes"],
              ["Cash", "💵 Cash"],
              ["UPI", "📱 UPI"],
              ["Card", "💳 Card"],
            ].map(([pm, pml]) => (
              <button
                key={pm}
                onClick={() => setPayFilter(pm)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `1px solid ${payFilter === pm ? T.accent : T.border}`,
                  background: payFilter === pm ? T.accentDim : "transparent",
                  color: payFilter === pm ? T.accent : T.muted,
                }}
              >
                {pml}
              </button>
            ))}
          </div>

        </div>

        {/* Revenue & Payment Mode Summary Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
            paddingTop: 8,
            borderTop: `1px dashed ${T.border}`,
          }}
        >
          <div style={{ background: T.surface, padding: "8px 12px", borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: T.muted }}>Total Revenue</div>
            <div className="mono" style={{ fontWeight: 800, color: T.green, fontSize: 14 }}>
              {fmt(salesSummary.totalRev)}
            </div>
          </div>
          <div style={{ background: T.surface, padding: "8px 12px", borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: T.muted }}>Cash Sales</div>
            <div className="mono" style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>
              {fmt(salesSummary.cashRev)}
            </div>
          </div>
          <div style={{ background: T.surface, padding: "8px 12px", borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: T.muted }}>UPI Sales</div>
            <div className="mono" style={{ fontWeight: 700, color: T.accent, fontSize: 13 }}>
              {fmt(salesSummary.upiRev)}
            </div>
          </div>
          <div style={{ background: T.surface, padding: "8px 12px", borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: T.muted }}>Card Sales</div>
            <div className="mono" style={{ fontWeight: 700, color: T.purple, fontSize: 13 }}>
              {fmt(salesSummary.cardRev)}
            </div>
          </div>
        </div>
      </Card>

      {/* Tab 1: All Invoices Table */}
      {tab === "all" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Input
              placeholder="🔍 Search Invoice ID, Customer, or Phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: 340 }}
            />
            <span style={{ fontSize: 12, color: T.muted }}>
              Found {filteredSales.length} invoice(s)
            </span>
          </div>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            {filteredSales.length === 0 ? (
              <div style={{ color: T.muted, textAlign: "center", padding: 40 }}>
                No matching sales found for the selected filters.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Points</th>
                    <th>Payment Mode</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSales.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <span className="mono" style={{ color: T.accent, fontWeight: 700 }}>
                          {s.id}
                        </span>
                      </td>
                      <td>{s.date}</td>
                      <td style={{ fontWeight: 600 }}>{s.customer}</td>
                      <td style={{ color: T.muted }}>{s.phone || "—"}</td>
                      <td style={{ color: T.muted }}>{s.items?.length || 0}</td>
                      <td className="mono" style={{ color: T.green, fontWeight: 700 }}>
                        {fmt(s.total)}
                      </td>
                      <td className="mono" style={{ color: T.purple, fontWeight: 700 }}>
                        {Number.isFinite(Number(s.pointsEarned))
                          ? Number(s.pointsEarned)
                          : calcPointsForAmount(s.total, pointsRule)}
                      </td>
                      <td>
                        {s.payments && s.payments.length > 0 ? (
                          s.payments.map((p, i) => (
                            <span key={i} style={{ marginRight: 4 }}>
                              <Badge
                                color={
                                  lower(p.mode).includes("upi")
                                    ? "blue"
                                    : lower(p.mode).includes("card")
                                    ? "purple"
                                    : lower(p.mode).includes("credit")
                                    ? "amber"
                                    : "green"
                                }
                              >
                                {p.mode}
                              </Badge>
                            </span>
                          ))
                        ) : (
                          <Badge color="green">{s.paymentMode || "Cash"}</Badge>
                        )}
                      </td>
                      <td style={{ display: "flex", gap: 4 }}>
                        <Btn size="sm" variant="ghost" onClick={() => setSelectedInvoice(s)}>
                          View
                        </Btn>
                        <Btn
                          size="sm"
                          variant="secondary"
                          onClick={() => printGSTInvoice(s, shopConfig || {})}
                        >
                          🖨️
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {filteredSales.length > visibleSales.length && (
              <div
                style={{
                  padding: "10px 14px",
                  borderTop: `1px solid ${T.border}`,
                  fontSize: 12,
                  color: T.muted,
                  textAlign: "center",
                }}
              >
                Showing latest {visibleSales.length} of {filteredSales.length} invoices.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Customer Sales Period Breakdown */}
      {tab === "customers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Input
              placeholder="🔍 Search Customer Name or Phone…"
              value={searchCust}
              onChange={(e) => setSearchCust(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            <span style={{ fontSize: 12, color: T.muted }}>
              Active Customers ({periodFilter.toUpperCase()}): <b>{filteredCustomers.length}</b> | Total Period Sales: <b className="mono" style={{ color: T.green }}>{fmt(customerTotalsSummary.totalSpentInPeriod)}</b>
            </span>
          </div>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            {filteredCustomers.length === 0 ? (
              <div style={{ color: T.muted, textAlign: "center", padding: 40 }}>
                No customer purchases found for the selected period.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Invoices ({periodFilter})</th>
                    <th>Total Spent ({periodFilter})</th>
                    <th>Loyalty Points</th>
                    <th>Gift Status</th>
                    <th>Payment Preferences</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: T.text }}>{c.name}</td>
                      <td style={{ color: T.muted }}>{c.phone || "—"}</td>
                      <td className="mono" style={{ fontWeight: 700 }}>
                        {c.invoices.length} bill(s)
                      </td>
                      <td className="mono" style={{ color: T.green, fontWeight: 700 }}>
                        {fmt(c.totalSpent)}
                      </td>
                      <td className="mono" style={{ color: T.purple, fontWeight: 700 }}>
                        {c.points}
                      </td>
                      <td>
                        {c.points >= pointsRule.giftAt ? (
                          <Badge color="green">🎁 {pointsRule.giftName}</Badge>
                        ) : (
                          <span style={{ color: T.muted, fontSize: 11 }}>
                            {pointsRule.giftAt - c.points} pts to gift
                          </span>
                        )}
                      </td>
                      <td>
                        {Array.from(c.paymentModes).map((m, idx) => (
                          <span key={idx} style={{ marginRight: 4 }}>
                            <Badge color="gray">{m}</Badge>
                          </span>
                        ))}
                      </td>
                      <td>
                        <Btn
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedCustDetail(c)}
                        >
                          📊 View Profile
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <Modal
          title={`Invoice ${selectedInvoice.id}`}
          onClose={() => setSelectedInvoice(null)}
          width={620}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                fontSize: 13,
              }}
            >
              <div>
                <span style={{ color: T.muted }}>Date: </span>
                <b>{selectedInvoice.date}</b>
              </div>
              <div>
                <span style={{ color: T.muted }}>Customer: </span>
                <b>{selectedInvoice.customer}</b>
              </div>
              <div>
                <span style={{ color: T.muted }}>Phone: </span>
                {selectedInvoice.phone || "—"}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>GST%</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedInvoice.items || []).map((it, i) => (
                  <tr key={i}>
                    <td>{it.name}</td>
                    <td className="mono">{it.qty}</td>
                    <td className="mono">{fmt(it.price)}</td>
                    <td className="mono" style={{ color: T.amber }}>
                      {it.gstPct || 0}%
                    </td>
                    <td className="mono" style={{ color: T.green }}>
                      {fmt(it.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              style={{
                background: T.surface,
                borderRadius: 8,
                padding: 12,
                fontSize: 13,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: T.muted }}>Subtotal</span>
                <span className="mono">{fmt(selectedInvoice.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: T.amber }}>GST (incl.)</span>
                <span className="mono">{fmt(selectedInvoice.totalGST || 0)}</span>
              </div>
              {selectedInvoice.discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: T.green }}>You Saved</span>
                  <span className="mono">−{fmt(selectedInvoice.discount)}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 800,
                  fontSize: 16,
                  color: T.green,
                }}
              >
                <span>TOTAL</span>
                <span className="mono">{fmt(selectedInvoice.total)}</span>
              </div>
            </div>
            <Btn
              onClick={() => printGSTInvoice(selectedInvoice, shopConfig || {})}
              style={{ width: "100%" }}
            >
              🖨️ Print Customer GST Bill
            </Btn>
          </div>
        </Modal>
      )}

      {/* Customer Sales Period Profile Modal */}
      {selectedCustDetail && (
        <Modal
          title={`Customer Period Sales Profile — ${selectedCustDetail.name}`}
          onClose={() => setSelectedCustDetail(null)}
          width={680}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Customer Summary Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                background: T.surface,
                padding: 12,
                borderRadius: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: T.muted }}>Customer Name</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedCustDetail.name}</div>
                <div style={{ fontSize: 11, color: T.accent }}>📞 {selectedCustDetail.phone || "Walk-in"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.muted }}>Period Total ({periodFilter})</div>
                <div className="mono" style={{ fontWeight: 800, color: T.green, fontSize: 16 }}>
                  {fmt(selectedCustDetail.totalSpent)}
                </div>
                <div style={{ fontSize: 11, color: T.muted }}>
                  {selectedCustDetail.invoices.length} Bill(s) in Period
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.muted }}>Loyalty Balance</div>
                <div className="mono" style={{ fontWeight: 800, color: T.purple, fontSize: 16 }}>
                  {selectedCustDetail.points} Points
                </div>
                {selectedCustDetail.points >= pointsRule.giftAt ? (
                  <Badge color="green">🎁 Gift Ready</Badge>
                ) : (
                  <div style={{ fontSize: 11, color: T.muted }}>
                    {pointsRule.giftAt - selectedCustDetail.points} pts for next gift
                  </div>
                )}
              </div>
            </div>

            {/* Invoices List in Selected Period */}
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              Invoices in Period ({periodFilter.toUpperCase()})
            </div>
            <table>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Date</th>
                  <th>Items Qty</th>
                  <th>Total Amount</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedCustDetail.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="mono" style={{ color: T.accent, fontWeight: 700 }}>
                      {inv.id}
                    </td>
                    <td>{inv.date}</td>
                    <td>{(inv.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0)} pcs</td>
                    <td className="mono" style={{ color: T.green, fontWeight: 700 }}>
                      {fmt(inv.total)}
                    </td>
                    <td>
                      {inv.payments && inv.payments.length > 0
                        ? inv.payments.map((p) => p.mode).join(", ")
                        : inv.paymentMode || "Cash"}
                    </td>
                    <td>
                      <Btn
                        size="sm"
                        variant="secondary"
                        onClick={() => printGSTInvoice(inv, shopConfig || {})}
                      >
                        🖨️ Print
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default SalesHistory;
