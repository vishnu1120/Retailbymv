import React, { useEffect, useRef, useState } from "react";
import { T } from "../../constants/theme";
import { fmt, today, uid } from "../../utils/formatters";
import Badge from "../common/Badge";
import Btn from "../common/Btn";
import Card from "../common/Card";
import Modal from "../common/Modal";
import Field from "../common/Field";
import Input from "../common/Input";
import NumInput from "../common/NumInput";

export function Distributors({
  distributors,
  setDistributors,
  arrivals,
  setArrivals,
  payables,
  setPayables,
  setCashLedger,
  setPage,
  setAcctTab,
  distForm: propDistForm,
  setDistForm: propSetDistForm,
}) {
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [localForm, setLocalForm] = useState({
    name: "",
    gstin: "",
    phone: "",
    address: "",
    email: "",
  });
  const defaultForm = { name: "", gstin: "", phone: "", address: "", email: "" };
  const form = propDistForm || localForm || defaultForm;
  const setForm = propSetDistForm || setLocalForm;
  const [view, setView] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payAmt, setPayAmt] = useState("");
  const [arrivalPayModal, setArrivalPayModal] = useState(null);
  const [arrivalPayAmt, setArrivalPayAmt] = useState("");
  const [discountType, setDiscountType] = useState("amount");
  const [discount, setDiscount] = useState("");
  const [formError, setFormError] = useState("");
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (!modal) return;

    // Electron can occasionally leave focus on the page behind a newly opened
    // modal. Retry once after the modal is painted so typing works immediately.
    const focusNameInput = () => {
      const input = nameInputRef.current;
      if (!input) return;
      input.focus();
      input.select();
    };
    const timer = window.setTimeout(focusNameInput, 0);
    return () => window.clearTimeout(timer);
  }, [modal, edit]);

  const openNew = () => {
    setEdit(null);
    setFormError("");
    setForm({ name: "", gstin: "", phone: "", address: "", email: "" });
    setModal(true);
  };
  const openEdit = (d) => {
    setEdit(d);
    setFormError("");
    setForm({
      name: d.name,
      gstin: d.gstin,
      phone: d.phone,
      address: d.address,
      email: d.email,
    });
    setModal(true);
  };

  const save = () => {
    const cleanForm = {
      name: String(form.name || "").trim(),
      gstin: String(form.gstin || "").trim(),
      phone: String(form.phone || "").trim(),
      address: String(form.address || "").trim(),
      email: String(form.email || "").trim(),
    };
    if (!cleanForm.name) return setFormError("Distributor name is required.");
    setFormError("");
    if (edit)
      setDistributors((ds) =>
        ds.map((d) => (d.id === edit.id ? { ...d, ...cleanForm } : d))
      );
    else
      setDistributors((ds) => [
        ...ds,
        { id: "DIST" + uid(), ...cleanForm, addedOn: today() },
      ]);
    setForm(defaultForm);
    setModal(false);
  };

  const del = (id) => {
    if (window.confirm("Delete this distributor?"))
      setDistributors((ds) => ds.filter((d) => d.id !== id));
  };

  const getArrivals = (dist) =>
    arrivals.filter(
      (a) =>
        a.distributorId === dist.id ||
        (a.supplier || "").trim().toLowerCase() ===
          (dist.name || "").trim().toLowerCase() ||
        (a.distributorGST &&
          dist.gstin &&
          a.distributorGST.trim() === dist.gstin.trim())
    );

  const getPayables = (dist) =>
    (payables || []).filter(
      (p) =>
        p.distributorId === dist.id ||
        (p.party || "").trim().toLowerCase() ===
          (dist.name || "").trim().toLowerCase()
    );

  const getOutstandingBalance = (dist) =>
    getPayables(dist)
      .filter((p) => p.status !== "Paid")
      .reduce((s, p) => s + Number(p.balance || 0), 0);

  const handleRecordPayment = () => {
    const amt = parseFloat(payAmt);
    if (!amt || amt <= 0) return alert("Please enter a valid payment amount");
    const dist = payModal;
    const prevBal = getOutstandingBalance(dist);
    if (amt > prevBal + 0.01) {
      return alert(`Payment amount (${fmt(amt)}) cannot exceed the outstanding balance (${fmt(prevBal)})`);
    }
    let remaining = amt;

    setPayables((ps) =>
      ps.map((p) => {
        if (remaining <= 0) return p;
        const matchesDist =
          p.distributorId === dist.id ||
          (p.party || "").trim().toLowerCase() ===
            (dist.name || "").trim().toLowerCase();
        if (!matchesDist || p.status === "Paid") return p;
        const pay = Math.min(remaining, Number(p.balance) || 0);
        remaining -= pay;
        const newPaid = Number(p.paid) + pay;
        const newBal = Math.max(0, Number(p.amount) - newPaid);
        return {
          ...p,
          paid: newPaid,
          balance: newBal,
          status: newBal <= 0 ? "Paid" : "Partial",
        };
      })
    );

    if (setCashLedger && amt > 0) {
      setCashLedger((entries) => [...entries, {
        id: "CASH" + uid(),
        date: today(),
        description: `Distributor payment - ${dist.name}`,
        type: "out",
        amount: amt,
      }]);
    }

    const newBal = Math.max(0, prevBal - amt);
    setPayModal(null);
    setPayAmt("");
    alert(
      `✅ Payment recorded for ${dist.name}!\n\n• Previous Balance: ${fmt(
        prevBal
      )}\n• Amount Paid: ${fmt(amt)}\n• New Remaining Balance: ${fmt(newBal)}`
    );
  };

  const handleRecordArrivalPayment = () => {
    const arr = arrivalPayModal;
    if (!arr) return;
    const amt = parseFloat(arrivalPayAmt);
    if (!amt || amt <= 0) return alert("Please enter a valid payment amount");

    const prevPaid = parseFloat(arr.paid) || 0;
    const prevBal = arr.balance !== undefined ? parseFloat(arr.balance) : Math.max(0, parseFloat(arr.total || 0) - prevPaid);
    if (amt > prevBal + 0.01) {
      return alert(`Payment amount (${fmt(amt)}) cannot exceed remaining arrival balance (${fmt(prevBal)})`);
    }

    const newPaid = prevPaid + amt;
    const newBal = Math.max(0, parseFloat(arr.total || 0) - newPaid);
    const newStatus = newBal <= 0 ? "Paid" : "Partial";

    if (setArrivals) {
      setArrivals((arrs) =>
        arrs.map((a) =>
          a.id === arr.id
            ? {
                ...a,
                paid: newPaid,
                balance: newBal,
                status: newStatus,
              }
            : a
        )
      );
    }

    setPayables((ps) => {
      let remAmt = amt;
      return ps.map((p) => {
        if (remAmt <= 0) return p;
        const matchesArr =
          p.arrivalId === arr.id ||
          (p.description && p.description.includes(arr.id)) ||
          (p.invoiceNo && arr.invoiceNo && p.invoiceNo === arr.invoiceNo);
        if (!matchesArr || p.status === "Paid") return p;
        const pay = Math.min(remAmt, Number(p.balance) || 0);
        remAmt -= pay;
        const pPaid = (Number(p.paid) || 0) + pay;
        const pBal = Math.max(0, (Number(p.amount) || 0) - pPaid);
        return {
          ...p,
          paid: pPaid,
          balance: pBal,
          status: pBal <= 0 ? "Paid" : "Partial",
        };
      });
    });

    if (setCashLedger) {
      setCashLedger((entries) => [...entries, {
        id: "CASH" + uid(),
        date: today(),
        description: `Arrival payment - ${arr.supplier || arr.id}`,
        type: "out",
        amount: amt,
      }]);
    }

    setArrivalPayModal(null);
    setArrivalPayAmt("");
    alert(
      `✅ Recorded payment of ${fmt(amt)} for Arrival Bill ${arr.id}!\n\n• Previous Arrival Due: ${fmt(
        prevBal
      )}\n• Amount Paid Now: ${fmt(amt)}\n• New Remaining Due: ${fmt(newBal)}`
    );
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
        <div style={{ fontWeight: 700, fontSize: 18 }}>
          Distributor Directory
        </div>
        <Btn onClick={openNew}>+ Add Distributor</Btn>
      </div>

      {distributors.length === 0 ? (
        <Card>
          <div style={{ color: T.muted, textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🏭</div>
            <div>
              No distributors yet. Add your suppliers here to track all their
              arrivals.
            </div>
          </div>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
            gap: 14,
          }}
        >
          {distributors.map((d) => {
            const distArrivals = getArrivals(d);
            const distPayables = getPayables(d);
            const totalBilled =
              distArrivals.reduce((sum, a) => sum + (parseFloat(a.total) || 0), 0) ||
              distPayables.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            const totalPaid =
              distArrivals.reduce((sum, a) => sum + (parseFloat(a.paid) || 0), 0) ||
              distPayables.reduce((sum, p) => sum + (parseFloat(p.paid) || 0), 0);
            const currentBalance = getOutstandingBalance(d);
            const pendingCount = distPayables.filter(
              (p) => p.status !== "Paid"
            ).length;

            return (
              <Card
                key={d.id}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {d.name}
                    </div>
                    {d.gstin && (
                      <div
                        style={{
                          fontSize: 11,
                          color: T.accent,
                          marginTop: 2,
                          fontFamily: "monospace",
                        }}
                      >
                        GSTIN: {d.gstin}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn size="sm" variant="ghost" onClick={() => openEdit(d)}>
                      Edit
                    </Btn>
                    <Btn size="sm" variant="danger" onClick={() => del(d.id)}>
                      ✕
                    </Btn>
                  </div>
                </div>
                {d.phone && (
                  <div style={{ fontSize: 12, color: T.muted }}>
                    📞 {d.phone}
                  </div>
                )}
                {d.address && (
                  <div style={{ fontSize: 12, color: T.muted }}>
                    📍 {d.address}
                  </div>
                )}
                {d.email && (
                  <div style={{ fontSize: 12, color: T.muted }}>
                    ✉️ {d.email}
                  </div>
                )}

                {/* Balance Summary Box */}
                <div
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: T.muted }}>Previous Balance (Billed):</span>
                    <span className="mono" style={{ fontWeight: 700, color: T.text }}>
                      {fmt(totalBilled)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: T.muted }}>Total Amount Paid:</span>
                    <span className="mono" style={{ fontWeight: 700, color: T.green }}>
                      {fmt(totalPaid)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: `1px dashed ${T.border}`,
                      paddingTop: 6,
                      marginTop: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: currentBalance > 0 ? T.red : T.green,
                      }}
                    >
                      Current Balance Due:
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: currentBalance > 0 ? T.red : T.green,
                      }}
                    >
                      {fmt(currentBalance)}
                    </span>
                  </div>
                </div>

                {currentBalance > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: T.muted }}>
                      {pendingCount} pending payable{pendingCount !== 1 ? "s" : ""}
                    </span>
                    <Btn
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setPayModal(d);
                        setPayAmt(currentBalance.toFixed(2));
                      }}
                    >
                      💳 Record Payment
                    </Btn>
                  </div>
                )}
                {currentBalance === 0 && distPayables.length > 0 && (
                  <div
                    style={{
                      background: T.greenDim,
                      border: `1px solid ${T.green}44`,
                      borderRadius: 8,
                      padding: "6px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        color: T.green,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      ✓ All paid up
                    </span>
                  </div>
                )}

                <div
                  style={{
                    borderTop: `1px solid ${T.border}`,
                    paddingTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: T.muted }}>
                      Arrivals:{" "}
                      <b style={{ color: T.text }}>
                        {getArrivals(d).length}
                      </b>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: T.green,
                        fontWeight: 700,
                        fontFamily: "monospace",
                      }}
                    >
                      {fmt(
                        getArrivals(d).reduce((s, a) => s + a.total, 0)
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {getArrivals(d).length > 0 && (
                      <Btn
                        size="sm"
                        variant="secondary"
                        onClick={() => setView(d)}
                      >
                        View Arrivals
                      </Btn>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal
          title={edit ? "Edit Distributor" : "Add Distributor"}
          onClose={() => setModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="Discount" style={{ gridColumn: "1/-1" }}>
                <div
                  style={{ display: "flex", gap: 6, alignItems: "center" }}
                >
                  <button
                    onClick={() => {
                      setDiscountType("amount");
                      setDiscount("");
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 7,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: `1.5px solid ${
                        discountType === "amount" ? T.accent : T.border
                      }`,
                      background:
                        discountType === "amount" ? T.accentDim : T.surface,
                      color: discountType === "amount" ? T.accent : T.muted,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    ₹ Amount
                  </button>
                  <button
                    onClick={() => {
                      setDiscountType("percent");
                      setDiscount("");
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 7,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: `1.5px solid ${
                        discountType === "percent" ? T.accent : T.border
                      }`,
                      background:
                        discountType === "percent" ? T.accentDim : T.surface,
                      color: discountType === "percent" ? T.accent : T.muted,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    % Percent
                  </button>
                  <NumInput
                    value={discount}
                    onChange={setDiscount}
                    placeholder={
                      discountType === "percent" ? "0-100" : fmt(0).replace("₹", "")
                    }
                    style={{ flex: 1 }}
                  />
                  <span
                    style={{
                      color: T.muted,
                      fontSize: 13,
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {discountType === "percent" ? "%" : "₹"}
                  </span>
                </div>
              </Field>
              <Field label="Name">
                <Input
                  ref={nameInputRef}
                  autoFocus
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Distributor name"
                />
              </Field>
              <Field label="GSTIN">
                <Input
                  value={form.gstin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, gstin: e.target.value }))
                  }
                  placeholder="e.g. 33AABCD1234E1Z5"
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="Contact number"
                />
              </Field>
              <Field label="Address" style={{ gridColumn: "1/-1" }}>
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="Business address"
                />
              </Field>
              <Field label="Email" style={{ gridColumn: "1/-1" }}>
                <Input
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="Email address (optional)"
                />
              </Field>
            </div>
            {formError && <div style={{ color: T.red, fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setModal(false)}>
                Cancel
              </Btn>
              <Btn onClick={save}>{edit ? "Update" : "Save Distributor"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {view && (
        <Modal
          title={`Arrivals — ${view.name}`}
          onClose={() => setView(null)}
          width={760}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 10,
              }}
            >
              <Card style={{ padding: 12 }}>
                <div
                  style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}
                >
                  GSTIN
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 13,
                    color: T.accent,
                  }}
                >
                  {view.gstin || "—"}
                </div>
              </Card>
              <Card style={{ padding: 12 }}>
                <div
                  style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}
                >
                  TOTAL ARRIVALS
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 18, fontWeight: 800, color: T.accent }}
                >
                  {getArrivals(view).length}
                </div>
              </Card>
              <Card style={{ padding: 12 }}>
                <div
                  style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}
                >
                  TOTAL PURCHASED
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 18, fontWeight: 800, color: T.green }}
                >
                  {fmt(
                    getArrivals(view).reduce((s, a) => s + a.total, 0)
                  )}
                </div>
              </Card>
            </div>

            {getPayables(view).length > 0 && (
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                }}
              >
                <div
                  style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}
                >
                  Payables for {view.name}
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Payable ID</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPayables(view).map((p) => (
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
                        <td
                          style={{
                            fontSize: 12,
                            color: T.muted,
                            maxWidth: 200,
                          }}
                        >
                          {p.description}
                        </td>
                        <td className="mono">{fmt(p.amount)}</td>
                        <td className="mono" style={{ color: T.green }}>
                          {fmt(p.paid)}
                        </td>
                        <td
                          className="mono"
                          style={{ color: T.red, fontWeight: 600 }}
                        >
                          {fmt(p.balance)}
                        </td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getOutstandingBalance(view) > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        color: T.red,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        fontSize: 14,
                      }}
                    >
                      Due: {fmt(getOutstandingBalance(view))}
                    </span>
                    <Btn
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setView(null);
                        setPayModal(view);
                        setPayAmt(getOutstandingBalance(view).toFixed(2));
                      }}
                    >
                      💳 Record Payment
                    </Btn>
                  </div>
                )}
              </div>
            )}
            {getArrivals(view).length === 0 ? (
              <div
                style={{ color: T.muted, textAlign: "center", padding: 30 }}
              >
                No arrivals linked to this distributor yet.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Arrival ID</th>
                    <th>Date</th>
                    <th>Invoice No</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Remaining Due</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getArrivals(view).map((a) => {
                    const paidAmt = parseFloat(a.paid) || 0;
                    const dueAmt =
                      a.balance !== undefined
                        ? parseFloat(a.balance)
                        : Math.max(0, parseFloat(a.total || 0) - paidAmt);
                    const isFullyPaid = dueAmt <= 0;

                    return (
                      <tr key={a.id}>
                        <td>
                          <span
                            className="mono"
                            style={{ color: T.accent, fontSize: 11, fontWeight: 700 }}
                          >
                            {a.id}
                          </span>
                        </td>
                        <td>{a.date}</td>
                        <td
                          className="mono"
                          style={{ fontSize: 11, color: T.muted }}
                        >
                          {a.invoiceNo || "—"}
                        </td>
                        <td>{a.items?.length || 0} items</td>
                        <td className="mono" style={{ color: T.text, fontWeight: 600 }}>
                          {fmt(a.total)}
                        </td>
                        <td className="mono" style={{ color: T.green }}>
                          {fmt(paidAmt)}
                        </td>
                        <td
                          className="mono"
                          style={{ color: dueAmt > 0 ? T.red : T.muted, fontWeight: 700 }}
                        >
                          {fmt(dueAmt)}
                        </td>
                        <td>
                          <Badge color={isFullyPaid ? "green" : paidAmt > 0 ? "amber" : "red"}>
                            {isFullyPaid ? "Paid" : paidAmt > 0 ? "Partial" : "Pending"}
                          </Badge>
                        </td>
                        <td>
                          {dueAmt > 0 ? (
                            <Btn
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setArrivalPayModal(a);
                                setArrivalPayAmt(dueAmt.toFixed(2));
                              }}
                            >
                              💳 Pay Arrival
                            </Btn>
                          ) : (
                            <span style={{ color: T.green, fontSize: 12, fontWeight: 600 }}>
                              ✓ Paid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}

      {payModal && (
        <Modal
          title={`Record Payment — ${payModal.name}`}
          onClose={() => {
            setPayModal(null);
            setPayAmt("");
          }}
          width={540}
        >
          {(() => {
            const prevBal = getOutstandingBalance(payModal);
            const currentPaid = parseFloat(payAmt) || 0;
            const remBal = Math.max(0, prevBal - currentPaid);
            const pendingPayables = getPayables(payModal).filter(
              (p) => p.status !== "Paid"
            );

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* 3-Stage Financial Breakdown Card */}
                <div
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: T.text,
                      borderBottom: `1px dashed ${T.border}`,
                      paddingBottom: 6,
                    }}
                  >
                    📊 Payment Balance Calculation Summary
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, color: T.muted }}>
                      1. Previous Outstanding Balance
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: 15, fontWeight: 700, color: T.red }}
                    >
                      {fmt(prevBal)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, color: T.muted }}>
                      2. Current Amount Paid Now
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: 15, fontWeight: 700, color: T.green }}
                    >
                      − {fmt(currentPaid)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: `1px dashed ${T.border}`,
                      paddingTop: 8,
                    }}
                  >
                    <span
                      style={{ fontSize: 13, fontWeight: 700, color: T.text }}
                    >
                      3. Current Remaining Balance
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: remBal === 0 ? T.green : T.red,
                      }}
                    >
                      {fmt(remBal)}
                    </span>
                  </div>
                </div>

                {/* Quick Payment Preset Buttons */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>
                    Quick Amount:
                  </span>
                  <Btn
                    size="sm"
                    variant="ghost"
                    onClick={() => setPayAmt(prevBal.toFixed(2))}
                  >
                    Full ({fmt(prevBal)})
                  </Btn>
                  {prevBal > 0 && (
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={() => setPayAmt((prevBal / 2).toFixed(2))}
                    >
                      50% ({fmt(prevBal / 2)})
                    </Btn>
                  )}
                </div>

                {/* Input Fields Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <Field label="Previous Balance">
                    <Input
                      value={fmt(prevBal)}
                      readOnly
                      style={{
                        background: T.surface,
                        color: T.red,
                        fontWeight: 700,
                      }}
                    />
                  </Field>

                  <Field label="Current Amount Paid (₹)">
                    <NumInput
                      value={payAmt}
                      onChange={setPayAmt}
                      placeholder="0.00"
                      autoFocus
                    />
                  </Field>
                </div>

                <Field label="Current Remaining Balance">
                  <Input
                    value={fmt(remBal)}
                    readOnly
                    style={{
                      background: T.surface,
                      color: remBal === 0 ? T.green : T.red,
                      fontWeight: 800,
                    }}
                  />
                </Field>

                {/* Pending Payables List */}
                {pendingPayables.length > 0 && (
                  <div
                    style={{
                      background: T.surface,
                      borderRadius: 8,
                      padding: "10px 14px",
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        color: T.text,
                        marginBottom: 6,
                      }}
                    >
                      Pending Invoices ({pendingPayables.length})
                    </div>
                    {pendingPayables.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "4px 0",
                          borderBottom: `1px solid ${T.border}`,
                          fontSize: 12,
                        }}
                      >
                        <span
                          className="truncate-text"
                          style={{ color: T.muted, maxWidth: 260 }}
                        >
                          {p.description}
                        </span>
                        <span
                          className="mono"
                          style={{ color: T.red, fontWeight: 600 }}
                        >
                          {fmt(p.balance)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                  }}
                >
                  <Btn
                    variant="secondary"
                    onClick={() => {
                      setPayModal(null);
                      setPayAmt("");
                    }}
                  >
                    Cancel
                  </Btn>
                  <Btn variant="danger" onClick={handleRecordPayment}>
                    ✓ Confirm Payment
                  </Btn>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {arrivalPayModal && (
        <Modal
          title={`Pay Individual Arrival — ${arrivalPayModal.id}`}
          onClose={() => {
            setArrivalPayModal(null);
            setArrivalPayAmt("");
          }}
          width={520}
        >
          {(() => {
            const arr = arrivalPayModal;
            const prevPaid = parseFloat(arr.paid) || 0;
            const prevBal =
              arr.balance !== undefined
                ? parseFloat(arr.balance)
                : Math.max(0, parseFloat(arr.total || 0) - prevPaid);
            const currentPaid = parseFloat(arrivalPayAmt) || 0;
            const remBal = Math.max(0, prevBal - currentPaid);

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Header Information Box */}
                <div
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ color: T.muted }}>Arrival ID: </span>
                    <b className="mono" style={{ color: T.accent }}>
                      {arr.id}
                    </b>
                  </div>
                  <div>
                    <span style={{ color: T.muted }}>Invoice No: </span>
                    <b>{arr.invoiceNo || "—"}</b>
                  </div>
                  <div>
                    <span style={{ color: T.muted }}>Date: </span>
                    <span>{arr.date}</span>
                  </div>
                </div>

                {/* 3-Stage Financial Calculation Card */}
                <div
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: T.text,
                      borderBottom: `1px dashed ${T.border}`,
                      paddingBottom: 6,
                    }}
                  >
                    📊 Individual Arrival Payment Calculation
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, color: T.muted }}>
                      1. Arrival Total Amount:
                    </span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
                      {fmt(arr.total)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, color: T.muted }}>
                      2. Previous Arrival Balance Due:
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: 15, fontWeight: 700, color: T.red }}
                    >
                      {fmt(prevBal)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, color: T.muted }}>
                      3. Current Custom Amount Paid Now:
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: 15, fontWeight: 700, color: T.green }}
                    >
                      − {fmt(currentPaid)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: `1px dashed ${T.border}`,
                      paddingTop: 8,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                      4. New Remaining Arrival Balance:
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: remBal === 0 ? T.green : T.red,
                      }}
                    >
                      {fmt(remBal)}
                    </span>
                  </div>
                </div>

                {/* Quick Payment Preset Buttons */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>
                    Quick Payment:
                  </span>
                  <Btn
                    size="sm"
                    variant="ghost"
                    onClick={() => setArrivalPayAmt(prevBal.toFixed(2))}
                  >
                    Full Due ({fmt(prevBal)})
                  </Btn>
                  {prevBal > 0 && (
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={() => setArrivalPayAmt((prevBal / 2).toFixed(2))}
                    >
                      50% ({fmt(prevBal / 2)})
                    </Btn>
                  )}
                </div>

                {/* Input Fields */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <Field label="Previous Arrival Balance">
                    <Input
                      value={fmt(prevBal)}
                      readOnly
                      style={{
                        background: T.surface,
                        color: T.red,
                        fontWeight: 700,
                      }}
                    />
                  </Field>

                  <Field label="Custom Payment Amount (₹)">
                    <NumInput
                      value={arrivalPayAmt}
                      onChange={setArrivalPayAmt}
                      placeholder="0.00"
                      autoFocus
                    />
                  </Field>
                </div>

                <Field label="New Remaining Arrival Balance">
                  <Input
                    value={fmt(remBal)}
                    readOnly
                    style={{
                      background: T.surface,
                      color: remBal === 0 ? T.green : T.red,
                      fontWeight: 800,
                    }}
                  />
                </Field>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                  }}
                >
                  <Btn
                    variant="secondary"
                    onClick={() => {
                      setArrivalPayModal(null);
                      setArrivalPayAmt("");
                    }}
                  >
                    Cancel
                  </Btn>
                  <Btn variant="danger" onClick={handleRecordArrivalPayment}>
                    ✓ Confirm Arrival Payment
                  </Btn>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}

export default Distributors;
