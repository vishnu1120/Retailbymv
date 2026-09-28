import React, { useRef, useEffect } from "react";
import { T } from "../../constants/theme";
import { uid, n } from "../../utils/formatters";
import ProductSearch from "./ProductSearch";

export const ARR_COL = [
  { key: "productId", label: "Product Name", width: 190, type: "product" },
  { key: "ncode", label: "Item Code", width: 80, type: "text" },
  { key: "mfr", label: "MFR", width: 70, type: "text" },
  { key: "barcode", label: "Barcode", width: 100, type: "text" },
  { key: "mrp", label: "MRP ₹", width: 80, type: "number" },
  { key: "qty", label: "Qty", width: 60, type: "number" },
  { key: "free", label: "Free", width: 55, type: "number" },
  { key: "batch", label: "Batch No", width: 90, type: "text" },
  { key: "expiry", label: "Expiry", width: 100, type: "date" },
  { key: "rate", label: "Rate ₹", width: 80, type: "number" },
  {
    key: "pdType",
    label: "PD Type",
    width: 70,
    type: "select",
    opts: ["percent", "amount"],
  },
  { key: "pd", label: "PD", width: 60, type: "number" },
  {
    key: "gstPct",
    label: "GST %",
    width: 60,
    type: "select",
    opts: ["0", "5", "12", "18", "28"],
  },
  { key: "amount", label: "Amount ₹", width: 90, type: "calc" },
];

export const EMPTY_ARR_ROW = () => ({
  _id: uid(),
  productId: "",
  ncode: "",
  mfr: "",
  barcode: "",
  mrp: "",
  qty: "1",
  free: "0",
  batch: "",
  expiry: "",
  rate: "",
  pdType: "percent",
  pd: "0",
  gstPct: "5",
  amount: "",
});

export const arrivalLineTotal = (row) => {
  const qty = parseFloat(row.qty) || 0;
  const rate = parseFloat(row.rate) || 0;
  const pd = parseFloat(row.pd) || 0;
  const gstPct = parseFloat(row.gstPct) || 0;
  const gross = qty * rate;
  const discount = row.pdType === "amount" ? pd : gross * (pd / 100);
  const taxable = Math.max(0, gross - discount);
  return taxable * (1 + gstPct / 100);
};

export const arrivalUnitCost = (row) => {
  const qty = parseFloat(row.qty) || 0;
  const rate = parseFloat(row.rate) || 0;
  const pd = parseFloat(row.pd) || 0;
  const gross = qty * rate;
  const discount = row.pdType === "amount" ? pd : gross * (pd / 100);
  return qty > 0 ? Math.max(0, gross - discount) / qty : 0;
};

export const arrivalSubtotal = (rows) =>
  (rows || [])
    .filter((r) => r.productId && parseFloat(r.qty) > 0)
    .reduce((s, r) => s + arrivalLineTotal(r), 0);

export const arrivalDiscountAmount = (subtotal, discountType, discount) => {
  const value = Math.max(0, n(discount));
  const raw =
    discountType === "percent" ? (subtotal * Math.min(value, 100)) / 100 : value;
  return Math.min(subtotal, raw);
};

export const arrivalGrandTotal = (
  rows,
  discountType,
  discount,
  roundOffMode = "none"
) => {
  const subtotal = arrivalSubtotal(rows);
  const baseTotal = Number(
    (subtotal - arrivalDiscountAmount(subtotal, discountType, discount)).toFixed(2)
  );
  if (roundOffMode !== "nearestRupee") return baseTotal;
  return Math.round(baseTotal);
};

export const arrivalRoundOffAmount = (
  rows,
  discountType,
  discount,
  roundOffMode = "none"
) => {
  const baseTotal = arrivalGrandTotal(rows, discountType, discount, "none");
  const total = arrivalGrandTotal(rows, discountType, discount, roundOffMode);
  return Number((total - baseTotal).toFixed(2));
};

