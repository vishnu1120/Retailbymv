import React, { useState, useMemo } from "react";
import { T } from "../../constants/theme";
import { LARGE_TABLE_LIMIT } from "../../constants/config";
import { fmt, today, uid, n, lower } from "../../utils/formatters";
import Badge from "../common/Badge";
import Btn from "../common/Btn";
import Card from "../common/Card";
import StatCard from "../common/StatCard";
import Modal from "../common/Modal";
import Field from "../common/Field";
import Input from "../common/Input";
import NumInput from "../common/NumInput";
import Select from "../common/Select";
import PeriodFilter from "../common/PeriodFilter";
import { matchesPeriod } from "../../utils/periodUtils";

export function TableCash({
  cashLedger,
  setCashLedger,
  cashForm: propCashForm,
  setCashForm: propSetCashForm,
  cashModal: propCashModal,
  setCashModal: propSetCashModal,
}) {
  const [localModal, setLocalModal] = useState(false);
  const [localForm, setLocalForm] = useState({
    date: today(),
    type: "out",
    description: "",
    amount: "",
  });
  const [filterType, setFilterType] = useState("all"); // "all" | "in" | "out"
  const [searchDesc, setSearchDesc] = useState("");
  const [period, setPeriod] = useState("all");
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedMonth, setSelectedMonth] = useState(today().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(today().slice(0, 4));

  const modal = propCashModal !== undefined ? propCashModal : localModal;
  const setModal = propSetCashModal || setLocalModal;
  const form = propCashForm || localForm;
  const setForm = propSetCashForm || setLocalForm;

  // Process running balance & identify Cash Out robustly
  const processedLedger = useMemo(() => {
    let runningBalance = 0;
    return cashLedger.map((c) => {
      const typeStr = lower(c.type || "");
      const isOut = typeStr.includes("out") || typeStr.includes("exp") || typeStr.includes("debit") || typeStr.includes("paid");
      const amt = n(c.amount);
      runningBalance += isOut ? -amt : amt;
      return {
        ...c,
        isOut,
        balance: runningBalance,
      };
    });
  }, [cashLedger]);

  const periodLedger = useMemo(
    () =>
      processedLedger.filter((c) =>
        matchesPeriod(c.date, period, {
          date: selectedDate,
          month: selectedMonth,
          year: selectedYear,
        })
      ),
    [processedLedger, period, selectedDate, selectedMonth, selectedYear]
  );

  const currentBalance = periodLedger.length
    ? periodLedger[periodLedger.length - 1].balance
    : 0;

  const totalIn = useMemo(
    () => periodLedger.filter((c) => !c.isOut).reduce((s, c) => s + c.amount, 0),
    [periodLedger]
  );

  const totalOut = useMemo(
    () => periodLedger.filter((c) => c.isOut).reduce((s, c) => s + c.amount, 0),
    [periodLedger]
  );

  const filteredLedger = useMemo(() => {
    const q = lower(searchDesc);
    return periodLedger
      .filter((c) => {
        const matchQ = !q || lower(c.description).includes(q) || lower(c.date).includes(q);
        const matchT =
          filterType === "all" ||
          (filterType === "out" && c.isOut) ||
          (filterType === "in" && !c.isOut);
        return matchQ && matchT;
      })
      .reverse();
  }, [periodLedger, searchDesc, filterType]);

  const visibleCashLedger = useMemo(
    () => filteredLedger.slice(0, LARGE_TABLE_LIMIT),
    [filteredLedger]
  );

  const save = () => {
    if (!form.description || !n(form.amount)) return alert("Please fill all fields.");
    const amt = n(form.amount);
    const typeStr = lower(form.type || "in");
    const isOut = typeStr.includes("out");

    setCashLedger((cl) => [
      ...cl,
      {
        id: "CASH" + uid(),
        date: form.date || today(),
        description: form.description.trim(),
        type: isOut ? "out" : "in",
        amount: amt,
      },
    ]);

    setModal(false);
    setForm({ date: today(), type: "in", description: "", amount: "" });
  };

  const deleteEntry = (id) => {
    if (window.confirm("Delete this cash entry?")) {
      setCashLedger((cl) => cl.filter((c) => c.id !== id));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
          <div style={{ fontWeight: 800, fontSize: 20, color: T.text }}>Table Cash Ledger</div>
          <div style={{ fontSize: 12, color: T.muted }}>
            Track daily cash in & cash out transactions
          </div>
        </div>
        <Btn onClick={() => setModal(true)}>+ Add Cash Entry</Btn>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Current Cash Balance"
          value={fmt(currentBalance)}
          color={currentBalance >= 0 ? T.green : T.red}
          icon="💵"
        />
        <StatCard
          label="Total Cash In"
          value={fmt(totalIn)}
          color={T.green}
          icon="⬇️"
        />
        <StatCard
          label="Total Cash Out"
          value={fmt(totalOut)}
          color={T.red}
          icon="⬆️"
        />
      </div>

      {/* Search & Filter Bar */}
      <Card style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
        <Input
          placeholder="🔍 Search cash entry description or date…"
          value={searchDesc}
          onChange={(e) => setSearchDesc(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>Filter:</span>
          {[
            ["all", "All Entries"],
            ["in", "⬇️ Cash In"],
            ["out", "⬆️ Cash Out"],
          ].map(([fk, fl]) => (
            <button
              key={fk}
              onClick={() => setFilterType(fk)}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                border: `1px solid ${filterType === fk ? T.accent : T.border}`,
                background: filterType === fk ? T.accentDim : "transparent",
                color: filterType === fk ? T.accent : T.muted,
              }}
            >
              {fl}
            </button>
          ))}
        </div>
      </Card>

      {/* Ledger Table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {visibleCashLedger.length === 0 ? (
          <div style={{ color: T.muted, textAlign: "center", padding: 40 }}>
            No cash entries found.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Running Balance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleCashLedger.map((c) => (
                <tr key={c.id}>
                  <td>{c.date}</td>
                  <td style={{ fontWeight: 600 }}>{c.description}</td>
                  <td>
                    <Badge color={c.isOut ? "red" : "green"}>
                      {c.isOut ? "Cash Out ⬆️" : "Cash In ⬇️"}
                    </Badge>
                  </td>
                  <td
                    className="mono"
                    style={{ color: c.isOut ? T.red : T.green, fontWeight: 700 }}
                  >
                    {c.isOut ? "−" : "+"}
                    {fmt(c.amount)}
                  </td>
                  <td className="mono" style={{ fontWeight: 800, color: T.text }}>
                    {fmt(c.balance)}
                  </td>
                  <td>
                    <Btn size="sm" variant="ghost" onClick={() => deleteEntry(c.id)}>
                      🗑️
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Add Modal */}
      {modal && (
        <Modal title="Add Cash Entry" onClose={() => setModal(false)} width={460}>
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
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </Field>
              <Field label="Entry Type">
                <Select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                >
                  <option value="in">⬇️ Cash In (Income / Receipt)</option>
                  <option value="out">⬆️ Cash Out (Expense / Payout)</option>
                </Select>
              </Field>
              <Field label="Description" style={{ gridColumn: "1/-1" }}>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="e.g. Petty cash expense, Vendor payout, Cash deposit"
                />
              </Field>
              <Field label="Amount (₹)" style={{ gridColumn: "1/-1" }}>
                <NumInput
                  value={form.amount}
                  onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
                  placeholder="0.00"
                />
              </Field>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" onClick={() => setModal(false)}>
                Cancel
              </Btn>
              <Btn onClick={save}>Save Cash Entry</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default TableCash;
