export async function printGSTInvoice(inv, shopConfig) {
  const items = inv.items || [];
  const totalQty = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const payStr = (inv.payments || [])
    .map((p) => `${p.mode} [${p.mode === "UPI" ? "Paytm/GPay" : p.mode}]`)
    .join(", ");
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = inv.date
    ? inv.date.split("-").reverse().join("/")
    : now.toLocaleDateString("en-IN");

  // GST breakdown (only if any item has GST)
  const hasGST = items.some((i) => (i.gstPct || 0) > 0);
  const gstGroups = hasGST
    ? [...new Set(items.map((i) => i.gstPct || 0))]
        .map((pct) => {
          const g = items.filter((i) => (i.gstPct || 0) === pct);
          const taxable = g.reduce((s, i) => s + (Number(i.total) || 0) / (1 + pct / 100), 0);
          const gstAmt = g.reduce((s, i) => {
            const total = Number(i.total) || 0;
            return s + (total - total / (1 + pct / 100));
          }, 0);
          return { pct, taxable, cgst: gstAmt / 2, sgst: gstAmt / 2 };
        })
        .filter((g) => g.pct > 0)
    : [];

  const html = `<!DOCTYPE html><html><head>
  <meta charset="utf-8"/>
  <title>Bill ${inv.id}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{margin:0;padding:0;background:#fff}
    body{
      font-family:'Courier New',Courier,monospace;
      font-size:11px;
      line-height:1.25;
      color:#000;
      width:80mm;
      padding:2mm 4mm 2mm 5mm;
      overflow:hidden;
    }
    .center{text-align:center}
    .right{text-align:right}
    .bold{font-weight:bold}
    .lg{font-size:14px;font-weight:bold}
    .md{font-size:12px;font-weight:bold}
    .sm{font-size:10px}
    .xs{font-size:9px}
    .line{border-top:1px dashed #000;margin:4px 0}
    .dline{border-top:2px solid #000;margin:4px 0}
    .row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:4px;
  padding:2px 0;
}
    .row span:first-child{flex:1 1 auto;min-width:0}
    .row span:last-child{flex:0 0 auto;text-align:right;max-width:42mm;word-break:break-word}
    .item-row{display:grid;grid-template-columns:1fr auto auto auto;gap:2px;padding:2px 0;font-size:11px}
    .item-name{grid-column:1/-1;font-weight:bold}
    .grand{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:6px;
  font-size:15px;
  font-weight:bold;
  padding:4px 0;
}
  table{
  width:100%;
  border-collapse:collapse;
  table-layout:fixed;
  margin-top:4px;
}

th,td{
  border:1px solid #000;
  padding:2px;
  font-size:9px;
  line-height:1.15;
  vertical-align:top;
  overflow-wrap:anywhere;
  word-break:break-word;
}

th{
  background:#f5f5f5;
  font-weight:bold;
}
    .tr{text-align:right}
    @media print{
      body{width:80mm;margin:0;padding:2mm 4mm 2mm 5mm}
      @page{margin:0;size:80mm auto}
    }
  </style>
  </head><body>

  <div class="center">
    <div class="lg">${shopConfig.shopName || "RETAIL SHOP"}</div>
    ${shopConfig.address ? `<div class="sm">${shopConfig.address}</div>` : ""}
    ${shopConfig.phone ? `<div class="sm">${shopConfig.phone}</div>` : ""}
    ${shopConfig.gstNumber ? `<div class="sm">GSTIN - ${shopConfig.gstNumber}</div>` : ""}
    ${shopConfig.fssai ? `<div class="sm">fssai - ${shopConfig.fssai}</div>` : ""}
  </div>

  <div class="dline"></div>

  <div class="row">
  <span>Customer Name</span>
  <span>${inv.customer || "Walk-in"}</span>
</div>
  ${inv.phone ? `<div class="row sm"><span>Phone</span><span>${inv.phone}</span></div>` : ""}

  <div class="line"></div>

<div class="row sm">
  <span>Date</span>
  <span>${dateStr}</span>
</div>

<div class="row sm">
  <span>Time</span>
  <span>${timeStr}</span>
</div>

<div class="row sm">
  <span>Bill No</span>
  <span>${inv.id}</span>
</div>

  <div class="dline"></div>

  <table style="width:100%;border-collapse:collapse;margin-top:4px;table-layout:fixed">
  <colgroup>
    <col style="width:9%">
    <col style="width:43%">
    <col style="width:10%">
    <col style="width:18%">
    <col style="width:20%">
  </colgroup>
  <thead>
    <tr>
      <th style="border:1px solid #000">S.No</th>
      <th style="border:1px solid #000">Products</th>
      <th style="border:1px solid #000">Qty</th>
      <th style="border:1px solid #000">Rate</th>
      <th style="border:1px solid #000">Amount</th>
    </tr>
  </thead>

  <tbody>
    ${items
      .map(
        (it, index) => `
      <tr>
        <td style="text-align:center">${index + 1}</td>
        <td>${it.name}</td>
        <td style="text-align:center">${it.qty}</td>
        <td style="text-align:right">${(Number(it.price) || 0).toFixed(2)}</td>
        <td style="text-align:right">${(Number(it.total) || 0).toFixed(2)}</td>
      </tr>
    `
      )
      .join("")}
  </tbody>
</table>

  <div class="line"></div>

  <div class="row sm bold">
    <span>Total Qty: ${totalQty}</span>
    <span>Sub Total &nbsp; ${(Number(inv.subtotal) || 0).toFixed(2)}</span>
  </div>

  ${
    inv.discount > 0
      ? `<div class="row sm bold" style="margin:2px 0"><span>You Saved</span><span>₹${(Number(inv.discount) || 0).toFixed(
          2
        )}</span></div>`
      : ""
  }

  ${
    hasGST
      ? `
  <div class="line"></div>
  <div class="xs center" style="margin-bottom:2px">GST Summary</div>
  <table><colgroup><col style="width:16%"><col style="width:28%"><col style="width:28%"><col style="width:28%"></colgroup><thead><tr><th>Rate</th><th class="tr">Taxable</th><th class="tr">CGST</th><th class="tr">SGST</th></tr></thead>
  <tbody>${gstGroups
    .map(
      (g) => `<tr>
    <td>${g.pct}%</td>
    <td class="tr">${g.taxable.toFixed(2)}</td>
    <td class="tr">${g.cgst.toFixed(2)}</td>
    <td class="tr">${g.sgst.toFixed(2)}</td>
  </tr>`
    )
    .join("")}</tbody></table>`
      : ""
  }
  <div class="dline"></div>

<div class="row">
  <span>Total Items</span>
  <span>${items.length}</span>
</div>

<div class="row">
  <span>Total Qty</span>
  <span>${totalQty}</span>
</div>

<div class="row">
  <span>Sub Total</span>
  <span>₹${(Number(inv.subtotal) || 0).toFixed(2)}</span>
</div>

${
  inv.discount > 0
    ? `
<div class="row bold">
  <span>You Saved</span>
  <span>₹${(Number(inv.discount) || 0).toFixed(2)}</span>
</div>
`
    : ""
}

${
  inv.roundOff !== undefined && Math.abs(Number(inv.roundOff) || 0) >= 0.01
    ? `
<div class="row">
  <span>Round Off (${inv.roundOffLabel || "Round Off"})</span>
  <span>${(Number(inv.roundOff) || 0) >= 0 ? "+" : "-"} ₹${Math.abs(Number(inv.roundOff) || 0).toFixed(2)}</span>
</div>
`
    : ""
}

<div class="dline"></div>

<div class="grand">
  <span>NET AMOUNT</span>
  <span>₹${(Number(inv.total) || 0).toFixed(2)}</span>
</div>

<div class="dline"></div>

<div class="row">
  <span>Payment Mode</span>
  <span>${payStr}</span>
</div>

${
  (Number(inv.change) || 0) > 0
    ? `
<div class="row">
  <span>Change Returned</span>
  <span>₹${(Number(inv.change) || 0).toFixed(2)}</span>
</div>
`
    : ""
}

<div class="dline"></div>

<div class="center xs" style="margin-top:6px">
  <b>GOODS ONCE SOLD CANNOT BE RETURNED</b>
</div>

<div class="center xs" style="margin-top:4px">
  Live Animals - No Guarantee
</div>

<div class="center xs" style="margin-top:8px">
  THANK YOU
</div>

<div class="center xs">
  VISIT AGAIN
</div>

<div class="center xs" style="margin-top:6px">
  For ${shopConfig.shopName || "RETAIL SHOP"}
</div>

  </body></html>`;

  if (window.electronAPI && typeof window.electronAPI.printInvoice === "function") {
    await window.electronAPI.printInvoice(html);
    return;
  }

  const win = window.open("", "_blank", "width=400,height=800");
  if (!win) {
    throw new Error("The print window was blocked. Please allow pop-ups for this app.");
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 400);
}
