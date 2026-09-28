import React, { useState, useMemo, useRef } from "react";
import { T } from "../../constants/theme";
import { EXPIRY_ALERT_DAYS, LARGE_TABLE_LIMIT } from "../../constants/config";
import { fmt, today, uid, clean, lower, n } from "../../utils/formatters";
import { daysUntilDate, expiryLabel } from "../../utils/expiryUtils";
import { parseExcelFile, downloadStockArrivalTemplate, findRowValue } from "../../utils/excelUtils";
import Badge from "../common/Badge";
import Btn from "../common/Btn";
import Card from "../common/Card";
import Modal from "../common/Modal";
import Field from "../common/Field";
import Input from "../common/Input";
import Select from "../common/Select";
import ArrivalGrid, {
  EMPTY_ARR_ROW,
  arrivalLineTotal,
  arrivalUnitCost,
  arrivalSubtotal,
  arrivalDiscountAmount,
  arrivalGrandTotal,
  arrivalRoundOffAmount,
} from "./ArrivalGrid";

export function StockArrival({
  products,
  setProducts,
  arrivals,
  setArrivals,
  distributors,
  setPayables,
  arrTab: propArrTab,
  setArrTab: propSetArrTab,
  arrHeader: propArrHeader,
  setArrHeader: propSetArrHeader,
  arrItemRows: propArrItemRows,
  setArrItemRows: propSetArrItemRows,
}) {
  const [localArrTab, setLocalArrTab] = useState("list");
  const [localArrHeader, setLocalArrHeader] = useState({
    date: today(),
    supplier: "",
    distributorGST: "",
    invoiceNo: "",
    discountType: "amount",
    discount: "",
    roundOffMode: "none",
  });
  const [localArrItemRows, setLocalArrItemRows] = useState([EMPTY_ARR_ROW()]);

  const arrTab = propArrTab !== undefined ? propArrTab : localArrTab;
  const setArrTab = propSetArrTab || setLocalArrTab;
  const arrHeader = propArrHeader !== undefined ? propArrHeader : localArrHeader;
  const setArrHeader = propSetArrHeader || setLocalArrHeader;
  const arrItemRows = propArrItemRows !== undefined ? propArrItemRows : localArrItemRows;
  const setArrItemRows = propSetArrItemRows || setLocalArrItemRows;

  const [viewArr, setViewArr] = useState(null);
  const [editArr, setEditArr] = useState(null);
  const [editHeader, setEditHeader] = useState({
    date: "",
    supplier: "",
    distributorGST: "",
    invoiceNo: "",
  });
  const [editRows, setEditRows] = useState([]);
  const header = arrHeader;

  const setHeader = setArrHeader;
  const itemRows = arrItemRows;
  const setItemRows = setArrItemRows;
  const focusFirstEmptyExpiry = () => {
    // Restore focus after validation so Electron does not leave the grid trapped
    // behind a native dialog.
    setTimeout(() => {
      const input = [...document.querySelectorAll('input[data-arrival-expiry="true"]')]
        .find((element) => !element.value);
      input?.focus();
    }, 0);
  };
  const productById = useMemo(
    () => new Map(products.map((p) => [String(p.id), p])),
    [products]
  );

  const arrivalFileRef = useRef(null);

  const handleArrivalExcelImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcelFile(file);
      if (!rows || !rows.length) {
        alert("No rows found in the uploaded Excel file.");
        return;
      }

      // Group rows by Distributor + Invoice No + Date
      const groups = new Map();

      rows.forEach((row, idx) => {
        const supplier =
          findRowValue(
            row,
            "Distributor Name",
            "Supplier",
            "Distributor",
            "DistributorName",
            "Vendor"
          ) || "General Supplier";
        const distributorGST =
          findRowValue(
            row,
            "Distributor GSTIN",
            "Distributor GST",
            "Supplier GST",
            "GSTIN"
          ) || "";
        const invoiceNo =
          findRowValue(
            row,
            "Invoice No",
            "Invoice Number",
            "Bill No",
            "Bill Number",
            "InvoiceNo"
          ) || `ARR-IMP-${Date.now().toString().slice(-4)}-${idx + 1}`;
        const date =
          findRowValue(row, "Date", "Arrival Date", "Bill Date") || today();

        const prodName = findRowValue(
          row,
          "Product Name",
          "Product",
          "Item Name",
          "Item",
          "ProductName"
        );
        if (!prodName) return; // Skip non-product or empty rows

        const brand = findRowValue(row, "Brand", "Company", "Mfr", "Manufacturer");
        const category = findRowValue(row, "Category", "Cat") || "General";
        const unit = findRowValue(row, "Unit", "UOM") || "Piece";
        const barcode = findRowValue(row, "Barcode", "Code", "UPC");
        const ncode = findRowValue(row, "NCode", "Item Code");
        const batch = findRowValue(row, "Batch", "Batch No", "Batch Number");
        const expiry = findRowValue(row, "Expiry Date", "Expiry", "Exp Date", "Exp");
        const qty = parseFloat(findRowValue(row, "Quantity", "Qty")) || 0;
        const free = parseFloat(findRowValue(row, "Free Qty", "Free")) || 0;
        const rate =
          parseFloat(
            findRowValue(row, "Purchase Rate", "Rate", "Cost", "Unit Cost", "Price")
          ) || 0;
        const mrp =
          parseFloat(
            findRowValue(row, "MRP", "Selling Price", "Sale Price")
          ) || rate;
        const gstPct =
          parseFloat(findRowValue(row, "GST %", "GST", "Tax %", "Tax")) || 0;
        const pd =
          parseFloat(
            findRowValue(
              row,
              "Product Discount %",
              "Product Discount",
              "Discount %",
              "Disc %",
              "Discount"
            )
          ) || 0;

        if (qty <= 0 && free <= 0) return;

        const groupKey = `${supplier.toLowerCase().trim()}|${invoiceNo
          .toLowerCase()
          .trim()}|${date}`;
        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            supplier,
            distributorGST,
            invoiceNo,
            date,
            items: [],
          });
        }

        groups.get(groupKey).items.push({
          prodName,
          brand,
          category,
          unit,
          barcode,
          ncode,
          batch,
          expiry,
          qty,
          free,
          rate,
          mrp,
          gstPct,
          pd,
        });
      });

      if (groups.size === 0) {
        alert(
          "No valid product arrival records found in file. Please ensure column headers include: Distributor Name, Invoice No, Product Name, Quantity, Rate."
        );
        return;
      }

      let updatedProducts = [...products];
      let newArrivals = [];
      let totalItemCount = 0;

      groups.forEach((grp) => {
        const arrivalItems = [];

        grp.items.forEach((item) => {
          totalItemCount++;
          let existingIndex = updatedProducts.findIndex(
            (p) =>
              (item.barcode && clean(p.barcode) === clean(item.barcode)) ||
              (item.ncode && clean(p.ncode) === clean(item.ncode)) ||
              (lower(p.name) === lower(item.prodName) &&
                lower(p.unit || "") === lower(item.unit || ""))
          );

          let productId;
          if (existingIndex >= 0) {
            productId = updatedProducts[existingIndex].id;
            updatedProducts[existingIndex] = {
              ...updatedProducts[existingIndex],
              stock: n(updatedProducts[existingIndex].stock) + item.qty + item.free,
              cost: item.rate > 0 ? item.rate : updatedProducts[existingIndex].cost,
              price: item.mrp > 0 ? item.mrp : updatedProducts[existingIndex].price,
              brand: item.brand || updatedProducts[existingIndex].brand,
              category: item.category || updatedProducts[existingIndex].category,
            };
          } else {
            productId = "P" + uid();
            const newProd = {
              id: productId,
              name: item.prodName.trim(),
              brand: item.brand ? item.brand.trim() : "",
              category: item.category ? item.category.trim() : "General",
              unit: item.unit || "Piece",
              barcode: item.barcode || "",
              ncode: item.ncode || "",
              cost: item.rate,
              price: item.mrp || (item.rate > 0 ? item.rate * 1.2 : 0),
              stock: item.qty + item.free,
              minStock: 5,
              gstPct: item.gstPct,
              hsn: "",
              distributorGST: grp.distributorGST || "",
            };
            updatedProducts.push(newProd);
          }

          const discountVal = (item.qty * item.rate * item.pd) / 100;
          const taxableAmt = item.qty * item.rate - discountVal;
          const gstAmt = (taxableAmt * item.gstPct) / 100;
          const lineTotal = taxableAmt + gstAmt;

          arrivalItems.push({
            id: "ITM" + uid(),
            productId,
            name: item.prodName,
            ncode: item.ncode || "",
            mfr: item.brand || "",
            barcode: item.barcode || "",
            mrp: item.mrp,
            qty: item.qty,
            free: item.free,
            batch: item.batch || "",
            expiry: item.expiry || "",
            rate: item.rate,
            pdType: "percent",
            pd: item.pd,
            gstPct: item.gstPct,
            total: Number(lineTotal.toFixed(2)),
          });
        });

        const subtotal = arrivalItems.reduce((s, it) => s + it.total, 0);

        newArrivals.push({
          id: "ARR" + uid(),
          date: grp.date,
          supplier: grp.supplier,
          distributorGST: grp.distributorGST,
          invoiceNo: grp.invoiceNo,
          items: arrivalItems,
          subtotal: Number(subtotal.toFixed(2)),
          discountType: "amount",
          discount: 0,
          discountAmount: 0,
          grandTotal: Number(subtotal.toFixed(2)),
          paidAmount: 0,
          dueAmount: Number(subtotal.toFixed(2)),
          status: "Received",
        });
      });

      setProducts(updatedProducts);
      setArrivals((prev) => [...newArrivals, ...prev]);

      alert(
        `✅ Successfully imported ${newArrivals.length} Stock Arrival bill(s) containing ${totalItemCount} item(s)! Product stock quantities have been updated.`
      );
    } catch (err) {
      console.error("Stock Arrival Excel Import error:", err);
      alert("Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const openEdit = (a) => {
    setEditArr(a);
    setEditHeader({
      date: a.date,
      supplier: a.supplier,
      distributorGST: a.distributorGST || "",
      invoiceNo: a.invoiceNo || "",
    });
    setEditRows(
      (a.items || []).map((it) => ({
        _id: uid(),
        productId: it.productId,
        ncode: it.ncode || "",
        mfr: it.mfr || "",
        barcode: it.barcode || "",
        mrp: String(it.mrp || ""),
        qty: String(it.qty || ""),
        free: String(it.free || "0"),
        batch: it.batch || "",
        expiry: it.expiry || "",
        rate: String(it.rate || it.cost || ""),
        pdType: it.pdType || "percent",
        pd: String(it.pd || "0"),
        gstPct: String(it.gstPct || "0"),
        amount: "",
      }))
    );
    setViewArr(null);
  };

  const handleEditSupplierChange = (name) => {
    const d = distributors.find((d) => d.name === name);
    setEditHeader((h) => ({
      ...h,
      supplier: name,
      distributorGST: d?.gstin || "",
    }));
  };

  const handleSaveEdit = () => {
    if (!editHeader.supplier) return alert("Select or enter a supplier name.");
    const validItems = editRows.filter((r) => r.productId && parseFloat(r.qty) > 0);
    if (!validItems.length) return alert("Add at least one product row.");

    const missingExpiry = validItems.filter((r) => !r.expiry);
    if (missingExpiry.length) {
      const names = missingExpiry
        .map(
          (r) =>
            products.find((p) => p.id === r.productId)?.name || r.productId
        )
        .join(", ");
      alert(`Expiry date is required for: ${names}`);
      focusFirstEmptyExpiry();
      return;
    }

    const newTotal = validItems.reduce((s, r) => s + arrivalLineTotal(r), 0);
    const dist = distributors.find((d) => d.name === editHeader.supplier);

    const newItems = validItems.map((r) => {
      const qty = parseFloat(r.qty) || 0,
        rate = parseFloat(r.rate) || 0,
        pd = parseFloat(r.pd) || 0;
      return {
        productId: r.productId,
        ncode: r.ncode || "",
        mfr: r.mfr || "",
        barcode: r.barcode || "",
        qty,
        free: parseFloat(r.free) || 0,
        batch: r.batch || "",
        expiry: r.expiry || "",
        mrp: parseFloat(r.mrp) || 0,
        rate,
        pdType: r.pdType || "percent",
        pd,
        gstPct: parseFloat(r.gstPct) || 0,
        cost: arrivalUnitCost(r),
        amount: arrivalLineTotal(r),
      };
    });

    setProducts((ps) =>
      ps.map((p) => {
        const oldItem = (editArr.items || []).find((it) => it.productId === p.id);
        const newItem = newItems.find((it) => it.productId === p.id);
        const oldQty = oldItem?.qty || 0;
        const newQty = newItem?.qty || 0;
        const delta = newQty - oldQty;
        return delta !== 0 ? { ...p, stock: n(p.stock) + delta } : p;
      })
    );

    const updatedArrival = {
      ...editArr,
      date: editHeader.date,
      supplier: editHeader.supplier,
      distributorId: dist?.id || editArr.distributorId || "",
      distributorGST: editHeader.distributorGST,
      invoiceNo: editHeader.invoiceNo,
      items: newItems,
      total: newTotal,
    };

    setArrivals((as) => as.map((a) => (a.id === editArr.id ? updatedArrival : a)));

    if (setPayables) {
      setPayables((ps) =>
        ps.map((p) => {
          if (p.arrivalId !== editArr.id) return p;
          if (p.paid > 0) return p;
          return {
            ...p,
            amount: newTotal,
            balance: newTotal,
            date: editHeader.date,
            description: `Stock Arrival ${editArr.id}${
              editHeader.invoiceNo ? ` — Inv# ${editHeader.invoiceNo}` : ""
            }`,
          };
        })
      );
    }

    setEditArr(null);
    alert(
      `✅ Arrival ${editArr.id} updated! ${newItems.length} product(s), Total: ${fmt(
        newTotal
      )}`
    );
  };

  const handleSupplierChange = (name) => {
    const d = distributors.find((d) => d.name === name);
    setHeader((h) => ({
      ...h,
      supplier: name,
      distributorGST: d?.gstin || "",
    }));
  };

  const handleSave = () => {
    if (!header.supplier) return alert("Select or enter a supplier name.");
    const validItems = itemRows.filter((r) => r.productId && parseFloat(r.qty) > 0);
    if (!validItems.length) return alert("Add at least one product row.");

    const missingExpiry = validItems.filter((r) => !r.expiry);
    if (missingExpiry.length) {
      const names = missingExpiry
        .map(
          (r) =>
            products.find((p) => p.id === r.productId)?.name || r.productId
        )
        .join(", ");
      alert(`Expiry date is required for: ${names}`);
      focusFirstEmptyExpiry();
      return;
    }

    const subtotal = arrivalSubtotal(validItems);
    const discount = arrivalDiscountAmount(
      subtotal,
      header.discountType,
      header.discount
    );
    const total = arrivalGrandTotal(
      validItems,
      header.discountType,
      header.discount,
      header.roundOffMode
    );
    const dist = distributors.find((d) => d.name === header.supplier);

    const arrival = {
      id: "ARR" + uid(),
      date: header.date,
      supplier: header.supplier,
      distributorId: dist?.id || "",
      distributorGST: header.distributorGST,
      invoiceNo: header.invoiceNo,
      subtotal,
      discountType: header.discountType || "amount",
      discount,
      items: validItems.map((r) => {
        const qty = parseFloat(r.qty) || 0;
        const rate = parseFloat(r.rate) || 0;
        const pd = parseFloat(r.pd) || 0;
        const amt = arrivalLineTotal(r);
        return {
          productId: r.productId,
          ncode: r.ncode || "",
          mfr: r.mfr || "",
          barcode: r.barcode || "",
          qty,
          free: parseFloat(r.free) || 0,
          batch: r.batch || "",
          expiry: r.expiry || "",
          mrp: parseFloat(r.mrp) || 0,
          rate,
          pdType: r.pdType || "percent",
          pd,
          gstPct: parseFloat(r.gstPct) || 0,
          cost: arrivalUnitCost(r),
          amount: amt,
        };
      }),
      total,
      status: "Received",
    };

    setArrivals((a) => [arrival, ...a]);
    setProducts((ps) =>
      ps.map((p) => {
        const it = validItems.find((r) => r.productId === p.id);
        return it
          ? {
              ...p,
              stock: n(p.stock) + (parseFloat(it.qty) || 0),
              cost: arrivalUnitCost(it),
            }
          : p;
      })
    );

    if (setPayables && total > 0) {
      setPayables((ps) => [
        {
          id: "PAY" + uid(),
          date: header.date,
          party: header.supplier,
          distributorId: dist?.id || "",
          description: `Stock Arrival ${arrival.id}${
            header.invoiceNo ? ` — Inv# ${header.invoiceNo}` : ""
          }`,
          arrivalId: arrival.id,
          amount: total,
          paid: 0,
          balance: total,
          dueDate: header.date,
          status: "Pending",
        },
        ...ps,
      ]);
    }

    setHeader({
      date: today(),
      supplier: "",
      distributorGST: "",
      invoiceNo: "",
      discountType: "amount",
      discount: "",
      roundOffMode: "none",
    });
    setItemRows([EMPTY_ARR_ROW()]);
    setArrTab("list");
    alert(
      `✅ Arrival saved! ${validItems.length} product(s), Total: ${fmt(
        total
      )}${
        total > 0
          ? "\n📋 Payable entry created automatically in Accounting."
          : ""
      }`
    );
  };

  const visibleArrivals = useMemo(
    () => arrivals.slice(0, LARGE_TABLE_LIMIT),
    [arrivals]
  );
  const expiryWarnings = useMemo(() => {
    const byId = new Map();
    const byBarcode = new Map();
    products.forEach((p) => {
      byId.set(String(p.id), p);
      const barcode = clean(p.barcode);
      if (barcode) byBarcode.set(barcode, p);
    });

    const seen = new Set();
    const warnings = [];
    (arrivals || []).forEach((a) => {
      (a.items || []).forEach((it) => {
        if (!it.expiry) return;
        const product =
          byId.get(String(it.productId)) ||
          (clean(it.barcode) ? byBarcode.get(clean(it.barcode)) : null) ||
          byId.get(clean(it.ncode));
        if (!product) return;
        const diff = daysUntilDate(it.expiry);
        if (diff == null || diff > EXPIRY_ALERT_DAYS) return;
        const key = `${product.id}|${it.expiry}|${it.batch || ""}`;
        if (seen.has(key)) return;
        seen.add(key);
        warnings.push({
          expiry: it.expiry,
          diff,
          arrId: a.id,
          batch: it.batch || "",
          qty: n(it.qty),
          name: product.name,
        });
      });
    });

    return warnings.sort(
      (a, b) => a.diff - b.diff || lower(a.name).localeCompare(lower(b.name))
    );
  }, [products, arrivals]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18 }}>Stock Arrivals</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {arrTab === "new" && (
            <Btn variant="secondary" onClick={() => setArrTab("list")}>
              ← Back to List
            </Btn>
          )}
          {arrTab === "list" && (
            <>
              <Btn variant="ghost" size="sm" onClick={downloadStockArrivalTemplate}>
                ⬇ Template
              </Btn>
              <Btn
                variant="secondary"
                onClick={() => arrivalFileRef.current?.click()}
              >
                📥 Import Excel
              </Btn>
              <input
                ref={arrivalFileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={handleArrivalExcelImport}
              />
              <Btn onClick={() => setArrTab("new")}>+ New Arrival</Btn>
            </>
          )}
        </div>
      </div>

      {expiryWarnings.length > 0 && (
        <div
          style={{
            background: T.amberDim,
            border: `1px solid ${T.amber}`,
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          <div
            style={{
              color: T.amber,
              fontWeight: 700,
              fontSize: 12,
              marginBottom: 6,
            }}
          >
            ⚠️ Expiry Alert — {expiryWarnings.length} item
            {expiryWarnings.length > 1 ? "s" : ""} expiring within{" "}
            {EXPIRY_ALERT_DAYS} days
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {expiryWarnings.slice(0, 6).map((w, i) => (
              <span
                key={i}
                style={{
                  background: T.surface,
                  borderRadius: 5,
                  padding: "2px 10px",
                  fontSize: 11,
                  color:
                    w.diff <= 0 ? T.red : w.diff <= 7 ? T.red : T.amber,
                }}
              >
                {w.name} - {expiryLabel(w.diff)} ({w.expiry})
              </span>
            ))}
            {expiryWarnings.length > 6 && (
              <span style={{ fontSize: 11, color: T.amber }}>
                +{expiryWarnings.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {arrTab === "new" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
              Arrival Details
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 12,
              }}
            >
              <Field label="Arrival Date">
                <Input
                  type="date"
                  value={header.date}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, date: e.target.value }))
                  }
                />
              </Field>
              <Field label="Distributor / Supplier">
                {distributors.length > 0 ? (
                  <Select
                    value={header.supplier}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {distributors.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                    <option value="__manual__">Other…</option>
                  </Select>
                ) : (
                  <Input
                    value={header.supplier}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, supplier: e.target.value }))
                    }
                    placeholder="Supplier name"
                  />
                )}
              </Field>
              <Field label="Distributor GSTIN">
                <Input
                  value={header.distributorGST}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, distributorGST: e.target.value }))
                  }
                  placeholder={
                    header.distributorGST ? "" : "Auto-filled from directory"
                  }
                  style={{
                    background: header.distributorGST ? "#0f2a1a" : undefined,
                    color: header.distributorGST ? T.green : undefined,
                  }}
                />
              </Field>
              <Field label="Invoice No">
                <Input
                  value={header.invoiceNo}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, invoiceNo: e.target.value }))
                  }
                  placeholder="Distributor invoice no."
                />
              </Field>
              <Field label="Discount Type">
                <Select
                  value={header.discountType || "amount"}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, discountType: e.target.value }))
                  }
                >
                  <option value="amount">Amount</option>
                  <option value="percent">Percent</option>
                </Select>
              </Field>
              <Field label="Discount">
                <div style={{ position: "relative" }}>
                  <Input
                    value={header.discount || ""}
                    inputMode="decimal"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v !== "" && !/^\d*\.?\d*$/.test(v)) return;
                      setHeader((h) => ({ ...h, discount: v }));
                    }}
                    placeholder="0"
                    style={{ paddingRight: 36 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: T.muted,
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {(header.discountType || "amount") === "percent"
                      ? "%"
                      : "₹"}
                  </span>
                </div>
              </Field>
              {header.supplier === "__manual__" && (
                <Field
                  label="Supplier Name (manual)"
                  style={{ gridColumn: "1/-1" }}
                >
                  <Input
                    value={
                      header.supplier === "__manual__" ? "" : header.supplier
                    }
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, supplier: e.target.value }))
                    }
                    placeholder="Type supplier name"
                  />
                </Field>
              )}
            </div>
          </Card>

          <Card style={{ padding: "14px 16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  Products in this Arrival
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  Select product → fill Qty + Cost.{" "}
                  <b style={{ color: T.amber }}>Expiry date required</b> for
                  perishables.
                </div>
              </div>
            </div>
            <ArrivalGrid
              rows={itemRows}
              setRows={setItemRows}
              products={products}
            />
            {(() => {
              const subtotal = arrivalSubtotal(itemRows);
              const discount = arrivalDiscountAmount(
                subtotal,
                header.discountType,
                header.discount
              );
              const total = arrivalGrandTotal(
                itemRows,
                header.discountType,
                header.discount,
                header.roundOffMode
              );
              const roundOff = arrivalRoundOffAmount(
                itemRows,
                header.discountType,
                header.discount,
                header.roundOffMode
              );
              return (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 12,
                  }}
                >
                  <div
                    style={{
                      minWidth: 280,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        color: T.muted,
                      }}
                    >
                      <span>Subtotal</span>
                      <span className="mono">{fmt(subtotal)}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        color: T.green,
                      }}
                    >
                      <span>Discount</span>
                      <span className="mono">-{fmt(discount)}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: T.muted,
                      }}
                    >
                      <label htmlFor="arrival-round-off">Round Off</label>
                      <select
                        id="arrival-round-off"
                        value={header.roundOffMode || "none"}
                        onChange={(e) =>
                          setHeader((h) => ({
                            ...h,
                            roundOffMode: e.target.value,
                          }))
                        }
                        style={{
                          background: T.inputBg,
                          color: T.text,
                          border: `1px solid ${T.border}`,
                          borderRadius: 6,
                          padding: "4px 7px",
                          fontSize: 12,
                        }}
                      >
                        <option value="none">No Round Off</option>
                        <option value="nearestRupee">Nearest Rupee</option>
                      </select>
                    </div>
                    {Math.abs(roundOff) >= 0.01 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          color: roundOff >= 0 ? T.green : T.red,
                          fontSize: 12,
                        }}
                      >
                        <span>Round Off Amount</span>
                        <span className="mono">
                          {roundOff >= 0 ? "+" : "-"}
                          {fmt(Math.abs(roundOff))}
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: 800,
                        fontSize: 16,
                        borderTop: `1px solid ${T.border}`,
                        paddingTop: 6,
                      }}
                    >
                      <span>Grand Total</span>
                      <span className="mono" style={{ color: T.green }}>
                        {fmt(total)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </Card>

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
          >
            <Btn variant="secondary" onClick={() => setArrTab("list")}>
              Cancel
            </Btn>
            <Btn onClick={handleSave} size="lg">
              💾 Save Arrival
            </Btn>
          </div>
        </div>
      )}

      {arrTab === "list" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {arrivals.length === 0 ? (
            <div style={{ color: T.muted, textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🚚</div>
              No arrivals yet. Click <b>+ New Arrival</b> to record stock.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>GSTIN</th>
                    <th>Invoice</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleArrivals.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <span
                          className="mono"
                          style={{ color: T.accent, fontSize: 11 }}
                        >
                          {a.id}
                        </span>
                      </td>
                      <td>{a.date}</td>
                      <td style={{ fontWeight: 600 }}>{a.supplier}</td>
                      <td
                        style={{
                          fontSize: 11,
                          color: T.accent,
                          fontFamily: "monospace",
                        }}
                      >
                        {a.distributorGST || "—"}
                      </td>
                      <td
                        className="mono"
                        style={{ fontSize: 11, color: T.muted }}
                      >
                        {a.invoiceNo || "—"}
                      </td>
                      <td style={{ color: T.muted }}>{a.items?.length || 0}</td>
                      <td className="mono" style={{ color: T.green }}>
                        {fmt(a.total)}
                      </td>
                      <td>
                        <Badge color="green">{a.status}</Badge>
                      </td>
                      <td style={{ display: "flex", gap: 4 }}>
                        <Btn
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewArr(a)}
                        >
                          View
                        </Btn>
                        <Btn
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(a)}
                        >
                          Edit
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {viewArr && (
        <Modal
          title={`Arrival — ${viewArr.id}`}
          onClose={() => setViewArr(null)}
          width={780}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 10,
              }}
            >
              {[
                ["Date", viewArr.date],
                ["Supplier", viewArr.supplier],
                ["GSTIN", viewArr.distributorGST || "—"],
                ["Invoice No", viewArr.invoiceNo || "—"],
              ].map(([l, v]) => (
                <div
                  key={l}
                  style={{
                    background: T.surface,
                    borderRadius: 7,
                    padding: "8px 12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: T.muted,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      marginBottom: 3,
                    }}
                  >
                    {l}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: l === "GSTIN" ? T.accent : T.text,
                      fontFamily: l === "GSTIN" ? "monospace" : "inherit",
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Code</th>
                    <th>MFR</th>
                    <th>Batch</th>
                    <th>Exp</th>
                    <th>MRP</th>
                    <th>Qty</th>
                    <th>Free</th>
                    <th>Rate</th>
                    <th>PD%</th>
                    <th>GST%</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewArr.items || []).map((it, i) => {
                    const prod = productById.get(String(it.productId));
                    const diff = daysUntilDate(it.expiry);
                    const expColor =
                      diff === null
                        ? T.muted
                        : diff <= 0
                        ? T.red
                        : diff <= 30
                        ? T.amber
                        : T.green;
                    const amt =
                      it.amount ||
                      (it.qty || 0) *
                        (it.rate || it.cost || 0) *
                        (1 - (it.pd || 0) / 100);
                    return (
                      <tr key={i}>
                        <td style={{ color: T.muted, fontSize: 11 }}>{i + 1}</td>
                        <td style={{ fontWeight: 600, minWidth: 120 }}>
                          {prod?.name || it.productId}
                        </td>
                        <td
                          className="mono"
                          style={{ fontSize: 11, color: T.muted }}
                        >
                          {it.ncode || "—"}
                        </td>
                        <td style={{ fontSize: 11, color: T.muted }}>
                          {it.mfr || "—"}
                        </td>
                        <td
                          className="mono"
                          style={{ fontSize: 11, color: T.muted }}
                        >
                          {it.batch || "—"}
                        </td>
                        <td
                          style={{
                            color: expColor,
                            fontSize: 11,
                            fontWeight: it.expiry ? 600 : 400,
                          }}
                        >
                          {it.expiry || "—"}
                          {diff !== null && (
                            <div style={{ fontSize: 9 }}>
                              {diff <= 0
                                ? "Expired"
                                : diff === 1
                                ? "Tomorrow"
                                : `${diff}d`}
                            </div>
                          )}
                        </td>
                        <td className="mono" style={{ color: T.muted }}>
                          {it.mrp ? fmt(it.mrp) : "—"}
                        </td>
                        <td className="mono">{it.qty}</td>
                        <td className="mono" style={{ color: T.green }}>
                          {it.free || 0}
                        </td>
                        <td className="mono">{fmt(it.rate || it.cost || 0)}</td>
                        <td className="mono" style={{ color: T.amber }}>
                          {it.pd || 0}%
                        </td>
                        <td className="mono" style={{ color: T.accent }}>
                          {it.gstPct || 0}%
                        </td>
                        <td
                          className="mono"
                          style={{ color: T.green, fontWeight: 600 }}
                        >
                          {fmt(amt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: 800,
                fontSize: 15,
                borderTop: `1px solid ${T.border}`,
                paddingTop: 10,
              }}
            >
              <Btn variant="secondary" onClick={() => openEdit(viewArr)}>
                ✏️ Edit Arrival
              </Btn>
              <div>
                Grand Total:{" "}
                <span
                  className="mono"
                  style={{ color: T.green, marginLeft: 10 }}
                >
                  {fmt(viewArr.total)}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {editArr && (
        <Modal
          title={`Edit Arrival — ${editArr.id}`}
          onClose={() => setEditArr(null)}
          width={900}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                background: T.amberDim,
                border: `1px solid ${T.amber}44`,
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 12,
                color: T.amber,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <span>⚠️</span>
              <span>
                Stock quantities will be adjusted automatically — original
                quantities reversed, new quantities applied.
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 12,
              }}
            >
              <Field label="Arrival Date">
                <Input
                  type="date"
                  value={editHeader.date}
                  onChange={(e) =>
                    setEditHeader((h) => ({ ...h, date: e.target.value }))
                  }
                />
              </Field>
              <Field label="Distributor / Supplier">
                {distributors.length > 0 ? (
                  <Select
                    value={editHeader.supplier}
                    onChange={(e) =>
                      handleEditSupplierChange(e.target.value)
                    }
                  >
                    <option value="">— Select —</option>
                    {distributors.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                    <option value="__manual__">Other…</option>
                  </Select>
                ) : (
                  <Input
                    value={editHeader.supplier}
                    onChange={(e) =>
                      setEditHeader((h) => ({ ...h, supplier: e.target.value }))
                    }
                    placeholder="Supplier name"
                  />
                )}
              </Field>
              <Field label="Distributor GSTIN">
                <Input
                  value={editHeader.distributorGST}
                  onChange={(e) =>
                    setEditHeader((h) => ({
                      ...h,
                      distributorGST: e.target.value,
                    }))
                  }
                  style={{
                    background: editHeader.distributorGST
                      ? "#0f2a1a"
                      : undefined,
                    color: editHeader.distributorGST ? T.green : undefined,
                  }}
                />
              </Field>
              <Field label="Invoice No">
                <Input
                  value={editHeader.invoiceNo}
                  onChange={(e) =>
                    setEditHeader((h) => ({ ...h, invoiceNo: e.target.value }))
                  }
                  placeholder="Invoice no."
                />
              </Field>
            </div>

            <div
              style={{
                borderTop: `1px solid ${T.border}`,
                paddingTop: 12,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 8,
                  color: T.text,
                }}
              >
                Products
              </div>
              <ArrivalGrid
                rows={editRows}
                setRows={setEditRows}
                products={products}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                borderTop: `1px solid ${T.border}`,
                paddingTop: 12,
              }}
            >
              <Btn variant="secondary" onClick={() => setEditArr(null)}>
                Cancel
              </Btn>
              <Btn onClick={handleSaveEdit} size="lg">
                💾 Save Changes
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default StockArrival;
