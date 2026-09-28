import React, { useRef, useEffect } from "react";
import { T } from "../../constants/theme";
import { uid } from "../../utils/formatters";

export const EMPTY_ROW = () => ({
  _id: uid(),
  name: "",
  brand: "",
  category: "",
  unit: "Piece",
  barcode: "",
  cost: "",
  price: "",
  stock: "",
  minStock: "5",
  gstPct: "0",
  hsn: "",
  distributorGST: "",
});

export const UNITS = [
  "Piece",
  "Bag",
  "Pack",
  "Bottle",
  "Box",
  "Kg",
  "Litre",
  "Dozen",
  "Set",
  "Roll",
];

export const GST_RATES = ["0", "5", "12", "18", "28"];

export const COL_DEF = [
  { key: "name", label: "Product Name", width: 160, type: "text" },
  { key: "brand", label: "Brand", width: 110, type: "text" },
  { key: "category", label: "Category", width: 110, type: "text" },
  { key: "unit", label: "Unit", width: 80, type: "select", opts: UNITS },
  { key: "barcode", label: "Barcode", width: 110, type: "text" },
  { key: "cost", label: "Cost ₹", width: 80, type: "number" },
  { key: "price", label: "Price ₹", width: 80, type: "number" },
  { key: "stock", label: "Stock", width: 70, type: "number" },
  { key: "minStock", label: "Min Stock", width: 80, type: "number" },
  { key: "gstPct", label: "GST %", width: 70, type: "select", opts: GST_RATES },
  { key: "hsn", label: "HSN Code", width: 90, type: "text" },
  { key: "distributorGST", label: "Dist. GSTIN", width: 150, type: "text" },
];

export function SpreadsheetGrid({ rows, setRows, onSave }) {
  const refs = useRef({});
  const rowLen = useRef(rows.length);

  useEffect(() => {
    rowLen.current = rows.length;
  }, [rows.length]);

  const setCell = (idx, key, val) =>
    setRows((r) =>
      r.map((row, i) => (i === idx ? { ...row, [key]: val } : row))
    );

  const focusCell = (ri, ci) =>
    setTimeout(() => refs.current[`${ri}-${ci}`]?.focus(), 40);

  const addRowAndFocus = (afterIdx, ci) => {
    setRows((r) => {
      const next = [...r, EMPTY_ROW()];
      setTimeout(() => refs.current[`${afterIdx + 1}-${ci}`]?.focus(), 40);
      return next;
    });
  };

  const handleKey = (e, rowIdx, colIdx) => {
    const len = rowLen.current;
    if (e.key === "Tab") {
      e.preventDefault();
      const nextCol = e.shiftKey ? colIdx - 1 : colIdx + 1;
      if (nextCol >= 0 && nextCol < COL_DEF.length) {
        focusCell(rowIdx, nextCol);
      } else if (!e.shiftKey && nextCol === COL_DEF.length) {
        if (rowIdx === len - 1) addRowAndFocus(rowIdx, 0);
        else focusCell(rowIdx + 1, 0);
      } else if (e.shiftKey && nextCol < 0 && rowIdx > 0) {
        focusCell(rowIdx - 1, COL_DEF.length - 1);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const nextCol = colIdx + 1;
      if (nextCol < COL_DEF.length) {
        focusCell(rowIdx, nextCol);
      } else {
        if (rowIdx === len - 1) addRowAndFocus(rowIdx, 0);
        else focusCell(rowIdx + 1, 0);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (rowIdx === len - 1) addRowAndFocus(rowIdx, colIdx);
      else focusCell(rowIdx + 1, colIdx);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (rowIdx > 0) focusCell(rowIdx - 1, colIdx);
    }
  };

  const removeRow = (idx) => setRows((r) => r.filter((_, i) => i !== idx));
  const addRow = () => {
    setRows((r) => [...r, EMPTY_ROW()]);
    setTimeout(() => refs.current[`${rowLen.current}-0`]?.focus(), 50);
  };

  const isRowValid = (row) =>
    row.name && row.name.trim().length > 0;

  const validCount = rows.filter(isRowValid).length;

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
          ["Tab", "→ cell"],
          ["Enter", "↓ row"],
          ["↑↓", "move"],
          ["Shift+Tab", "← cell"],
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
            <span style={{ color: T.muted, fontSize: 11 }}>{v}</span>
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
                {COL_DEF.map((c) => (
                  <th
                    key={c.key}
                    className={`sg-th${c.type === "number" ? " sg-th-num" : ""}`}
                    style={{ width: c.width, minWidth: c.width }}
                  >
                    {c.label}
                  </th>
                ))}
                <th className="sg-th" style={{ width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={row._id} className="sg-row">
                  <td className="sg-rn">{ri + 1}</td>
                  {COL_DEF.map((col, ci) => (
                    <td
                      key={col.key}
                      className={
                        col.type === "number" ? "sg-cell-num" : "sg-cell"
                      }
                    >
                      {col.type === "select" ? (
                        <select
                          ref={(el) => (refs.current[`${ri}-${ci}`] = el)}
                          className="sg-select"
                          value={row[col.key]}
                          onChange={(e) => setCell(ri, col.key, e.target.value)}
                          onKeyDown={(e) => handleKey(e, ri, ci)}
                        >
                          {col.key === "pdType" ? (
                            <>
                              <option value="percent">%</option>
                              <option value="amount">Amount</option>
                            </>
                          ) : (
                            col.opts.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))
                          )}
                        </select>
                      ) : (
                        <input
                          ref={(el) => (refs.current[`${ri}-${ci}`] = el)}
                          className={
                            col.type === "number" ? "sg-input-num" : "sg-input"
                          }
                          type={col.type === "number" ? "number" : "text"}
                          value={row[col.key]}
                          min={col.type === "number" ? 0 : undefined}
                          placeholder={
                            col.key === "name"
                              ? "Product name"
                              : col.key === "category"
                              ? "Category"
                              : col.key === "cost"
                              ? "0.00"
                              : col.key === "price"
                              ? "0.00"
                              : col.key === "stock"
                              ? "0"
                              : col.key === "minStock"
                              ? "5"
                              : ""
                          }
                          onChange={(e) => setCell(ri, col.key, e.target.value)}
                          onKeyDown={(e) => handleKey(e, ri, ci)}
                        />
                      )}
                    </td>
                  ))}
                  <td className="sg-del-cell">
                    <button
                      className="sg-del-btn"
                      onClick={() => removeRow(ri)}
                      title="Remove row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
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
              / {rows.length} rows ready
            </span>
          </div>
          <button
            onClick={() => onSave(rows.filter(isRowValid))}
            disabled={validCount === 0}
            style={{
              background: validCount > 0 ? "#2563eb" : "#94a3b8",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "6px 20px",
              fontSize: 13,
              fontWeight: 700,
              cursor: validCount > 0 ? "pointer" : "not-allowed",
              minWidth: 160,
            }}
          >
            ✓ Save {validCount} Product{validCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SpreadsheetGrid;