export function ArrivalGrid({ rows, setRows, products }) {
  const refs = useRef({});
  const rowLen = useRef(rows.length);

  useEffect(() => {
    rowLen.current = rows.length;
  }, [rows.length]);

  const setCell = (ri, key, val) =>
    setRows((r) => r.map((row, i) => (i === ri ? { ...row, [key]: val } : row)));

  const handleProductChange = (ri, pid) => {
    const p = products.find((p) => String(p.id) === String(pid));

    setRows((r) =>
      r.map((row, i) =>
        i === ri
          ? {
              ...row,
              productId: pid,
              barcode: p?.barcode || row.barcode,
              mrp: p ? String(p.price) : row.mrp,
              rate: p ? String(p.cost) : row.rate,
              gstPct: p ? String(p.gstPct || 0) : row.gstPct,
              ncode: p?.id || row.ncode,
              mfr: p?.brand || row.mfr,
            }
          : row
      )
    );
  };

  const focusCell = (ri, ci) =>
    setTimeout(() => refs.current[`${ri}-${ci}`]?.focus(), 40);

  const addRowAndFocus = (ri, ci) => {
    setRows((r) => {
      setTimeout(() => refs.current[`${ri + 1}-${ci}`]?.focus(), 50);
      return [...r, EMPTY_ARR_ROW()];
    });
  };

  const handleKey = (e, ri, ci) => {
    const len = rowLen.current;
    const cols = ARR_COL.length;
    if (e.key === "Tab") {
      e.preventDefault();
      const nc = e.shiftKey ? ci - 1 : ci + 1;
      if (nc >= 0 && nc < cols) focusCell(ri, nc);
      else if (!e.shiftKey && nc === cols) {
        if (ri === len - 1) addRowAndFocus(ri, 0);
        else focusCell(ri + 1, 0);
      } else if (e.shiftKey && nc < 0 && ri > 0) focusCell(ri - 1, cols - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      let nc = ci + 1;
      while (nc < cols && ARR_COL[nc]?.type === "calc") nc++;
      if (nc < cols) {
        focusCell(ri, nc);
      } else {
        if (ri === len - 1) addRowAndFocus(ri, 0);
        else focusCell(ri + 1, 0);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (ri === len - 1) addRowAndFocus(ri, ci);
      else focusCell(ri + 1, ci);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (ri > 0) focusCell(ri - 1, ci);
    }
  };

  const removeRow = (ri) => setRows((r) => r.filter((_, i) => i !== ri));
  const addRow = () => {
    setRows((r) => [...r, EMPTY_ARR_ROW()]);
    setTimeout(() => refs.current[`${rowLen.current}-0`]?.focus(), 50);
  };

  const isValid = (row) => row.productId && parseFloat(row.qty) > 0;
  const validCount = rows.filter(isValid).length;
  const grandTotal = rows
    .filter(isValid)
    .reduce((s, r) => s + arrivalLineTotal(r), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          gap: 12,
          fontSize: 11,
          flexWrap: "wrap",
          alignItems: "center",
          color: T.muted,
        }}
      >
        {[
          ["Tab", "→"],
          ["Enter", "↓"],
          ["↑↓", "move"],
        ].map(([k, v]) => (
          <span key={k} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span
              style={{
                background: T.subtle,
                color: T.text,
                borderRadius: 4,
                padding: "1px 6px",
                fontFamily: "monospace",
                fontSize: 10,
                fontWeight: 700,
                border: `1px solid ${T.border}`,
              }}
            >
              {k}
            </span>
            <span style={{ color: T.muted }}>{v}</span>
          </span>
        ))}
      </div>
      <div className="sg-outer">
        <div className="sg-scroll">
          <table className="sg-table">
            <thead>
              <tr>
                <th className="sg-th" style={{ width: 32, textAlign: "center" }}>
                  #
                </th>
                {ARR_COL.map((c) => (
                  <th
                    key={c.key}
                    className={`sg-th${c.type === "number" ? " sg-th-num" : ""}`}
                    style={{ width: c.width, minWidth: c.width }}
                  >
                    {c.label}
                  </th>
                ))}
                <th
                  className="sg-th"
                  style={{ width: 60, textAlign: "right", paddingRight: 10 }}
                >
                  Line Total
                </th>
                <th className="sg-th" style={{ width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const lineTotal = arrivalLineTotal(row);
                return (
                  <tr key={row._id} className="sg-row">
                    <td className="sg-rn">{ri + 1}</td>
                    {ARR_COL.map((col, ci) => (
                      <td
                        key={col.key}
                        className={
                          col.type === "number" ? "sg-cell-num" : "sg-cell"
                        }
                      >
                        {col.type === "product" ? (
                          <ProductSearch
                            ref={(el) => (refs.current[`${ri}-${ci}`] = el)}
                            products={products}
                            value={row.productId}
                            onChange={(pid) => handleProductChange(ri, pid)}
                            onKeyDown={(e) => handleKey(e, ri, ci)}
                          />
                        ) : col.type === "calc" ? (
                          <div
                            className="sg-input-num"
                            style={{
                              padding: "3px 7px",
                              height: 27,
                              lineHeight: "21px",
                              color: lineTotal > 0 ? "#166534" : "#94a3b8",
                              fontWeight: lineTotal > 0 ? 600 : 400,
                              userSelect: "none",
                            }}
                          >
                            {lineTotal > 0
                              ? `₹${lineTotal.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : "—"}
                          </div>
                        ) : col.type === "select" ? (
                          <select
                            ref={(el) => (refs.current[`${ri}-${ci}`] = el)}
                            className="sg-select"
                            value={row[col.key]}
                            onChange={(e) => setCell(ri, col.key, e.target.value)}
                            onKeyDown={(e) => handleKey(e, ri, ci)}
                          >
                            {col.opts.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        ) : col.type === "date" ? (
                          <input
                            ref={(el) => (refs.current[`${ri}-${ci}`] = el)}
                            data-arrival-expiry="true"
                            className="sg-input"
                            type="date"
                            value={row[col.key]}
                            onChange={(e) => setCell(ri, col.key, e.target.value)}
                            onKeyDown={(e) => handleKey(e, ri, ci)}
                            style={{ fontSize: 12 }}
                          />
                        ) : col.type === "number" ? (
                          <input
                            ref={(el) => (refs.current[`${ri}-${ci}`] = el)}
                            className="sg-input-num"
                            type="text"
                            inputMode="decimal"
                            value={row[col.key]}
                            placeholder="0"
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v !== "" && !/^-?\d*\.?\d*$/.test(v)) return;
                              setCell(ri, col.key, v);
                            }}
                            onKeyDown={(e) => handleKey(e, ri, ci)}
                          />
                        ) : (
                          <input
                            ref={(el) => (refs.current[`${ri}-${ci}`] = el)}
                            className="sg-input"
                            type="text"
                            value={row[col.key]}
                            placeholder={
                              col.key === "batch"
                                ? "e.g. B2024"
                                : col.key === "ncode"
                                ? "Code"
                                : col.key === "mfr"
                                ? "Brand"
                                : ""
                            }
                            onChange={(e) => setCell(ri, col.key, e.target.value)}
                            onKeyDown={(e) => handleKey(e, ri, ci)}
                          />
                        )}
                      </td>
                    ))}
                    <td
                      className="sg-cell-num"
                      style={{
                        paddingRight: 8,
                        fontSize: 12,
                        fontFamily: "'JetBrains Mono',monospace",
                        color: lineTotal > 0 ? "#166534" : "#94a3b8",
                        fontWeight: lineTotal > 0 ? 600 : 400,
                      }}
                    >
                      {lineTotal > 0
                        ? `₹${lineTotal.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "—"}
                    </td>
                    <td className="sg-del-cell">
                      <button
                        className="sg-del-btn"
                        onClick={() => removeRow(ri)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="sg-footer">
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={addRow}
              style={{
                background: "#eff6ff",
                border: "1px solid #93c5fd",
                color: "#1d4ed8",
                borderRadius: 5,
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add Row
            </button>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              <b style={{ color: validCount > 0 ? "#16a34a" : "#6b7280" }}>
                {validCount}
              </b>{" "}
              / {rows.length} rows filled
            </span>
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 13,
              fontWeight: 700,
              color: "#166534",
            }}
          >
            Total: ₹
            {grandTotal.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArrivalGrid;
