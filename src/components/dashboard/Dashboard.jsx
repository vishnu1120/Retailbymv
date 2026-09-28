import React, { useMemo } from "react";
import { T } from "../../constants/theme";
import { LARGE_TABLE_LIMIT } from "../../constants/config";
import { fmt, n } from "../../utils/formatters";
import StatCard from "../common/StatCard";
import Card from "../common/Card";

export function Dashboard({
  products,
  sales,
  expenses,
  arrivals,
  payables,
  receivables,
  cashLedger,
}) {
  const productCostById = useMemo(
    () => new Map(products.map((p) => [String(p.id), n(p.cost)])),
    [products]
  );
  const totalSales = useMemo(
    () => sales.reduce((s, i) => s + n(i.total), 0),
    [sales]
  );
  const totalExp = useMemo(
    () => expenses.reduce((s, i) => s + n(i.amount), 0),
    [expenses]
  );
  const totalPur = useMemo(
    () => arrivals.reduce((s, i) => s + n(i.total), 0),
    [arrivals]
  );
  const totalCOGS = useMemo(
    () =>
      sales.reduce(
        (s, inv) =>
          s +
          (inv.items || []).reduce(
            (is, it) => is + (productCostById.get(String(it.productId)) || 0) * n(it.qty),
            0
          ),
        0
      ),
    [sales, productCostById]
  );
  const netProfit = totalSales - totalCOGS - totalExp;
  const profitPct =
    totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0;
  const lowStock = useMemo(
    () => products.filter((p) => n(p.stock) <= n(p.minStock)),
    [products]
  );
  const pendingPay = useMemo(
    () =>
      payables
        .filter((p) => p.status !== "Paid")
        .reduce((s, p) => s + n(p.balance), 0),
    [payables]
  );
  const pendingRec = useMemo(
    () =>
      receivables
        .filter((r) => r.status !== "Received")
        .reduce((s, r) => s + n(r.balance), 0),
    [receivables]
  );
  const cashBalance = cashLedger.reduce((balance, entry) => {
    const type = String(entry.type || "").toLowerCase();
    const isOut = type.includes("out") || type.includes("exp") || type.includes("debit") || type.includes("paid");
    return balance + (isOut ? -n(entry.amount) : n(entry.amount));
  }, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 16,
        }}
      >
        <StatCard
          label="Total Sales"
          value={fmt(totalSales)}
          sub={`${sales.length} invoices`}
          color={T.green}
          icon="🧾"
        />
        <StatCard
          label="Total Purchases"
          value={fmt(totalPur)}
          sub={`${arrivals.length} arrivals`}
          color={T.accent}
          icon="📦"
        />
        <StatCard
          label="Total Expenses"
          value={fmt(totalExp)}
          sub="All outflows"
          color={T.amber}
          icon="💸"
        />
        <StatCard
          label="Net Profit"
          value={fmt(netProfit)}
          sub={`${profitPct}% margin`}
          color={netProfit >= 0 ? T.green : T.red}
          icon="📈"
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 16,
        }}
      >
        <StatCard
          label="Cash Balance"
          value={fmt(cashBalance)}
          color={T.green}
          icon="💵"
        />
        <StatCard
          label="Payables Due"
          value={fmt(pendingPay)}
          color={T.red}
          icon="⬆️"
        />
        <StatCard
          label="Receivables"
          value={fmt(pendingRec)}
          color={T.purple}
          icon="⬇️"
        />
        <StatCard
          label="Low Stock"
          value={lowStock.length}
          color={T.amber}
          icon="⚠️"
        />
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
      >
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>
            Recent Invoices
          </div>
          {sales.length === 0 ? (
            <div style={{ color: T.muted, textAlign: "center", padding: 30 }}>
              No sales yet
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {[...sales]
                  .map((sale, index) => ({ sale, index }))
                  .sort((a, b) => {
                    const dateCompare = String(b.sale.date || "").localeCompare(String(a.sale.date || ""));
                    if (dateCompare) return dateCompare;
                    const timeCompare = String(b.sale.createdAt || b.sale.created_at || "").localeCompare(String(a.sale.createdAt || a.sale.created_at || ""));
                    return timeCompare || a.index - b.index;
                  })
                  .slice(0, 5)
                  .map(({ sale: s }) => (
                    <tr key={s.id}>
                      <td>
                        <span className="mono" style={{ color: T.accent }}>
                          {s.id}
                        </span>
                      </td>
                      <td>{s.customer}</td>
                      <td style={{ color: T.muted }}>{s.date}</td>
                      <td className="mono" style={{ color: T.green }}>
                        {fmt(s.total)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>
            Low Stock Alert
          </div>
          {lowStock.length === 0 ? (
            <div style={{ color: T.muted, textAlign: "center", padding: 30 }}>
              All stocks adequate ✓
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Min</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.slice(0, LARGE_TABLE_LIMIT).map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="mono" style={{ color: T.red }}>
                      {p.stock}
                    </td>
                    <td className="mono" style={{ color: T.muted }}>
                      {p.minStock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
