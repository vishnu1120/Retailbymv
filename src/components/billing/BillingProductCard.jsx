import React from "react";
import { T } from "../../constants/theme";
import { fmt } from "../../utils/formatters";
import { expiryLabel } from "../../utils/expiryUtils";

export const BillingProductCard = React.memo(function BillingProductCard({
  prod,
  onAdd,
}) {
  if (!prod) return null;
  return (
    <div className="billing-product-card" onClick={() => onAdd && onAdd(prod)}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
        {prod.name}
      </div>
      <div style={{ color: T.muted, fontSize: 11 }}>
        {prod.category} · {prod.unit}
      </div>
      {prod.expiryInfo && prod.expiryInfo.diff <= 30 && (
        <div
          style={{
            color: prod.expiryInfo.diff <= 0 ? T.red : T.amber,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          Exp: {expiryLabel(prod.expiryInfo.diff)} ({prod.expiryInfo.expiry})
          {prod.expiryInfo.batch ? ` · Batch ${prod.expiryInfo.batch}` : ""}
        </div>
      )}
      {prod.gstPct > 0 && (
        <div style={{ color: T.amber, fontSize: 10 }}>GST: {prod.gstPct}%</div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          alignItems: "center",
        }}
      >
        <span
          className="mono"
          style={{ color: T.green, fontWeight: 700, fontSize: 14 }}
        >
          {fmt(prod.price)}
        </span>
        <span
          style={{
            fontSize: 11,
            color: prod.stock <= prod.minStock ? T.amber : T.muted,
          }}
        >
          Qty:{prod.stock}
        </span>
      </div>
    </div>
  );
});

export default BillingProductCard;
