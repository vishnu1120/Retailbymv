export const n = (val) => Number(val) || 0;

export const fmt = (nVal) =>
  `₹${Number(nVal || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export const monthKey = (date) => date?.slice(0, 7) || "";

export const clean = (v) => String(v ?? "").trim();

export const lower = (v) => clean(v).toLowerCase();

export const phoneDigits = (v) => clean(v).replace(/\D/g, "");

export const matchProductSearch = (p, rawQuery) => {
  if (!rawQuery) return true;
  const qClean = String(rawQuery).trim().toLowerCase();
  if (!qClean) return true;

  const tokens = qClean.split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;

  const name = String(p.name || "").toLowerCase();
  const brand = String(p.brand || "").toLowerCase();
  const category = String(p.category || "").toLowerCase();
  const barcode = String(p.barcode || "").toLowerCase();
  const id = String(p.id || "").toLowerCase();
  const ncode = String(p.ncode || p.itemCode || "").toLowerCase();
  const unit = String(p.unit || "").toLowerCase();

  const searchableText = `${name} ${brand} ${category} ${barcode} ${id} ${ncode} ${unit}`;

  return tokens.every((token) => searchableText.includes(token));
};
