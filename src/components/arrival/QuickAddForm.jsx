import React, { useState } from "react";
import { T } from "../../constants/theme";
import { uid, n } from "../../utils/formatters";
import Btn from "../common/Btn";
import Field from "../common/Field";
import Input from "../common/Input";
import NumInput from "../common/NumInput";
import Select from "../common/Select";

export function QuickAddForm({ onSave, onClose }) {
  const [error, setError] = useState("");
  const [form, setForm] = useState({
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
  });

  const save = () => {
    if (!form.name.trim()) return setError("Product name is required");
    if (!form.category.trim()) return setError("Category is required");
    if (!n(form.price)) return setError("Selling price is required");
    setError("");
    const prod = {
      id: "P" + uid(),
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category.trim() || "General",
      unit: form.unit,
      barcode: form.barcode.trim(),
      cost: n(form.cost),
      price: n(form.price),
      stock: n(form.stock),
      minStock: n(form.minStock) || 5,
      gstPct: n(form.gstPct),
      hsn: form.hsn.trim(),
      distributorGST: "",
    };
    onSave(prod);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          background: T.accentDim,
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: 12,
          color: T.accent,
        }}
      >
        ⚡ Product will be added to stock <b>and</b> immediately added to the current cart.
      </div>
      {error && <div style={{ color: T.red, fontSize: 12 }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Product Name *" style={{ gridColumn: "1/-1" }}>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Rice 1kg"
            autoFocus
          />
        </Field>
        <Field label="Brand">
          <Input
            value={form.brand}
            onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            placeholder="e.g. Aashirvaad"
          />
        </Field>
        <Field label="Category *">
          <Input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="e.g. Grains"
          />
        </Field>
        <Field label="Unit">
          <Select
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          >
            {[
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
            ].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </Select>
        </Field>
        <Field label="Barcode">
          <Input
            value={form.barcode}
            onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
            placeholder="Scan or type"
          />
        </Field>
        <Field label="Cost Price ₹">
          <NumInput
            value={form.cost}
            onChange={(v) => setForm((f) => ({ ...f, cost: v }))}
            placeholder="0.00"
          />
        </Field>
        <Field label="Selling Price ₹ *">
          <NumInput
            value={form.price}
            onChange={(v) => setForm((f) => ({ ...f, price: v }))}
            placeholder="0.00"
          />
        </Field>
        <Field label="Stock Qty">
          <NumInput
            value={form.stock}
            onChange={(v) => setForm((f) => ({ ...f, stock: v }))}
            placeholder="0"
          />
        </Field>
        <Field label="GST %">
          <Select
            value={form.gstPct}
            onChange={(e) => setForm((f) => ({ ...f, gstPct: e.target.value }))}
          >
            {["0", "5", "12", "18", "28"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label="HSN Code">
          <Input
            value={form.hsn}
            onChange={(e) => setForm((f) => ({ ...f, hsn: e.target.value }))}
            placeholder="Optional"
          />
        </Field>
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "flex-end",
          borderTop: `1px solid ${T.border}`,
          paddingTop: 12,
        }}
      >
        <Btn variant="secondary" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} size="lg">
          ✓ Add to Stock & Cart
        </Btn>
      </div>
    </div>
  );
}

export default QuickAddForm;
