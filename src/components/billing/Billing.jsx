import React, { useState, useRef, useEffect, useMemo, useDeferredValue, useCallback } from "react";
import { T, LOGO_URI } from "../../constants/theme";
import { EXPIRY_ALERT_DAYS, BILLING_PRODUCT_LIMIT } from "../../constants/config";
import { fmt, today, uid, clean, lower, phoneDigits, n, matchProductSearch } from "../../utils/formatters";
import { daysUntilDate, expiryLabel } from "../../utils/expiryUtils";
import { getPointsRule, customerKey, isRealCustomer, calcPointsForAmount } from "../../utils/loyaltyUtils";
import { printGSTInvoice } from "../../services/printService";
import Btn from "../common/Btn";
import Card from "../common/Card";
import Modal from "../common/Modal";
import Field from "../common/Field";
import Input from "../common/Input";
import NumInput from "../common/NumInput";
import Select from "../common/Select";
import BillingProductCard from "./BillingProductCard";
import QuickAddForm from "../arrival/QuickAddForm";

export function Billing({
  products,
  setProducts,
  sales,
  setSales,
  cashLedger,
  setCashLedger,
  shopConfig,
  arrivals,
  cart: propCart,
  setCart: propSetCart,
  customer: propCustomer,
  setCustomer: propSetCustomer,
  phone: propPhone,
  setPhone: propSetPhone,
  discount: propDiscount,
  setDiscount: propSetDiscount,
  payments: propPayments,
  setPayments: propSetPayments,
  billingSearch: propSearch,
  setBillingSearch: propSetSearch,
  heldBills: propHeld,
  setHeldBills: propSetHeld,
}) {
  const [localCart, setLocalCart] = useState([]);
  const [localCustomer, setLocalCustomer] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [localDiscount, setLocalDiscount] = useState("");
  const [localPayments, setLocalPayments] = useState([{ mode: "Cash", amount: "" }]);
  const [localSearch, setLocalSearch] = useState("");
  const [localHeld, setLocalHeld] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [quickAdd, setQuickAdd] = useState(false);
  const [discountType, setDiscountType] = useState("amount");
  const [roundOff, setRoundOff] = useState(0);
  const [showHeld, setShowHeld] = useState(false);
  const [qtyDrafts, setQtyDrafts] = useState({});
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);

  const rawCart = propCart !== undefined ? propCart : localCart;
  const cart = Array.isArray(rawCart) ? rawCart : [];
  const setCart = propSetCart || setLocalCart;

  const customer = propCustomer ?? localCustomer ?? "";
  const setCustomer = propSetCustomer || setLocalCustomer;

  const phone = propPhone ?? localPhone ?? "";
  const setPhone = propSetPhone || setLocalPhone;

  const discount = propDiscount ?? localDiscount ?? "";
  const setDiscount = propSetDiscount || setLocalDiscount;

  const rawPayments = propPayments !== undefined ? propPayments : localPayments;
  const payments = Array.isArray(rawPayments) && rawPayments.length > 0
    ? rawPayments
    : [{ mode: "Cash", amount: "" }];
  const setPayments = propSetPayments || setLocalPayments;

  const search = localSearch || "";
  const setSearch = setLocalSearch;

  const rawHeld = propHeld !== undefined ? propHeld : localHeld;
  const heldBills = Array.isArray(rawHeld) ? rawHeld : [];
  const setHeldBills = propSetHeld || setLocalHeld;

  const deferredSearch = useDeferredValue(search);

  const barcodeRef = useRef(null);
  const checkoutRefs = useRef({});

  const focusCheckout = (key) =>
    setTimeout(() => checkoutRefs.current[key]?.focus?.(), 0);

  const handleCheckoutEnter = (e, nextKey) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (nextKey) focusCheckout(nextKey);
  };

  const clearCurrent = () => {
    setCart([]);
    setCustomer("");
    setPhone("");
    setDiscount("");
    setRoundOff(0);
    setPayments([{ mode: "Cash", amount: "" }]);
    setSearch("");
  };

  const holdBill = () => {
    if (cart.length === 0) return alert("Cart is empty — nothing to hold.");
    const label =
      customer && customer !== "Walk-in"
        ? customer
        : `Customer ${heldBills.length + 1}`;
    setHeldBills((h) => [
      ...h,
      {
        id: "HOLD" + uid(),
        label,
        cart,
        customer,
        phone,
        discount,
        roundOff,
        payments,
        heldAt: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    clearCurrent();
  };

  const resumeBill = (held) => {
    if (
      cart.length > 0 &&
      !window.confirm("Current bill will be cleared. Resume held bill?")
    )
      return;
    setCart(held.cart);
    setCustomer(held.customer);
    setPhone(held.phone);
    setDiscount(held.discount);
    setRoundOff(held.roundOff || 0);
    setPayments(held.payments);
    setHeldBills((h) => h.filter((b) => b.id !== held.id));
    setShowHeld(false);
    setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  const dropHeld = (id) => {
    if (window.confirm("Discard this held bill?"))
      setHeldBills((h) => h.filter((b) => b.id !== id));
  };

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const pointsRule = useMemo(() => getPointsRule(shopConfig), [shopConfig]);
  const currentCustomerKey = customerKey(customer, phone);

  const customerPointsBefore = useMemo(
    () =>
      sales
        .filter(
          (s) =>
            isRealCustomer(s.customer, s.phone) &&
            customerKey(s.customer, s.phone) === customerKey(customer, phone)
        )
        .reduce(
          (sum, s) =>
            sum +
            (Number.isFinite(Number(s.pointsEarned))
              ? Number(s.pointsEarned)
              : calcPointsForAmount(s.total, pointsRule)),
          0
        ),
    [sales, currentCustomerKey, pointsRule]
  );

  const currentPhoneDigits = phoneDigits(phone);
  const phoneMatchesSale = useCallback((sale, digits) => {
    const saved = phoneDigits(sale.phone);
    return (
      saved &&
      (saved === digits || saved.endsWith(digits) || digits.endsWith(saved))
    );
  }, []);

  const customerSalesByPhone = useMemo(
    () =>
      currentPhoneDigits.length >= 7
        ? sales
            .filter((s) => phoneMatchesSale(s, currentPhoneDigits))
            .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
        : [],
    [sales, currentPhoneDigits, phoneMatchesSale]
  );

  const latestCustomerSale = customerSalesByPhone[0];
  const customerHistorySummary = useMemo(
    () => ({
      total: customerSalesByPhone.reduce((sum, s) => sum + (Number(s.total) || 0), 0),
      items: customerSalesByPhone.reduce(
        (sum, s) =>
          sum +
          (s.items || []).reduce(
            (itemSum, it) => itemSum + (Number(it.qty) || 0),
            0
          ),
        0
      ),
    }),
    [customerSalesByPhone]
  );

  const handlePhoneChange = useCallback(
    (value) => {
      setPhone(value);
      const digits = phoneDigits(value);
      if (digits.length < 7) return;
      const match = sales.find(
        (s) => phoneMatchesSale(s, digits) && lower(s.customer) !== "walk-in"
      );
      if (match?.customer) setCustomer(match.customer);
    },
    [sales, phoneMatchesSale, setPhone, setCustomer]
  );

  const expiryRowsByProduct = useMemo(() => {
    const byId = new Map();
    const byBarcode = new Map();
    const byNcode = new Map();
    const byName = new Map();

    products.forEach((p) => {
      const pid = String(p.id);
      byId.set(pid, p);
      const bc = clean(p.barcode);
      if (bc) byBarcode.set(bc, p);
      const nc = clean(p.ncode);
      if (nc) byNcode.set(nc, p);
      const nm = lower(p.name);
      if (nm) byName.set(nm, p);
    });

    const batchMap = new Map();

    (arrivals || []).forEach((a) => {
      (a.items || []).forEach((it) => {
        if (!it.expiry) return;
        const product =
          byId.get(String(it.productId)) ||
          (clean(it.barcode) ? byBarcode.get(clean(it.barcode)) : null) ||
          (clean(it.ncode) ? byNcode.get(clean(it.ncode)) : null) ||
          (lower(it.name) ? byName.get(lower(it.name)) : null);
        if (!product) return;
        const diff = daysUntilDate(it.expiry);
        if (diff == null) return;

        const prodId = String(product.id);
        const batchName = String(it.batch || "").trim();
        const expDate = String(it.expiry).trim();
        const batchKey = `${prodId}|${expDate}|${batchName}`;

        const incomingQty = n(it.qty) + n(it.free);
        if (batchMap.has(batchKey)) {
          const existing = batchMap.get(batchKey);
          existing.totalQty += incomingQty;
        } else {
          batchMap.set(batchKey, {
            prodId,
            expiry: expDate,
            diff,
            arrId: a.id || "ARR",
            batch: batchName,
            totalQty: incomingQty,
          });
        }
      });
    });

    const rows = new Map();
    batchMap.forEach((batchObj) => {
      const list = rows.get(batchObj.prodId) || [];
      list.push(batchObj);
      rows.set(batchObj.prodId, list);
    });

    rows.forEach((list) => list.sort((a, b) => a.diff - b.diff));
    return rows;
  }, [products, arrivals]);

  const soldByExpiryBatch = useMemo(() => {
    const sold = new Map();
    (sales || []).forEach((sale) => {
      (sale.items || []).forEach((item) => {
        if (!item.expiry) return;
        let basePid = String(item.productId || "");
        if (basePid.includes("|")) basePid = basePid.split("|")[0];
        const batchName = String(item.batch || "").trim();
        const expDate = String(item.expiry).trim();
        const key = `${basePid}|${expDate}|${batchName}`;
        sold.set(key, (sold.get(key) || 0) + n(item.qty));
      });
    });
    return sold;
  }, [sales]);

  const enrichedProducts = useMemo(
    () =>
      products.flatMap((p) => {
        const pid = String(p.id);
        const expiryRows = expiryRowsByProduct.get(pid) || [];
        if (!expiryRows.length)
          return [{ ...p, billingKey: pid, expiryInfo: null }];

        const activeBatches = [];
        let totalBatchStock = 0;

        expiryRows.forEach((expiryInfo, idx) => {
          const batchKey = `${pid}|${expiryInfo.expiry}|${expiryInfo.batch}`;
          const soldQty = soldByExpiryBatch.get(batchKey) || 0;
          const remainingBatchStock = Math.max(0, expiryInfo.totalQty - soldQty);

          totalBatchStock += remainingBatchStock;

          if (remainingBatchStock > 0) {
            activeBatches.push({
              ...p,
              billingKey: `${pid}|${expiryInfo.arrId}|${expiryInfo.batch}|${expiryInfo.expiry}|${idx}`,
              expiryInfo,
              stock: remainingBatchStock,
            });
          }
        });

        const remainingProductStock = Math.max(0, n(p.stock) - totalBatchStock);

        if (activeBatches.length > 0) {
          if (remainingProductStock > 0) {
            activeBatches.push({
              ...p,
              billingKey: pid,
              expiryInfo: null,
              stock: remainingProductStock,
            });
          }
          return activeBatches;
        }

        return [{ ...p, billingKey: pid, expiryInfo: null, stock: n(p.stock) }];
      }),
    [products, expiryRowsByProduct, soldByExpiryBatch]
  );

  const inStockProducts = useMemo(
    () => enrichedProducts.filter((p) => n(p.stock) > 0),
    [enrichedProducts]
  );

  const searchableProducts = useMemo(
    () =>
      inStockProducts.map((p) => ({
        product: p,
        text: [p.name, p.brand, p.category, p.barcode, p.id, p.ncode].map(lower).join(" "),
        barcode: lower(p.barcode),
        id: lower(p.id),
        nameKey: lower(p.name),
        ncode: lower(p.ncode),
        expiryDiff: p.expiryInfo?.diff ?? Number.POSITIVE_INFINITY,
      })),
    [inStockProducts]
  );

  const q = search;
  const filtered = useMemo(
    () =>
      searchableProducts
        .filter((p) => matchProductSearch(p.product, q))
        .sort((a, b) => {
          const qClean = lower(q);
          if (qClean) {
            const aStartsWith = a.nameKey.startsWith(qClean);
            const bStartsWith = b.nameKey.startsWith(qClean);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
          }
          if (a.expiryDiff !== b.expiryDiff) return a.expiryDiff - b.expiryDiff;
          return a.nameKey.localeCompare(b.nameKey);
        })
        .map((p) => p.product),
    [searchableProducts, q]
  );

  const productLookup = useMemo(() => {
    const lookup = new Map();
    const sorted = [...searchableProducts].sort((a, b) => n(b.product.stock) - n(a.product.stock));
    sorted.forEach((p) => {
      if (p.barcode && !lookup.has(p.barcode)) lookup.set(p.barcode, p.product);
      if (p.id && !lookup.has(p.id)) lookup.set(p.id, p.product);
      if (p.ncode && !lookup.has(p.ncode)) lookup.set(p.ncode, p.product);
      if (p.nameKey && !lookup.has(p.nameKey)) lookup.set(p.nameKey, p.product);
    });
    return lookup;
  }, [searchableProducts]);

  const expiryBillingAlerts = useMemo(
    () =>
      inStockProducts
        .filter((p) => p.expiryInfo && p.expiryInfo.diff <= EXPIRY_ALERT_DAYS)
        .sort(
          (a, b) =>
            (a.expiryInfo?.diff ?? 9999) - (b.expiryInfo?.diff ?? 9999)
        ),
    [inStockProducts]
  );

  const visibleProducts = useMemo(() => {
    if (showAllProducts) return filtered;
    return filtered.slice(0, BILLING_PRODUCT_LIMIT);
  }, [filtered, showAllProducts]);

  useEffect(() => {
    if (q) setShowAllProducts(false);
  }, [q]);

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + (Number(i.total) || 0), 0),
    [cart]
  );
  const totalGST = useMemo(
    () =>
      cart.reduce(
        (s, i) => {
          const itemTotal = Number(i.total) || 0;
          const gstPct = Number(i.gstPct) || 0;
          return s + (itemTotal - itemTotal / (1 + gstPct / 100));
        },
        0
      ),
    [cart]
  );

  const discountAmt = useMemo(() => {
    const raw =
      discountType === "percent"
        ? (subtotal * Math.min(n(discount), 100)) / 100
        : Math.max(0, n(discount));
    return Math.min(subtotal, raw);
  }, [discountType, discount, subtotal]);

  const [roundOffMode, setRoundOffMode] = useState("none"); // "none" | "nearest10" | "nearest100" | "roundup10"

  const baseTotal = useMemo(
    () => Number((subtotal - discountAmt).toFixed(2)),
    [subtotal, discountAmt]
  );

  const hasRoundableFraction =
    baseTotal > 0 && Math.abs(baseTotal - Math.round(baseTotal)) >= 0.01;

  const computedRoundedTotal = useMemo(() => {
    if (baseTotal <= 0 || roundOffMode === "none") return baseTotal;
    let rounded = baseTotal;
    if (roundOffMode === "nearest10") {
      rounded = Math.round(baseTotal / 10) * 10;
    } else if (roundOffMode === "nearest100") {
      rounded = Math.round(baseTotal / 100) * 100;
    } else if (roundOffMode === "roundup10") {
      rounded = Math.ceil(baseTotal / 10) * 10;
    }
    return Number(rounded.toFixed(2));
  }, [baseTotal, roundOffMode]);

  const computedRoundOff = useMemo(() => {
    if (roundOffMode === "none" || baseTotal <= 0) return roundOff;
    return Number((computedRoundedTotal - baseTotal).toFixed(2));
  }, [roundOffMode, baseTotal, computedRoundedTotal, roundOff]);

  const total = Math.max(0, Number((baseTotal + computedRoundOff).toFixed(2)));
  const totalPaid = useMemo(
    () => payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
    [payments]
  );
  const change = Number((totalPaid - total).toFixed(2));
  const hasCartItems = cart.length > 0;

  useEffect(() => {
    setRoundOff(0);
  }, [cart, discount, discountType]);

  const roundedPaymentOptions = hasRoundableFraction
    ? [["Round off", Math.round(baseTotal), "Nearest rupee"]]
    : [];

  const applyRoundedPayment = (amount) => {
    if (!hasRoundableFraction) return;
    const rounded = Number(amount) || 0;
    const adjustment = Number((rounded - baseTotal).toFixed(2));
    setRoundOff(adjustment);
    updatePay(0, "amount", rounded.toFixed(2));
    focusCheckout("payAmount-0");
  };

  const handleScanKey = (e) => {
    if (e.key === "Enter") {
      const code = search.trim();
      if (!code) return;
      const key = lower(code);
      let prod = productLookup.get(key);
      if (!prod && filtered.length > 0) {
        prod = filtered[0];
      }
      if (prod) {
        addToCart(prod);
        setSearch("");
      } else if (code.length > 0) {
        alert(`Product not found: "${code}"`);
        setSearch("");
      }
    }
  };

  const addToCart = useCallback(
    (prod) => {
      setCart((c) => {
        const lineId = String(prod.billingKey ?? prod.id);
        const ex = c.find((i) => cartItemKey(i) === lineId);
        if (ex)
          return c.map((i) =>
            cartItemKey(i) === lineId
              ? { ...i, lineId, qty: Number(i.qty) + 1, total: (Number(i.qty) + 1) * Number(i.price) }
              : i
          );
        return [
          ...c,
          {
            lineId,
            productId: prod.id,
            name: prod.name,
            qty: 1,
            price: Number(prod.price) || 0,
            total: Number(prod.price) || 0,
            gstPct: prod.gstPct || 0,
            hsn: prod.hsn || "",
            unit: prod.unit || "Piece",
            expiry: prod.expiryInfo?.expiry || "",
            expiryDiff: prod.expiryInfo?.diff ?? null,
            batch: prod.expiryInfo?.batch || "",
          },
        ];
      });
    },
    [setCart]
  );

  const addProductFromGrid = useCallback(
    (prod) => {
      addToCart(prod);
      setSearch("");
    },
    [addToCart, setSearch]
  );

  const removeFromCart = useCallback(
    (id) => setCart((c) => c.filter((i) => cartItemKey(i) !== String(id))),
    [setCart]
  );

  const updateQty = useCallback(
    (id, qty) => {
      const nextQty = Number(qty);
      if (!Number.isFinite(nextQty) || nextQty <= 0) return removeFromCart(id);
      setCart((c) =>
        c.map((i) =>
          cartItemKey(i) === String(id)
            ? { ...i, qty: nextQty, total: nextQty * Number(i.price) }
            : i
        )
      );
    },
    [removeFromCart, setCart]
  );

  const addPayRow = useCallback(
    () => setPayments((p) => [...p, { mode: "Cash", amount: "" }]),
    [setPayments]
  );

  const removePayRow = useCallback(
    (i) => setPayments((p) => p.filter((_, idx) => idx !== i)),
    [setPayments]
  );

  const updatePay = useCallback(
    (i, k, v) =>
      setPayments((p) => {
        const next = [...p];
        next[i] = { ...next[i], [k]: v };
        return next;
      }),
    [setPayments]
  );

  const fillRem = useCallback(
    (i) => {
      const other = payments.reduce(
        (s, p, idx) => (idx !== i ? s + (parseFloat(p.amount) || 0) : s),
        0
      );
      updatePay(i, "amount", Math.max(0, total - other).toFixed(2));
    },
    [payments, total, updatePay]
  );

  const generateBill = async (printAfter = false) => {
    if (cart.length === 0) return alert("Cart is empty!");
    const invoiceItems = cart
      .map((item) => ({
        ...item,
        qty: Number(item.qty) || 0,
        price: Number(item.price) || 0,
        total: Number(item.total) || 0,
        gstPct: Number(item.gstPct) || 0,
      }))
      .filter((item) => item.productId != null && item.name && item.qty > 0);
    if (invoiceItems.length === 0) {
      return alert("This item is not available. Add an item with a quantity greater than zero.");
    }
    if (invoiceItems.length !== cart.length) {
      const invalidItem = cart.find((item) => !invoiceItems.some((valid) => valid.lineId === item.lineId));
      return alert(`${invalidItem?.name || "This item"} is not available. Quantity must be greater than zero.`);
    }

    const unavailableItem = invoiceItems.find((item) => {
      const mainProduct = products.find((candidate) => String(candidate.id) === String(item.productId));
      const totalStockAvailable = Math.max(0, Number(mainProduct?.stock) || 0);
      return !mainProduct || item.qty > totalStockAvailable;
    });
    if (unavailableItem) {
      const mainProduct = products.find((candidate) => String(candidate.id) === String(unavailableItem.productId));
      const available = mainProduct ? Math.max(0, Number(mainProduct.stock) || 0) : 0;
      return alert(`${unavailableItem.name} is not available. Available quantity: ${available}.`);
    }
    if (totalPaid < total)
      return alert(`Need ${fmt(total)}, collected only ${fmt(totalPaid)}`);
    const billCustomer = clean(customer) || "Walk-in";
    const pointsEarned = isRealCustomer(billCustomer, phone)
      ? calcPointsForAmount(total, pointsRule)
      : 0;
    const pointsAfter = customerPointsBefore + pointsEarned;
    const giftEligible = pointsRule.enabled && pointsAfter >= pointsRule.giftAt;
    const inv = {
      id: "INV" + uid(),
      date: today(),
      createdAt: new Date().toISOString(),
      customer: billCustomer,
      phone,
      items: invoiceItems,
      subtotal,
      totalGST,
      discount: discountAmt,
      originalTotal: baseTotal,
      roundOffMode,
      roundOffLabel: roundOffMode === "none" ? "No Round Off" : roundOffMode === "nearest10" ? "Nearest ₹10" : roundOffMode === "nearest100" ? "Nearest ₹100" : "Round Up ₹10",
      roundOff: computedRoundOff,
      total,
      payments,
      change,
      shopConfig,
      pointsEarned,
      pointsAfter,
      giftEligible,
      giftName: pointsRule.giftName,
    };
    setSales((s) => [inv, ...s]);
    const cartQty = new Map();
    invoiceItems.forEach((item) => {
      const key = String(item.productId);
      cartQty.set(key, (cartQty.get(key) || 0) + item.qty);
    });
    setProducts((ps) =>
      ps.map((p) =>
        cartQty.has(String(p.id))
          ? { ...p, stock: Math.max(0, (Number(p.stock) || 0) - cartQty.get(String(p.id))) }
          : p
      )
    );
    const cashAmt = payments
      .filter((p) => p.mode === "Cash")
      .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    if (cashAmt > 0)
      setCashLedger((cl) => {
        const prev = cl.length ? cl[cl.length - 1].balance : 0;
        return [
          ...cl,
          {
            id: "CASH" + uid(),
            date: today(),
            description: `Sale ${inv.id} — ${billCustomer}`,
            type: "in",
            amount: cashAmt,
            balance: prev + cashAmt,
          },
        ];
      });
    setReceipt(inv);
    if (printAfter) await printGSTInvoice(inv, shopConfig);
    setCart([]);
    setCustomer("");
    setPhone("");
    setDiscount("");
    setRoundOff(0);
    setRoundOffMode("none");
    setPayments([{ mode: "Cash", amount: "" }]);
    setBillingSearch("");
    // The state-specific debounced saves upload sales, products, and cashLedger
    // independently. Keep full snapshots for explicit backup/recovery actions.
  };

  function cartItemKey(item) {
    return String(item?.lineId ?? item?.productId ?? "");
  }

  if (receipt)
    return (
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <Card style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                fontFamily: "'Syne',sans-serif",
              }}
            >
              <img
                src={LOGO_URI}
                style={{
                  width: 20,
                  height: 20,
                  objectFit: "contain",
                  verticalAlign: "middle",
                  marginRight: 6,
                }}
              />{" "}
              {shopConfig.shopName || "RETAIL SHOP"}
            </div>
            {shopConfig.address && (
              <div style={{ color: T.muted, fontSize: 11 }}>
                {shopConfig.address}
              </div>
            )}
            {shopConfig.gstNumber && (
              <div style={{ fontSize: 11, color: T.accent }}>
                GSTIN: {shopConfig.gstNumber}
              </div>
            )}
            <div style={{ color: T.muted, fontSize: 11, marginTop: 4 }}>
              GST Tax Invoice
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Invoice: <b>{receipt.id}</b> | {receipt.date}
            </div>
            <div style={{ fontSize: 12 }}>
              Customer: <b>{receipt.customer}</b>
              {receipt.phone ? ` | 📞 ${receipt.phone}` : ""}
            </div>
          </div>
          <div
            style={{
              borderTop: `1px dashed ${T.border}`,
              borderBottom: `1px dashed ${T.border}`,
              padding: "12px 0",
              marginBottom: 12,
            }}
          >
            {receipt.items.map((it, i) => (
              <div key={i} style={{ marginBottom: 5 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    {it.name} × {it.qty}
                  </span>
                  <span>{fmt(it.total)}</span>
                </div>
                {it.gstPct > 0 && (
                  <div style={{ color: T.muted, fontSize: 10 }}>
                    GST {it.gstPct}% incl.
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Subtotal</span>
              <span>{fmt(receipt.subtotal)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: T.amber,
              }}
            >
              <span>GST (incl.)</span>
              <span>{fmt(receipt.totalGST)}</span>
            </div>
            {receipt.discount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: T.green,
                }}
              >
                <span>Discount</span>
                <span>-{fmt(receipt.discount)}</span>
              </div>
            )}
            {receipt.roundOff !== 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: receipt.roundOff > 0 ? T.amber : T.green,
                }}
              >
                <span>Round off</span>
                <span>
                  {receipt.roundOff > 0 ? "+" : "-"}
                  {fmt(Math.abs(receipt.roundOff))}
                </span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: 16,
                color: T.green,
                marginTop: 4,
                borderTop: `1px dashed ${T.border}`,
                paddingTop: 8,
              }}
            >
              <span>TOTAL</span>
              <span>{fmt(receipt.total)}</span>
            </div>
            <div
              style={{
                borderTop: `1px dashed ${T.border}`,
                marginTop: 4,
                paddingTop: 6,
              }}
            >
              {receipt.payments.map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: T.muted,
                  }}
                >
                  <span>{p.mode}</span>
                  <span>{fmt(p.amount)}</span>
                </div>
              ))}
            </div>
            {receipt.change > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: T.accent,
                }}
              >
                <span>Change</span>
                <span>{fmt(receipt.change)}</span>
              </div>
            )}
            {receipt.pointsEarned > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: T.purple,
                }}
              >
                <span>Points earned</span>
                <span>{receipt.pointsEarned}</span>
              </div>
            )}
            {receipt.giftEligible && (
              <div
                style={{
                  marginTop: 6,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: T.greenDim,
                  color: T.green,
                  fontSize: 12,
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                Gift eligible: {receipt.giftName}
              </div>
            )}
          </div>
        </Card>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <Btn onClick={() => setReceipt(null)} style={{ flex: 1 }}>
            🧾 New Bill
          </Btn>
          <Btn
            variant="secondary"
            onClick={() => printGSTInvoice(receipt, shopConfig)}
            style={{ flex: 1 }}
          >
            🖨️ Print GST Invoice
          </Btn>
        </div>
      </div>
    );

  return (
    <div className="billing-shell">
      <div className="billing-products">
        <div className="billing-toolbar">
          <div className="billing-search-wrap">
            <Input
              ref={barcodeRef}
              placeholder="🔍 Type product name, brand or scan barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleScanKey}
              style={{ flex: 1, width: "100%" }}
              autoFocus
            />
            {expiryBillingAlerts.length > 0 && (
              <button
                type="button"
                onClick={() => setShowExpiryModal(true)}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: T.amberDim,
                  color: T.amber,
                  border: `1px solid ${T.amber}66`,
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  zIndex: 10,
                  whiteSpace: "nowrap",
                }}
                title={`${expiryBillingAlerts.length} products expiring soon`}
              >
                ⚠️ {expiryBillingAlerts.length} Expiring
              </button>
            )}
            {search.trim().length > 0 && filtered.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 500,
                  background: T.card,
                  border: `2px solid ${T.accent}`,
                  borderTop: "none",
                  borderRadius: "0 0 8px 8px",
                  maxHeight: 280,
                  overflowY: "auto",
                  boxShadow: "0 8px 24px rgba(0,0,0,.4)",
                }}
              >
                {filtered.slice(0, 10).map((prod) => (
                  <div
                    key={prod.billingKey || prod.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addToCart(prod);
                      setSearch("");
                      setTimeout(() => barcodeRef.current?.focus(), 50);
                    }}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 14px",
                      cursor: "pointer",
                      borderBottom: `1px solid ${T.border}`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = T.accentDim)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: T.text,
                        }}
                      >
                        {prod.name}
                      </div>
                      <div style={{ fontSize: 11, color: T.muted }}>
                        {prod.brand && (
                          <span style={{ color: T.accent }}>
                            {prod.brand} ·{" "}
                          </span>
                        )}
                        {prod.category} · {prod.unit}
                        {prod.barcode && (
                          <span style={{ marginLeft: 6, fontFamily: "monospace" }}>
                            #{prod.barcode}
                          </span>
                        )}
                        {prod.expiryInfo && prod.expiryInfo.diff <= EXPIRY_ALERT_DAYS && (
                          <span
                            style={{
                              marginLeft: 6,
                              color:
                                prod.expiryInfo.diff <= 0 ? T.red : T.amber,
                            }}
                          >
                            Exp: {expiryLabel(prod.expiryInfo.diff)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        flexShrink: 0,
                        marginLeft: 12,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          color: T.green,
                          fontFamily: "monospace",
                          fontSize: 13,
                        }}
                      >
                        {fmt(prod.price)}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color:
                            prod.stock <= prod.minStock ? T.amber : T.muted,
                        }}
                      >
                        Stock: {prod.stock}
                      </div>
                    </div>
                  </div>
                ))}
                {filtered.length > 10 && (
                  <div
                    style={{
                      padding: "6px 14px",
                      fontSize: 11,
                      color: T.muted,
                      textAlign: "center",
                    }}
                  >
                    +{filtered.length - 10} more — keep typing to narrow down
                  </div>
                )}
              </div>
            )}
          </div>
          <Btn
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setTimeout(() => barcodeRef.current?.focus(), 50);
            }}
          >
            Clear
          </Btn>
          <Btn
            variant="warning"
            size="sm"
            onClick={() => setQuickAdd(true)}
            style={{ whiteSpace: "nowrap" }}
          >
            + Add Product
          </Btn>
          <Btn
            variant="secondary"
            size="sm"
            onClick={holdBill}
            style={{
              whiteSpace: "nowrap",
              background: T.amberDim,
              color: T.amber,
              borderColor: T.amber,
            }}
            title="Hold current bill and start a new one"
          >
            ⏸ Hold
          </Btn>
          <div style={{ position: "relative" }}>
            <Btn
              variant="secondary"
              size="sm"
              onClick={() => setShowHeld((h) => !h)}
              style={{ whiteSpace: "nowrap", position: "relative" }}
            >
              📋 Held{" "}
              {heldBills.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -7,
                    right: -7,
                    background: T.red,
                    color: "#fff",
                    borderRadius: "50%",
                    fontSize: 10,
                    width: 17,
                    height: 17,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  {heldBills.length}
                </span>
              )}
            </Btn>
            {showHeld && (
              <div
                style={{
                  position: "absolute",
                  top: "110%",
                  right: 0,
                  zIndex: 600,
                  background: T.card,
                  border: `2px solid ${T.accent}`,
                  borderRadius: 10,
                  boxShadow: "0 8px 28px rgba(0,0,0,.45)",
                  minWidth: 300,
                  maxWidth: 380,
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    borderBottom: `1px solid ${T.border}`,
                    fontWeight: 700,
                    fontSize: 13,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>⏸ Held Bills</span>
                  <button
                    onClick={() => setShowHeld(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: T.muted,
                      cursor: "pointer",
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
                {heldBills.length === 0 ? (
                  <div
                    style={{
                      padding: "20px 14px",
                      color: T.muted,
                      textAlign: "center",
                      fontSize: 13,
                    }}
                  >
                    No held bills
                  </div>
                ) : (
                  heldBills.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        padding: "10px 14px",
                        borderBottom: `1px solid ${T.border}`,
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: T.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {h.label}
                        </div>
                        <div style={{ fontSize: 11, color: T.muted }}>
                          {h.cart.length} item{h.cart.length !== 1 ? "s" : ""}{" "}
                          · {fmt(h.cart.reduce((s, i) => s + (Number(i.total) || 0), 0))} ·{" "}
                          {h.heldAt}
                        </div>
                      </div>
                      <Btn
                        size="sm"
                        onClick={() => resumeBill(h)}
                        style={{
                          background: T.greenDim,
                          color: T.green,
                          borderColor: T.green,
                          flexShrink: 0,
                        }}
                      >
                        ▶ Resume
                      </Btn>
                      <button
                        onClick={() => dropHeld(h.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: T.red,
                          cursor: "pointer",
                          fontSize: 16,
                          padding: "2px 4px",
                          flexShrink: 0,
                        }}
                        title="Discard"
                      >
                        🗑
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div className="billing-grid">
          {inStockProducts.length === 0 && (
            <div
              style={{
                color: T.muted,
                padding: 40,
                gridColumn: "1/-1",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
              <div>No products. Add stock first.</div>
            </div>
          )}
          {(visibleProducts || []).filter(Boolean).map((prod) => (
            <BillingProductCard
              key={prod.billingKey || prod.id}
              prod={prod}
              onAdd={addProductFromGrid}
            />
          ))}
          {!q && filtered.length > visibleProducts.length && (
            <button
              type="button"
              onClick={() => setShowAllProducts(true)}
              style={{
                gridColumn: "1/-1",
                background: T.surface,
                border: `1px solid ${T.border}`,
                color: T.accent,
                borderRadius: 8,
                padding: "10px 12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Show all {filtered.length} products
            </button>
          )}
        </div>
      </div>

      <div className="billing-checkout">
        <Card
          style={{
            padding: 0,
            flex: "0 0 auto",
            maxHeight: 290,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${T.border}`,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            🛒 Cart{" "}
            <span style={{ color: T.muted, fontWeight: 400, fontSize: 12 }}>
              ({cart.length} items)
            </span>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {cart.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  color: T.muted,
                  fontSize: 13,
                }}
              >
                Click products or scan barcode
              </div>
            ) : (
              cart.map((it) => (
                <div
                  key={it.lineId || it.productId}
                  style={{
                    padding: "8px 14px",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div
                    style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}
                  >
                    {it.name}
                  </div>
                  {it.expiry && (
                    <div
                      style={{
                        fontSize: 10,
                        color: it.expiryDiff <= 0 ? T.red : T.amber,
                        marginBottom: 4,
                      }}
                    >
                      Exp: {expiryLabel(it.expiryDiff)} ({it.expiry})
                      {it.batch ? ` - Batch ${it.batch}` : ""}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <button
                        onClick={() =>
                          updateQty(it.lineId || it.productId, it.qty - 1)
                        }
                        style={{
                          background: T.subtle,
                          border: "none",
                          color: T.text,
                          borderRadius: 4,
                          width: 24,
                          height: 24,
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        −
                      </button>
                      <NumInput
                        value={
                          qtyDrafts[it.lineId || it.productId] ??
                          String(it.qty)
                        }
                        onFocus={() =>
                          setQtyDrafts((d) => ({
                            ...d,
                            [it.lineId || it.productId]: String(it.qty),
                          }))
                        }
                        onChange={(v) => {
                          setQtyDrafts((d) => ({
                            ...d,
                            [it.lineId || it.productId]: v,
                          }));
                          if (v !== "")
                            updateQty(
                              it.lineId || it.productId,
                              Math.max(1, Math.floor(n(v)))
                            );
                        }}
                        onBlur={() =>
                          setQtyDrafts((d) => {
                            const next = { ...d };
                            delete next[it.lineId || it.productId];
                            return next;
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setQtyDrafts((d) => {
                              const next = { ...d };
                              delete next[it.lineId || it.productId];
                              return next;
                            });
                            handleCheckoutEnter(e, "customer");
                          }
                        }}
                        style={{
                          width: 54,
                          textAlign: "center",
                          fontSize: 13,
                          padding: "3px 5px",
                        }}
                      />
                      <button
                        onClick={() =>
                          updateQty(it.lineId || it.productId, it.qty + 1)
                        }
                        style={{
                          background: T.subtle,
                          border: "none",
                          color: T.text,
                          borderRadius: 4,
                          width: 24,
                          height: 24,
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        +
                      </button>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {it.gstPct > 0 && (
                        <div style={{ fontSize: 10, color: T.amber }}>
                          GST {it.gstPct}%
                        </div>
                      )}
                      <span
                        className="mono"
                        style={{ color: T.green, fontWeight: 700 }}
                      >
                        {fmt(it.total)}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        removeFromCart(it.lineId || it.productId)
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: T.red,
                        cursor: "pointer",
                        fontSize: 16,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="checkout-fields">
              <Field label="Customer">
                <Input
                  ref={(el) => (checkoutRefs.current.customer = el)}
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  onKeyDown={(e) => handleCheckoutEnter(e, "phone")}
                  placeholder="Walk-in"
                />
              </Field>
              <Field label="Phone">
                <Input
                  ref={(el) => (checkoutRefs.current.phone = el)}
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onKeyDown={(e) => handleCheckoutEnter(e, "discount")}
                  placeholder="Mobile"
                />
              </Field>
              {isRealCustomer(customer, phone) && (
                <div
                  style={{
                    gridColumn: "1/-1",
                    background: T.purpleDim,
                    border: `1px solid ${T.purple}44`,
                    borderRadius: 8,
                    padding: "7px 10px",
                    fontSize: 12,
                    color: T.purple,
                    fontWeight: 700,
                  }}
                >
                  Points: {customerPointsBefore} +{" "}
                  {calcPointsForAmount(total, pointsRule)} on this bill{" "}
                  {customerPointsBefore +
                    calcPointsForAmount(total, pointsRule) >=
                  pointsRule.giftAt
                    ? `- Gift eligible: ${pointsRule.giftName}`
                    : ""}
                </div>
              )}
              {customerSalesByPhone.length > 0 && (
                <div
                  style={{
                    gridColumn: "1/-1",
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: "9px 10px",
                    fontSize: 12,
                    color: T.muted,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <b
                      className="truncate-text"
                      style={{ color: T.text, fontSize: 13 }}
                    >
                      {latestCustomerSale.customer}
                    </b>
                    <span
                      className="mono"
                      style={{ color: T.accent, flexShrink: 0 }}
                    >
                      {latestCustomerSale.phone || phone}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                      gap: 6,
                    }}
                  >
                    <span>
                      Bills:{" "}
                      <b style={{ color: T.text }}>
                        {customerSalesByPhone.length}
                      </b>
                    </span>
                    <span>
                      Spent:{" "}
                      <b className="mono" style={{ color: T.green }}>
                        {fmt(customerHistorySummary.total)}
                      </b>
                    </span>
                    <span>
                      Items:{" "}
                      <b style={{ color: T.text }}>
                        {customerHistorySummary.items}
                      </b>
                    </span>
                  </div>
                  <div>
                    Last visit:{" "}
                    <b style={{ color: T.text }}>{latestCustomerSale.date}</b>
                  </div>
                </div>
              )}
              <Field label="Discount" style={{ gridColumn: "1/-1" }}>
                <div
                  style={{ display: "flex", gap: 6, alignItems: "center" }}
                >
                  <button
                    type="button"
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
                    type="button"
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
                    ref={(el) => (checkoutRefs.current.discount = el)}
                    value={discount}
                    onChange={setDiscount}
                    onKeyDown={(e) =>
                      handleCheckoutEnter(e, "payMode-0")
                    }
                    placeholder={discountType === "percent" ? "0-100" : "0"}
                    style={{ flex: 1 }}
                  />

                  <span
                    style={{
                      color: T.muted,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {discountType === "percent" ? "%" : "₹"}
                  </span>
                </div>
              </Field>

              <div style={{ gridColumn: "1/-1", display: "flex", flexDirection: "column", gap: 8, background: T.surface, padding: "12px", borderRadius: 10, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Smart Round-Off Options</span>
                  {roundOffMode !== "none" && (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: computedRoundOff >= 0 ? T.green : T.amber }} className="mono">
                      {computedRoundOff >= 0 ? `+${fmt(computedRoundOff)}` : `-${fmt(Math.abs(computedRoundOff))}`}
                    </span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {[
                    { id: "none", label: "No Round Off" },
                    { id: "nearest10", label: "Nearest ₹10" },
                    { id: "nearest100", label: "Nearest ₹100" },
                    { id: "roundup10", label: "Round Up ₹10" },
                  ].map((opt) => {
                    const active = roundOffMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRoundOffMode(opt.id)}
                        style={{
                          padding: "8px 4px",
                          fontSize: 11,
                          fontWeight: active ? 700 : 500,
                          borderRadius: 7,
                          border: active ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                          background: active ? `${T.accent}22` : T.bg,
                          color: active ? T.accent : T.muted,
                          cursor: "pointer",
                          transition: "all .15s ease",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          boxShadow: active ? `0 0 10px ${T.accent}33` : "none",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {roundOffMode !== "none" && (
                  <div style={{ fontSize: 11.5, display: "flex", alignItems: "center", justifyContent: "center", background: `${T.accent}14`, padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.accent}33` }}>
                    <span style={{ color: T.muted }}>
                      Calculation: <strong style={{ color: T.text }}>{fmt(baseTotal)}</strong> → <strong style={{ color: computedRoundOff >= 0 ? T.green : T.amber }}>{computedRoundOff >= 0 ? `+${fmt(computedRoundOff)}` : `-${fmt(Math.abs(computedRoundOff))}`}</strong> → <strong style={{ color: T.accent, fontSize: 13 }}>{fmt(total)}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div
              style={{
                background: T.surface,
                borderRadius: 8,
                padding: 10,
                fontSize: 13,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: T.muted }}>Subtotal</span>
                <span className="mono">{fmt(subtotal)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: T.amber }}>GST (incl.)</span>
                <span className="mono">{fmt(totalGST)}</span>
              </div>
              {discountAmt > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: T.green }}>
                    Discount
                    {discountType === "percent"
                      ? ` (${Math.min(n(discount), 100)}%)`
                      : " (₹"}
                    {discountType === "amount" ? ")" : ""}
                  </span>
                  <span className="mono">−{fmt(discountAmt)}</span>
                </div>
              )}
              {roundOff !== 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{ color: roundOff > 0 ? T.amber : T.green }}
                  >
                    Round off
                  </span>
                  <span
                    className="mono"
                    style={{ color: roundOff > 0 ? T.amber : T.green }}
                  >
                    {roundOff > 0 ? "+" : "-"}
                    {fmt(Math.abs(roundOff))}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 800,
                  fontSize: 17,
                  color: T.green,
                  marginTop: 4,
                  borderTop: `1px solid ${T.border}`,
                  paddingTop: 8,
                }}
              >
                <span>TOTAL</span>
                <span className="mono">{fmt(total)}</span>
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.muted,
                letterSpacing: ".07em",
                textTransform: "uppercase",
              }}
            >
              Payment
            </div>
            {roundedPaymentOptions.length > 0 && (
              <div className="rounding-options">
                {roundedPaymentOptions.map(([label, amount, hint], idx) => (
                  <button
                    key={`${label}-${amount}`}
                    data-recommended={idx === 0}
                    title={hint}
                    type="button"
                    onClick={() => applyRoundedPayment(amount)}
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      color: T.text,
                      borderRadius: 6,
                      padding: "4px 7px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {label}: {fmt(amount)}
                  </button>
                ))}
              </div>
            )}
            {payments.map((p, i) => (
              <div key={i} className="payment-row">
                <Select
                  ref={(el) => (checkoutRefs.current[`payMode-${i}`] = el)}
                  value={p.mode}
                  onChange={(e) => updatePay(i, "mode", e.target.value)}
                  onKeyDown={(e) =>
                    handleCheckoutEnter(e, `payAmount-${i}`)
                  }
                >
                  {["Cash", "UPI", "Card"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Select>
                <NumInput
                  ref={(el) => (checkoutRefs.current[`payAmount-${i}`] = el)}
                  placeholder="Amount ₹"
                  value={p.amount}
                  onChange={(v) => updatePay(i, "amount", v)}
                  onKeyDown={(e) =>
                    handleCheckoutEnter(
                      e,
                      payments[i + 1] ? `payMode-${i + 1}` : "bill"
                    )
                  }
                />
                <button
                  title="Fill remainder"
                  onClick={() => fillRem(i)}
                  style={{
                    background: T.accentDim,
                    border: "none",
                    color: T.accent,
                    borderRadius: 6,
                    padding: "6px 9px",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  ⇥
                </button>
                {payments.length > 1 && (
                  <button
                    onClick={() => removePayRow(i)}
                    style={{
                      background: "none",
                      border: "none",
                      color: T.red,
                      cursor: "pointer",
                      fontSize: 16,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <Btn
              variant="ghost"
              size="sm"
              onClick={addPayRow}
              style={{ alignSelf: "flex-start" }}
            >
              + Split Payment
            </Btn>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <span style={{ color: T.muted }}>
                Collected: <b className="mono">{fmt(totalPaid)}</b>
              </span>
              {change >= 0 ? (
                <span style={{ color: T.accent }}>
                  Change: <b className="mono">{fmt(change)}</b>
                </span>
              ) : (
                <span style={{ color: T.red }}>
                  Short: <b className="mono">{fmt(-change)}</b>
                </span>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 4,
              }}
            >
              <Btn
                ref={(el) => (checkoutRefs.current.bill = el)}
                onClick={() => generateBill(false)}
                disabled={!hasCartItems}
                size="lg"
                style={{ width: "100%" }}
              >
                Generate
              </Btn>
              <Btn
                onClick={() => generateBill(true)}
                disabled={!hasCartItems}
                size="lg"
                variant="success"
                style={{ width: "100%" }}
              >
                Print
              </Btn>
            </div>
          </div>
        </Card>
      </div>
      {quickAdd && (
        <Modal
          title="⚡ Quick Add Product"
          onClose={() => {
            setQuickAdd(false);
            setTimeout(() => barcodeRef.current?.focus(), 100);
          }}
        >
          <QuickAddForm
            onSave={(prod) => {
              setProducts((ps) => {
                const existing = ps.find(
                  (p) =>
                    p.name.trim().toLowerCase() ===
                    prod.name.trim().toLowerCase()
                );

                if (existing) {
                  return ps.map((p) =>
                    p.id === existing.id
                      ? {
                          ...p,
                          stock: Number(p.stock || 0) + Number(prod.stock || 0),
                        }
                      : p
                  );
                }

                return [...ps, prod];
              });
              setQuickAdd(false);
              setTimeout(() => {
                addToCart(prod);
                barcodeRef.current?.focus();
              }, 100);
            }}
            onClose={() => {
              setQuickAdd(false);
              setTimeout(() => barcodeRef.current?.focus(), 100);
            }}
          />
        </Modal>
      )}

      {showExpiryModal && (
        <Modal
          title={`⚠️ Near Expiry Products (${expiryBillingAlerts.length})`}
          onClose={() => setShowExpiryModal(false)}
          width={540}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 12, color: T.muted }}>
              The following products in stock are nearing their expiration date (within {EXPIRY_ALERT_DAYS} days):
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 340,
                overflowY: "auto",
              }}
            >
              {expiryBillingAlerts.map((p) => (
                <div
                  key={p.billingKey || p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>
                      Batch: {p.expiryInfo?.batch || "Default"} | Expiry:{" "}
                      <b>{p.expiryInfo?.expiry}</b>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: (p.expiryInfo?.diff ?? 0) <= 0 ? T.red : T.amber,
                        background:
                          (p.expiryInfo?.diff ?? 0) <= 0 ? T.redDim : T.amberDim,
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {expiryLabel(p.expiryInfo?.diff)}
                    </span>
                    <Btn
                      size="sm"
                      variant="warning"
                      onClick={() => {
                        addToCart(p);
                        setShowExpiryModal(false);
                      }}
                    >
                      + Add
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" onClick={() => setShowExpiryModal(false)}>
                Close
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Billing;
