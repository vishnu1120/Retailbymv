import React, { useState, useMemo } from "react";
import { T } from "../../constants/theme";
import { LARGE_TABLE_LIMIT } from "../../constants/config";
import { fmt, today, uid, n } from "../../utils/formatters";
import Badge from "../common/Badge";
import Btn from "../common/Btn";
import Card from "../common/Card";
import StatCard from "../common/StatCard";
import Modal from "../common/Modal";
import Field from "../common/Field";
import Input from "../common/Input";
import NumInput from "../common/NumInput";
import RecForecast from "./RecForecast";
import PeriodFilter from "../common/PeriodFilter";
import { matchesPeriod } from "../../utils/periodUtils";

export function Accounting({
  payables,
  setPayables,
  setCashLedger,
  receivables,
  setRecievables,
  sales,
  expenses,
  arrivals,
  acctTab,
  setAcctTab,
}) {
  const tab = acctTab;
  const setTab = setAcctTab;
  const [modal, setModal] = useState(null);
  const [payForm, setPayForm] = useState({
    date: today(),
    party: "",
    description: "",
    amount: "",
    dueDate: today(),
  });
  const [recForm, setRecForm] = useState({
    date: today(),
    party: "",
    description: "",
    amount: "",
    dueDate: today(),
  });
  const [period, setPeriod] = useState("all");
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedMonth, setSelectedMonth] = useState(today().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(today().slice(0, 4));
  const periodSelection = {
    date: selectedDate,
    month: selectedMonth,
    year: selectedYear,
  };
  const filteredSales = useMemo(
    () => sales.filter((item) => matchesPeriod(item.date, period, periodSelection)),
    [sales, period, selectedDate, selectedMonth, selectedYear]
  );
  const filteredExpenses = useMemo(
    () => expenses.filter((item) => matchesPeriod(item.date, period, periodSelection)),
    [expenses, period, selectedDate, selectedMonth, selectedYear]
  );
  const filteredArrivals = useMemo(
    () => arrivals.filter((item) => matchesPeriod(item.date, period, periodSelection)),
    [arrivals, period, selectedDate, selectedMonth, selectedYear]
  );
  const filteredPayables = useMemo(
    () => payables.filter((item) => matchesPeriod(item.date, period, periodSelection)),
    [payables, period, selectedDate, selectedMonth, selectedYear]
  );
  const filteredReceivables = useMemo(
    () => receivables.filter((item) => matchesPeriod(item.date, period, periodSelection)),
    [receivables, period, selectedDate, selectedMonth, selectedYear]
  );

  const tS = useMemo(() => filteredSales.reduce((s, i) => s + n(i.total), 0), [filteredSales]);
  const tE = useMemo(
    () => filteredExpenses.reduce((s, i) => s + n(i.amount), 0),
    [filteredExpenses]
  );
  const tP = useMemo(
    () => filteredArrivals.reduce((s, i) => s + n(i.total), 0),
    [filteredArrivals]
  );
  const gross = tS - tP,
    net = gross - tE;
  const gp = tS > 0 ? ((gross / tS) * 100).toFixed(1) : 0,
    np = tS > 0 ? ((net / tS) * 100).toFixed(1) : 0;

  const lb = useMemo(() => {
    const ledger = [
      ...filteredSales.map((s) => ({
        date: s.date,
        desc: `Sale ${s.id} - ${s.customer}`,
        type: "credit",
        amount: n(s.total),
        cat: "Sales",
      })),
      ...filteredExpenses.map((e) => ({
        date: e.date,
        desc: `${e.category}: ${e.description}`,
        type: "debit",
        amount: n(e.amount),
        cat: e.category,
      })),
      ...filteredArrivals.map((a) => ({
        date: a.date,
        desc: `Purchase - ${a.supplier}`,
        type: "debit",
        amount: n(a.total),
        cat: "Purchase",
      })),
    ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    let run = 0;
    return [...ledger]
      .reverse()
      .map((e) => {
        run += e.type === "credit" ? e.amount : -e.amount;
        return { ...e, balance: run };
      })
      .reverse();
  }, [filteredSales, filteredExpenses, filteredArrivals]);

  const visibleLedger = useMemo(() => lb.slice(0, LARGE_TABLE_LIMIT), [lb]);
  const visiblePayables = useMemo(
    () => filteredPayables.slice(0, LARGE_TABLE_LIMIT),
    [filteredPayables]
  );
  const visibleReceivables = useMemo(
    () => filteredReceivables.slice(0, LARGE_TABLE_LIMIT),
    [filteredReceivables]
  );

  const rPay = (id, amt) => {
    const amount = n(amt);
    setPayables((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p;
        const np2 = n(p.paid) + Math.min(amount, n(p.balance));
        const nb = Math.max(0, n(p.amount) - np2);
        return {
          ...p,
          paid: np2,
          balance: nb,
          status: nb <= 0 ? "Paid" : "Partial",
        };
      })
    );
    if (setCashLedger && amount > 0) {
      setCashLedger((entries) => [...entries, {
        id: "CASH" + uid(),
        date: today(),
        description: `Payable payment - ${id}`,
        type: "out",
        amount,
      }]);
    }
  };

  const rRec = (id, amt) => {
    const amount = n(amt);
    setRecievables((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const nr = n(r.received) + Math.min(amount, n(r.balance));
        const nb = Math.max(0, n(r.amount) - nr);
        return {
          ...r,
          received: nr,
          balance: nb,
          status: nb <= 0 ? "Received" : "Partial",
        };
      })
    );
    if (setCashLedger && amount > 0) {
      setCashLedger((entries) => [...entries, {
        id: "CASH" + uid(),
        date: today(),
        description: `Receivable received - ${id}`,
        type: "in",
        amount,
      }]);
    }
  };

  const today_d2 = new Date();
  today_d2.setHours(0, 0, 0, 0);
  const overdueCount = filteredReceivables.filter(
    (r) =>
      r.status !== "Received" &&
      r.balance > 0 &&
      r.dueDate &&
      new Date(r.dueDate).setHours(0, 0, 0, 0) < today_d2
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 18 }}>Accounting</div>
      <Card style={{ padding: "12px 16px" }}>
        <PeriodFilter
          period={period}
          setPeriod={setPeriod}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
        />
      </Card>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 12,
        }}
      >
        <StatCard label="Revenue" value={fmt(tS)} color={T.green} icon="📈" />
        <StatCard label="Purchases" value={fmt(tP)} color={T.accent} icon="📦" />
        <StatCard label="Expenses" value={fmt(tE)} color={T.amber} icon="💸" />
        <StatCard
          label="Gross"
          value={fmt(gross)}
          sub={`${gp}%`}
          color={gross >= 0 ? T.green : T.red}
          icon="💹"
        />
        <StatCard
          label="Net Profit"
          value={fmt(net)}
          sub={`${np}%`}
          color={net >= 0 ? T.green : T.red}
          icon="🏦"
        />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          ["summary", "P&L"],
          ["ledger", "Ledger"],
          ["payables", "Payables"],
          ["receivables", "Receivables"],
          ["forecast", "Forecast"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: "8px 18px",
              borderRadius: 7,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              border: `1px solid ${tab === k ? T.accent : T.border}`,
              background: tab === k ? T.accentDim : T.surface,
              color: tab === k ? T.accent : T.muted,
              position: "relative",
            }}
          >
            {l}
            {k === "forecast" && overdueCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -5,
                  right: -5,
                  background: T.red,
                  color: "#fff",
                  borderRadius: "50%",
                  fontSize: 9,
                  fontWeight: 700,
                  minWidth: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                }}
              >
                {overdueCount}
              </span>
            )}
          </button>
        ))}
      </div>
      {tab === "summary" && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Card>
            <div style={{ fontWeight: 700, marginBottom: 14 }}>
              Profit & Loss Statement
            </div>
            {[
              ["Revenue", tS, T.green, null],
              [
                "Cost of Purchases",
                tP,
                T.red,
                tS > 0 ? ((tP / tS) * 100).toFixed(1) : null,
              ],
              ["Gross Profit", gross, gross >= 0 ? T.green : T.red, gp],
              [
                "Expenses",
                tE,
                T.amber,
                tS > 0 ? ((tE / tS) * 100).toFixed(1) : null,
              ],
              ["Net Profit / Loss", net, net >= 0 ? T.green : T.red, np],
            ].map(([l, v, c, pct], i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: i < 4 ? `1px solid ${T.border}` : "none",
                  fontWeight: i === 4 ? 800 : 400,
                  fontSize: i === 4 ? 15 : 13,
                }}
              >
                <span style={i === 4 ? {} : { color: T.muted }}>{l}</span>
                <div>
                  <span className="mono" style={{ color: c }}>
                    {fmt(Math.abs(v))}
                  </span>
                  {pct !== null && (
                    <span
                      style={{ color: T.muted, fontSize: 11, marginLeft: 6 }}
                    >
                      ({pct}%)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </Card>
          <Card>
            <div style={{ fontWeight: 700, marginBottom: 14 }}>
              Expense Breakdown
            </div>
            {tE === 0 ? (
              <div
                style={{ color: T.muted, textAlign: "center", padding: 30 }}
              >
                No expenses yet.
              </div>
            ) : (
              [
                "Rent",
                "Salary",
                "Electricity",
                "Water",
                "Transport",
                "Miscellaneous",
              ].map((cat) => {
                const amt = filteredExpenses
                  .filter((e) => e.category === cat)
                  .reduce((s, e) => s + e.amount, 0);
                if (!amt) return null;
                const pct = ((amt / tE) * 100).toFixed(1);
                return (
                  <div key={cat} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                        fontSize: 12,
                      }}
                    >
                      <span>{cat}</span>
                      <span className="mono" style={{ color: T.amber }}>
                        {fmt(amt)}{" "}
                        <span style={{ color: T.muted }}>({pct}%)</span>
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        background: T.surface,
                        borderRadius: 99,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: T.amber,
                          borderRadius: 99,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>
      )}
      {tab === "ledger" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {lb.length === 0 ? (
            <div style={{ color: T.muted, textAlign: "center", padding: 40 }}>
              No transactions yet.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {visibleLedger.map((e, i) => (
                  <tr key={i}>
                    <td>{e.date}</td>
                    <td style={{ maxWidth: 240 }}>{e.desc}</td>
                    <td>
                      <Badge color="blue">{e.cat}</Badge>
                    </td>
                    <td className="mono" style={{ color: T.red }}>
                      {e.type === "debit" ? fmt(e.amount) : "—"}
                    </td>
                    <td className="mono" style={{ color: T.green }}>
                      {e.type === "credit" ? fmt(e.amount) : "—"}
                    </td>
                    <td
                      className="mono"
                      style={{ color: e.balance >= 0 ? T.green : T.red }}
                    >
                      {fmt(e.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
      {tab === "payables" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn onClick={() => setModal("payable")}>+ Add Payable</Btn>
          </div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {payables.length === 0 ? (
              <div style={{ color: T.muted, textAlign: "center", padding: 40 }}>
                No payables.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Party</th>
                    <th>Amount</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePayables.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span
                          className="mono"
                          style={{ color: T.muted, fontSize: 10 }}
                        >
                          {p.id}
                        </span>
                      </td>
                      <td>{p.date}</td>
                      <td style={{ fontWeight: 600 }}>{p.party}</td>
                      <td className="mono">{fmt(p.amount)}</td>
                      <td className="mono" style={{ color: T.green }}>
                        {fmt(p.paid)}
                      </td>
                      <td className="mono" style={{ color: T.red }}>
                        {fmt(p.balance)}
                      </td>
                      <td>{p.dueDate}</td>
                      <td>
                        <Badge
                          color={
                            p.status === "Paid"
                              ? "green"
                              : p.status === "Partial"
                              ? "amber"
                              : "red"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td>
                        {p.balance > 0 && (
                          <Btn
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const a = p.balance;
                              rPay(p.id, a);
                            }}
                          >
                            Pay
                          </Btn>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
      {tab === "receivables" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn onClick={() => setModal("receivable")}>+ Add Receivable</Btn>
          </div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {receivables.length === 0 ? (
              <div style={{ color: T.muted, textAlign: "center", padding: 40 }}>
                No receivables.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Party</th>
                    <th>Amount</th>
                    <th>Received</th>
                    <th>Balance</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReceivables.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span
                          className="mono"
                          style={{ color: T.muted, fontSize: 10 }}
                        >
                          {r.id}
                        </span>
                      </td>
                      <td>{r.date}</td>
                      <td style={{ fontWeight: 600 }}>{r.party}</td>
                      <td className="mono">{fmt(r.amount)}</td>
                      <td className="mono" style={{ color: T.green }}>
                        {fmt(r.received)}
                      </td>
                      <td className="mono" style={{ color: T.purple }}>
                        {fmt(r.balance)}
                      </td>
                      <td>{r.dueDate}</td>
                      <td>
                        <Badge
                          color={
                            r.status === "Received"
                              ? "green"
                              : r.status === "Partial"
                              ? "amber"
                              : "red"
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td>
                        {r.balance > 0 && (
                          <Btn
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const a = r.balance;
                              rRec(r.id, a);
                            }}
                          >
                            Receive
                          </Btn>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
      {tab === "forecast" && (
        <RecForecast receivables={filteredReceivables} sales={filteredSales} />
      )}
      {modal === "payable" && (
        <Modal title="Add Payable" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="Date">
                <Input
                  type="date"
                  value={payForm.date}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </Field>
              <Field label="Party">
                <Input
                  value={payForm.party}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, party: e.target.value }))
                  }
                />
              </Field>
              <Field label="Description" style={{ gridColumn: "1/-1" }}>
                <Input
                  value={payForm.description}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </Field>
              <Field label="Amount">
                <NumInput
                  value={payForm.amount}
                  onChange={(v) => setPayForm((f) => ({ ...f, amount: v }))}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Due Date">
                <Input
                  type="date"
                  value={payForm.dueDate}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                />
              </Field>
            </div>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <Btn variant="secondary" onClick={() => setModal(null)}>
                Cancel
              </Btn>
              <Btn
                onClick={() => {
                  const amt = n(payForm.amount);
                  setPayables((p) => [
                    {
                      id: "PAY" + uid(),
                      ...payForm,
                      amount: amt,
                      paid: 0,
                      balance: amt,
                      status: "Pending",
                    },
                    ...p,
                  ]);
                  setModal(null);
                }}
              >
                Save
              </Btn>
            </div>
          </div>
        </Modal>
      )}
      {modal === "receivable" && (
        <Modal title="Add Receivable" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="Date">
                <Input
                  type="date"
                  value={recForm.date}
                  onChange={(e) =>
                    setRecForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </Field>
              <Field label="Party">
                <Input
                  value={recForm.party}
                  onChange={(e) =>
                    setRecForm((f) => ({ ...f, party: e.target.value }))
                  }
                />
              </Field>
              <Field label="Description" style={{ gridColumn: "1/-1" }}>
                <Input
                  value={recForm.description}
                  onChange={(e) =>
                    setRecForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </Field>
              <Field label="Amount">
                <NumInput
                  value={recForm.amount}
                  onChange={(v) => setRecForm((f) => ({ ...f, amount: v }))}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Due Date">
                <Input
                  type="date"
                  value={recForm.dueDate}
                  onChange={(e) =>
                    setRecForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                />
              </Field>
            </div>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <Btn variant="secondary" onClick={() => setModal(null)}>
                Cancel
              </Btn>
              <Btn
                onClick={() => {
                  const amt = n(recForm.amount);
                  setRecievables((r) => [
                    {
                      id: "REC" + uid(),
                      ...recForm,
                      amount: amt,
                      received: 0,
                      balance: amt,
                      status: "Pending",
                    },
                    ...r,
                  ]);
                  setModal(null);
                }}
              >
                Save
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Accounting;
