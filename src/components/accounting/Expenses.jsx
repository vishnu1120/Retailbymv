import React, { useState, useMemo } from "react";
import { T } from "../../constants/theme";
import { LARGE_TABLE_LIMIT } from "../../constants/config";
import { fmt, today, uid, n } from "../../utils/formatters";
import Badge from "../common/Badge";
import Btn from "../common/Btn";
import Card from "../common/Card";
import Modal from "../common/Modal";
import Field from "../common/Field";
import Input from "../common/Input";
import NumInput from "../common/NumInput";
import Select from "../common/Select";
import PeriodFilter from "../common/PeriodFilter";
import { matchesPeriod } from "../../utils/periodUtils";

export function Expenses({
  expenses,
  setExpenses,
  setCashLedger,
  expForm: propExpForm,
  setExpForm: propSetExpForm,
  expModal: propExpModal,
  setExpModal: propSetExpModal,
}) {
  const [localModal, setLocalModal] = useState(false);
  const [localForm, setLocalForm] = useState({
    date: today(),
    category: "Rent",
    description: "",
    amount: "",
    paidTo: "",
    mode: "Cash",
  });

  const modal = propExpModal !== undefined ? propExpModal : localModal;
  const setModal = propSetExpModal || setLocalModal;
  const form = propExpForm || localForm;
  const setForm = propSetExpForm || setLocalForm;
  const [period, setPeriod] = useState("all");
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedMonth, setSelectedMonth] = useState(today().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(today().slice(0, 4));
  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) =>
        matchesPeriod(expense.date, period, {
          date: selectedDate,
          month: selectedMonth,
          year: selectedYear,
        })
      ),
    [expenses, period, selectedDate, selectedMonth, selectedYear]
  );
  const visibleExpenses = useMemo(
    () => filteredExpenses.slice(0, LARGE_TABLE_LIMIT),
    [filteredExpenses]
  );
  const cats = [
    "Rent",
    "Salary",
    "Electricity",
    "Water",
    "Internet",
    "Maintenance",
    "Transport",
    "Packaging",
    "Miscellaneous",
  ];

  const save = () => {
    if (!form.description || !n(form.amount) || !form.paidTo)
      return alert("Fill all fields");
    const amt = n(form.amount);
    const expObj = { id: "EXP" + uid(), ...form, amount: amt };
    setExpenses((e) => [
      expObj,
      ...e,
    ]);
    if (setCashLedger && String(form.mode || "Cash").toLowerCase().includes("cash")) {
      setCashLedger((cl) => [
        ...cl,
        {
          id: "CASH" + uid(),
          date: form.date || today(),
          description: `Expense (${form.category}): ${form.description} — ${form.paidTo}`,
          type: "out",
          amount: amt,
        },
      ]);
    }
    setModal(false);
    setForm({
      date: today(),
      category: "Rent",
      description: "",
      amount: "",
      paidTo: "",
      mode: "Cash",
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18 }}>Expenses & Bills</div>
        <Btn onClick={() => setModal(true)}>+ Add Expense</Btn>
      </div>
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
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {filteredExpenses.length === 0 ? (
          <div style={{ color: T.muted, textAlign: "center", padding: 40 }}>
            No expenses yet.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Paid To</th>
                <th>Mode</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {visibleExpenses.map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>
                    <Badge color="blue">{e.category}</Badge>
                  </td>
                  <td>{e.description}</td>
                  <td>{e.paidTo}</td>
                  <td>
                    <Badge color="blue">{e.mode}</Badge>
                  </td>
                  <td className="mono" style={{ color: T.red }}>
                    −{fmt(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {modal && (
        <Modal title="Add Expense" onClose={() => setModal(false)}>
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
              <Field label="Category">
                <Select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                >
                  {cats.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Description" style={{ gridColumn: "1/-1" }}>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="e.g. Shop Rent - April"
                />
              </Field>
              <Field label="Amount (₹)">
                <NumInput
                  value={form.amount}
                  onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Payment Mode">
                <Select
                  value={form.mode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mode: e.target.value }))
                  }
                >
                  {["Cash", "UPI", "Card", "Bank Transfer", "Cheque"].map(
                    (m) => (
                      <option key={m}>{m}</option>
                    )
                  )}
                </Select>
              </Field>
              <Field label="Paid To" style={{ gridColumn: "1/-1" }}>
                <Input
                  value={form.paidTo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paidTo: e.target.value }))
                  }
                  placeholder="Recipient name"
                />
              </Field>
            </div>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <Btn variant="secondary" onClick={() => setModal(false)}>
                Cancel
              </Btn>
              <Btn onClick={save}>Save</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Expenses;
