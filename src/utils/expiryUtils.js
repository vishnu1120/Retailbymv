import { MS_DAY } from "../constants/config";
import { clean, today, n } from "./formatters";

export const daysUntilDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date(today());
  return Math.ceil((d - t) / MS_DAY);
};

export const expiryLabel = (diff) =>
  diff == null
    ? ""
    : diff < 0
    ? "Expired"
    : diff === 0
    ? "Today"
    : diff === 1
    ? "Tomorrow"
    : `${diff}d`;

export const arrivalItemMatchesProduct = (it, product) => {
  if (!it || !product) return false;
  return (
    String(it.productId) === String(product.id) ||
    (clean(product.barcode) && clean(it.barcode) === clean(product.barcode)) ||
    (clean(product.id) && clean(it.ncode) === clean(product.id))
  );
};

export const findArrivalProduct = (products, it) =>
  (products || []).find((p) => arrivalItemMatchesProduct(it, p));

export const getArrivalProductName = (products, it) =>
  findArrivalProduct(products, it)?.name || clean(it?.name) || "Product";

export const getProductExpiryRows = (arrivals, product) => {
  const seen = new Set();
  return (arrivals || [])
    .flatMap((a) =>
      (a.items || [])
        .filter((it) => it.expiry && arrivalItemMatchesProduct(it, product))
        .map((it) => {
          const diff = daysUntilDate(it.expiry);
          if (diff == null) return null;
          const key = `${product?.id || ""}|${it.expiry}|${it.batch || ""}`;
          if (seen.has(key)) return null;
          seen.add(key);
          return {
            expiry: it.expiry,
            diff,
            arrId: a.id,
            batch: it.batch || "",
            qty: n(it.qty) + n(it.free),
          };
        })
        .filter(Boolean)
    )
    .sort((a, b) => a.diff - b.diff);
};

export const getProductExpiryInfo = (arrivals, product) =>
  getProductExpiryRows(arrivals, product)[0] || null;
