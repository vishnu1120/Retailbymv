import React, { useState, useRef, useMemo, useDeferredValue, useEffect } from "react";
import { T } from "../../constants/theme";
import { LARGE_TABLE_LIMIT } from "../../constants/config";
import { fmt, uid, lower, n, matchProductSearch } from "../../utils/formatters";
import { parseExcelFile, exportToExcel, findRowValue } from "../../utils/excelUtils";
import Badge from "../common/Badge";
import Btn from "../common/Btn";
import Card from "../common/Card";
import Modal from "../common/Modal";
import Field from "../common/Field";
import Input from "../common/Input";
import NumInput from "../common/NumInput";
import Select from "../common/Select";
import SpreadsheetGrid, { EMPTY_ROW, UNITS, GST_RATES } from "./SpreadsheetGrid";

export function StockManagement({
  products,
  setProducts,
  stockTab: propStockTab,
  setStockTab: propSetStockTab,
  gridRows: propGridRows,
  setGridRows: propSetGridRows,
}) {
  const [localStockTab, setLocalStockTab] = useState("list");
  const [localGridRows, setLocalGridRows] = useState([EMPTY_ROW()]);
  const stockTab = propStockTab !== undefined ? propStockTab : localStockTab;
  const setStockTab = propSetStockTab || setLocalStockTab;
  const gridRows = propGridRows !== undefined ? propGridRows : localGridRows;
  const setGridRows = propSetGridRows || setLocalGridRows;

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fileRef = useRef(null);
  const xlsxRef = useRef(null);
  const editStockRef = useRef(null);

  const searchableProducts = useMemo(
    () =>
      products.map((p) => ({
        product: p,
        text: [p.name, p.category, p.brand, p.barcode, p.id].map(lower).join(" "),
      })),
    [products]
  );
  const filtered = useMemo(() => {
    if (!deferredSearch) return products;
    return products.filter((p) => matchProductSearch(p, deferredSearch));
  }, [products, deferredSearch]);

  const visibleProducts = useMemo(
    () => filtered.slice(0, LARGE_TABLE_LIMIT),
    [filtered]
  );

  const handleGridSave = (validRows) => {
    if (!validRows.length)
      return alert(
        "No valid rows to save. Fill at least Name, Category and Price."
      );
    const newProds = validRows.map((r) => ({
      id: "P" + uid(),
      name: r.name.trim(),
      brand: r.brand?.trim() || "",
      category: r.category.trim() || "General",
      unit: r.unit || "Piece",
      barcode: r.barcode || "",
      cost: parseFloat(r.cost) || 0,
      price: parseFloat(r.price) || 0,
      stock: parseInt(r.stock) || 0,
      minStock: parseInt(r.minStock) || 5,
      gstPct: parseFloat(r.gstPct) || 0,
      hsn: r.hsn || "",
      distributorGST: r.distributorGST || "",
    }));
    setProducts((ps) => [...ps, ...newProds]);
    setGridRows([EMPTY_ROW()]);
    setStockTab("list");
    alert(`✅ ${newProds.length} product${newProds.length > 1 ? "s" : ""} added!`);
  };

  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const getProductKey = (product) => {
    if (product.barcode && String(product.barcode).trim()) {
      return `barcode:${String(product.barcode).trim()}`;
    }
    return `name:${normalize(product.name)}|unit:${normalize(product.unit)}`;
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseExcelFile(file);
      const imp = rows
        .map((row) => {
          const findVal = (...keys) => findRowValue(row, ...keys);
          return {
            id: "P" + uid(),
            name: findVal("name", "productname", "itemname"),
            brand: findVal("brand", "company") || "",
            category: findVal("category", "cat") || "General",
            unit: findVal("unit", "uom") || "Piece",
            barcode: findVal("barcode", "code", "upc") || "",
            cost: parseFloat(findVal("cost", "purchaseprice", "buyingprice")) || 0,
            price: parseFloat(findVal("price", "mrp", "sellingprice")) || 0,
            stock: parseInt(findVal("stock", "qty", "quantity")) || 0,
            minStock: parseInt(findVal("minstock", "reorderlevel")) || 5,
            gstPct: parseFloat(findVal("gstpct", "gst", "tax")) || 0,
            hsn: findVal("hsn", "hsncode") || "",
            distributorGST: findVal("distributorgst", "suppliergst") || "",
          };
        })
        .filter((r) => r.name);

      if (!imp.length)
        return alert(
          "No valid product rows found in file. Please check column headers: Name, Category, Price, Stock."
        );

      setProducts((ps) => {
        const updated = [...ps];
        const productMap = new Map();
        updated.forEach((product) => {
          productMap.set(getProductKey(product), product);
        });

        const processedKeys = new Set();
        imp.forEach((newProd) => {
          const key = getProductKey(newProd);
          if (processedKeys.has(key)) return;
          processedKeys.add(key);
          const existing = productMap.get(key);

          if (existing) {
            existing.stock = Number(existing.stock || 0) + Number(newProd.stock || 0);
            if (newProd.brand) existing.brand = newProd.brand;
            if (newProd.category) existing.category = newProd.category;
            if (newProd.unit) existing.unit = newProd.unit;
            if (newProd.barcode) existing.barcode = newProd.barcode;
            if (newProd.cost) existing.cost = Number(newProd.cost);
            if (newProd.price) existing.price = Number(newProd.price);
            if (newProd.gstPct) existing.gstPct = Number(newProd.gstPct);
            if (newProd.hsn) existing.hsn = newProd.hsn;
            if (newProd.minStock) existing.minStock = Number(newProd.minStock);
          } else {
            updated.push(newProd);
            productMap.set(key, newProd);
          }
        });
        return [...updated];
      });

      alert(`✅ Successfully imported ${imp.length} product(s) from Excel (.xlsx)!`);
    } catch (err) {
      console.error(err);
      alert("Error reading Excel file. Ensure file is a valid .xlsx or .xls file.");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const openEdit = (p) => {
    setEditForm({
      ...p,
      cost: String(p.cost ?? ""),
      price: String(p.price ?? ""),
      stock: String(p.stock ?? ""),
      minStock: String(p.minStock ?? ""),
      gstPct: String(p.gstPct ?? 0),
    });
    setEditModal(p.id);
  };

  useEffect(() => {
    if (!editModal) return;
    const focusTimer = setTimeout(() => {
      editStockRef.current?.focus?.();
      editStockRef.current?.select?.();
    }, 0);
    return () => clearTimeout(focusTimer);
  }, [editModal]);

  const saveEdit = () => {
    if (!String(editForm.name || "").trim()) return alert("Product name is required.");
    const nextStock = n(editForm.stock);
    if (nextStock < 0) return alert("Stock cannot be negative.");
    setProducts((ps) =>
      ps.map((p) =>
        p.id === editModal
          ? {
              ...p,
              ...editForm,
              name: String(editForm.name || "").trim(),
              brand: (editForm.brand || "").trim(),
              cost: n(editForm.cost),
              price: n(editForm.price),
              stock: nextStock,
              minStock: n(editForm.minStock),
              gstPct: n(editForm.gstPct),
            }
          : p
      )
    );
    setEditModal(null);
  };
  const del = (id) => {
    if (window.confirm("Delete this product?"))
      setProducts((ps) => ps.filter((p) => p.id !== id));
  };

  const downloadTemplate = () => {
    const sampleProduct = [
      {
        name: "Paracetamol 500mg",
        brand: "Apex Pharma",
        category: "Medicine",
        unit: "Box",
        barcode: "8901234567890",
        cost: 120,
        price: 150,
        stock: 50,
        minStock: 10,
        gstPct: 12,
        hsn: "3004",
        distributorGST: "33ABCDE1234F1Z5",
      },
    ];
    exportToExcel("Products_Import_Template.xlsx", "Products", sampleProduct);
  };

  const exportStockExcel = () => {
    const data = products.map((p) => ({
      "Product Name": p.name || "",
      Brand: p.brand || "",
      Category: p.category || "",
      Unit: p.unit || "",
      Barcode: p.barcode || "",
      "Cost ₹": p.cost || 0,
      "Price ₹": p.price || 0,
      Stock: p.stock || 0,
      "Min Stock": p.minStock || 0,
      "GST %": p.gstPct || 0,
      "HSN Code": p.hsn || "",
      "Distributor GSTIN": p.distributorGST || "",
    }));
    exportToExcel("WERP_Stock_Report.xlsx", "Stock Report", data);
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
        <div style={{ fontWeight: 700, fontSize: 18 }}>Stock Management</div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {stockTab === "list" && (
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200 }}
            />
          )}
          <Btn variant="ghost" size="sm" onClick={downloadTemplate}>
            ⬇ Excel Template
          </Btn>
          <Btn
            variant="secondary"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            📥 Upload Excel (.xlsx)
          </Btn>
          <Btn
            variant="secondary"
            size="sm"
            onClick={exportStockExcel}
          >
            📊 Export Excel
          </Btn>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            onChange={handleExcelUpload}
          />
          {stockTab === "list" ? (
            <Btn onClick={() => setStockTab("grid")}>+ Add Products</Btn>
          ) : (
            <Btn variant="secondary" onClick={() => setStockTab("list")}>
              ← Back to List
            </Btn>
          )}
        </div>
      </div>

      {stockTab === "grid" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                Add Products — Line by Line
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                Required: <b style={{ color: T.text }}>Product Name, Category, Price.</b>{" "}
                One product per row.
              </div>
            </div>
            <Btn
              variant="secondary"
              size="sm"
              onClick={() => setStockTab("list")}
            >
              ← Back to List
            </Btn>
          </div>
          <SpreadsheetGrid
            rows={gridRows}
            setRows={setGridRows}
            onSave={handleGridSave}
          />
        </div>
      )}

      {stockTab === "list" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {products.length === 0 ? (
            <div style={{ color: T.muted, textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
              <div>No products yet.</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                Click <b>+ Add Products</b> to enter them in spreadsheet style,
                or import Excel (.xlsx).
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product</th>
                    <th>Brand</th>
                    <th>Barcode</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Cost</th>
                    <th>Price</th>
                    <th>GST%</th>
                    <th>HSN</th>
                    <th>Stock</th>
                    <th>Min</th>
                    <th>Margin</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((p) => {
                    const mg =
                      p.cost > 0
                        ? (((p.price - p.cost) / p.cost) * 100).toFixed(1)
                        : "—";
                    const st =
                      p.stock === 0
                        ? "red"
                        : p.stock <= p.minStock
                        ? "amber"
                        : "green";
                    return (
                      <tr key={p.id}>
                        <td>
                          <span
                            className="mono"
                            style={{ color: T.muted, fontSize: 10 }}
                          >
                            {p.id}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td>{p.brand || "-"}</td>
                        <td>{p.barcode || "-"}</td>
                        <td>{p.category}</td>
                        <td>{p.unit}</td>
                        <td className="mono">{fmt(p.cost)}</td>
                        <td className="mono">{fmt(p.price)}</td>
                        <td className="mono" style={{ color: T.amber }}>
                          {p.gstPct || 0}%
                        </td>
                        <td
                          className="mono"
                          style={{ fontSize: 11, color: T.muted }}
                        >
                          {p.hsn || "—"}
                        </td>
                        <td
                          className="mono"
                          style={{
                            color:
                              st === "red"
                                ? T.red
                                : st === "amber"
                                ? T.amber
                                : T.text,
                          }}
                        >
                          {p.stock}
                        </td>
                        <td className="mono" style={{ color: T.muted }}>
                          {p.minStock}
                        </td>
                        <td className="mono" style={{ color: T.green }}>
                          {mg}%
                        </td>
                        <td>
                          <Badge color={st}>
                            {st === "red" ? "Out" : st === "amber" ? "Low" : "OK"}
                          </Badge>
                        </td>
                        <td style={{ display: "flex", gap: 4 }}>
                          <Btn
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(p)}
                          >
                            Edit
                          </Btn>
                          <Btn
                            size="sm"
                            variant="danger"
                            onClick={() => del(p.id)}
                          >
                            ✕
                          </Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {editModal && (
        <Modal title="Edit Product" onClose={() => setEditModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="Name" style={{ gridColumn: "1/-1" }}>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </Field>
              <Field label="Brand">
                <Input
                  value={editForm.brand || ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, brand: e.target.value }))
                  }
                  placeholder="Brand / MFR"
                />
              </Field>
              <Field label="Category">
                <Input
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, category: e.target.value }))
                  }
                />
              </Field>
              <Field label="Unit">
                <Select
                  value={editForm.unit}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, unit: e.target.value }))
                  }
                >
                  {UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Barcode" style={{ gridColumn: "1/-1" }}>
                <Input
                  value={editForm.barcode || ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, barcode: e.target.value }))
                  }
                />
              </Field>
              <Field label="Cost ₹">
                <NumInput
                  value={String(editForm.cost ?? "")}
                  onChange={(v) => setEditForm((f) => ({ ...f, cost: v }))}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Price ₹">
                <NumInput
                  value={String(editForm.price ?? "")}
                  onChange={(v) => setEditForm((f) => ({ ...f, price: v }))}
                  placeholder="0.00"
                />
              </Field>
              <Field label="GST %">
                <Select
                  value={String(editForm.gstPct || 0)}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, gstPct: +e.target.value }))
                  }
                >
                  {GST_RATES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </Field>
              <Field label="HSN Code">
                <Input
                  value={editForm.hsn || ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, hsn: e.target.value }))
                  }
                />
              </Field>
              <Field label="Stock">
                <NumInput
                  ref={editStockRef}
                  value={String(editForm.stock ?? "")}
                  onChange={(v) => setEditForm((f) => ({ ...f, stock: v }))}
                  placeholder="0"
                />
              </Field>
              <Field label="Min Stock">
                <NumInput
                  value={String(editForm.minStock ?? "")}
                  onChange={(v) => setEditForm((f) => ({ ...f, minStock: v }))}
                  placeholder="5"
                />
              </Field>
              <Field label="Distributor GSTIN" style={{ gridColumn: "1/-1" }}>
                <Input
                  value={editForm.distributorGST || ""}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      distributorGST: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <Btn variant="secondary" onClick={() => setEditModal(null)}>
                Cancel
              </Btn>
              <Btn onClick={saveEdit}>Update</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default StockManagement;
