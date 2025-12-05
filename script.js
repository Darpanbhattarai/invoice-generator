/* index page logic — builds preview HTML and opens new tab for printing (Option A, no html2canvas) */

/* Helpers */
function q(sel, root = document) {
  return root.querySelector(sel);
}
function qa(sel, root = document) {
  return Array.from((root || document).querySelectorAll(sel));
}
function fmt(v) {
  return Number(v || 0).toFixed(2);
}
function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* default date */
q("#invoice_date").valueAsDate = new Date();

/* Table handling */
const itemsBody = q("#items_body"),
  rowsCount = q("#rows_count");

function addRow(data = {}) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input class="row-date" type="text" value="${
      data.date || ""
    }" placeholder="14/11/2025"></td>
    <td><input class="row-day" type="text" value="${
      data.day || ""
    }" placeholder="Friday"></td>
    <td><input class="row-part" type="text" value="${esc(
      data.participant || ""
    )}" placeholder="Participant"></td>
    <td><input class="row-start" type="text" value="${
      data.start || ""
    }" placeholder="4:35pm / 16:30"></td>
    <td><input class="row-end" type="text" value="${
      data.end || ""
    }" placeholder="10:00pm"></td>
    <td><input class="row-hours" type="number" step="0.25" value="${
      data.hours || ""
    }" min="0"></td>
    <td><input class="row-km" type="number" step="0.1" value="${
      data.km || ""
    }" min="0"></td>
    <td>
      <select class="row-rate-type">
        <option value="">Auto</option>
        <option value="ordinary">Ordinary</option>
        <option value="afternoon">Afternoon</option>
        <option value="saturday">Saturday</option>
        <option value="sunday">Sunday</option>
      </select>
    </td>
    <td class="row-line-total">$0.00</td>
    <td><button class="btn ghost remove">✕</button></td>
  `;
  itemsBody.appendChild(tr);
  rowsCount.textContent = itemsBody.querySelectorAll("tr").length;
  qa("input,select", tr).forEach((el) =>
    el.addEventListener("input", updateAll)
  );
  tr.querySelector(".remove").addEventListener("click", () => {
    tr.remove();
    rowsCount.textContent = itemsBody.querySelectorAll("tr").length;
    updateAll();
  });
  if (data.rateType) tr.querySelector(".row-rate-type").value = data.rateType;
  updateAll();
  return tr;
}

/* Demo rows */
const demo = [
  {
    date: "14/11/2025",
    day: "Friday",
    participant: "Sehal Rana",
    start: "4:35pm",
    end: "10:00pm",
    hours: 5.25,
    km: "",
  },
  {
    date: "15/11/2025",
    day: "Saturday",
    participant: "Shady Omerie",
    start: "10:00am",
    end: "1:00pm",
    hours: 3,
    km: 10,
  },
  {
    date: "17/11/2025",
    day: "Monday",
    participant: "Vicki Kelly",
    start: "10:30am",
    end: "1:30pm",
    hours: 3,
    km: 9,
  },
  {
    date: "17/11/2025",
    day: "Monday",
    participant: "Kosta Vlahakis",
    start: "2:30pm",
    end: "6:00pm",
    hours: 3.5,
    km: "",
  },
  {
    date: "18/11/2025",
    day: "Tuesday",
    participant: "Nathan Farrely",
    start: "11:00am",
    end: "2:00pm",
    hours: 3,
    km: 51,
  },
];
demo.forEach((r) => addRow(r));

/* Buttons */
q("#add_row").addEventListener("click", () => addRow({}));
q("#clear_table").addEventListener("click", () => {
  if (!confirm("Clear all rows?")) return;
  itemsBody.innerHTML = "";
  rowsCount.textContent = 0;
  updateAll();
});

/* parse times */
function parseTime(text) {
  if (!text) return null;
  const t = text.trim().toLowerCase();
  let m;
  if ((m = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/))) {
    let hh = +m[1],
      mm = +m[2],
      ap = m[3];
    if (ap) {
      if (ap === "pm" && hh < 12) hh += 12;
      if (ap === "am" && hh === 12) hh = 0;
    }
    return { h: hh, m: mm };
  }
  if ((m = t.match(/^(\d{1,2})\s*(am|pm)$/))) {
    let hh = +m[1],
      ap = m[2];
    if (ap === "pm" && hh < 12) hh += 12;
    if (ap === "am" && hh === 12) hh = 0;
    return { h: hh, m: 0 };
  }
  if ((m = t.match(/^(\d{1,2}):(\d{2})$/))) {
    return { h: +m[1], m: +m[2] };
  }
  return null;
}

/* rate detection */
function detectRateType(dayText, startText) {
  if (!dayText) return "ordinary";
  const d = dayText.trim().toLowerCase();
  if (d.startsWith("sun") || d.includes("sunday")) return "sunday";
  if (d.startsWith("sat") || d.includes("saturday")) return "saturday";
  const t = parseTime(startText);
  if (t && t.h >= 15) return "afternoon";
  return "ordinary";
}

/* calculations */
function updateAll() {
  const rates = {
    ordinary: Number(q("#rate_ordinary").value || 0),
    afternoon: Number(q("#rate_afternoon").value || 0),
    saturday: Number(q("#rate_saturday").value || 0),
    sunday: Number(q("#rate_sunday").value || 0),
  };
  let ord = 0,
    aft = 0,
    sat = 0,
    sun = 0,
    totalKm = 0,
    gross = 0;
  const rows = itemsBody.querySelectorAll("tr");
  rows.forEach((r) => {
    const hours = Number(r.querySelector(".row-hours").value || 0);
    const km = Number(r.querySelector(".row-km").value || 0);
    const dayText = r.querySelector(".row-day").value || "";
    const startText = r.querySelector(".row-start").value || "";
    let rateType = r.querySelector(".row-rate-type").value || "";
    if (!rateType) rateType = detectRateType(dayText, startText);
    const rate = rates[rateType] || rates.ordinary || 0;
    const line = hours * rate;
    r.querySelector(".row-line-total").textContent = "$" + fmt(line);
    gross += line;
    totalKm += km;
    if (rateType === "ordinary") ord += hours;
    if (rateType === "afternoon") aft += hours;
    if (rateType === "saturday") sat += hours;
    if (rateType === "sunday") sun += hours;
  });

  const travel = Number(q("#travel_total").value || 0);
  const reimb = Number(q("#reimb_total").value || 0);
  const gstOn = q("#gst_toggle").checked;
  const gstRate = gstOn ? 0.1 : 0;
  const subtotal = gross + travel + reimb;
  const gstAmount = subtotal * gstRate;
  const totalWithGst = subtotal + gstAmount;
  const superRate = Number(q("#super_rate").value || 0);
  const superContribution = gross * (superRate / 100);
  const bankPayable = totalWithGst - superContribution;

  window._calc = {
    ord,
    aft,
    sat,
    sun,
    totalKm,
    gross,
    travel,
    reimb,
    subtotal,
    gstAmount,
    totalWithGst,
    superRate,
    superContribution,
    bankPayable,
  };
}

/* watch inputs */
[
  "#rate_ordinary",
  "#rate_afternoon",
  "#rate_saturday",
  "#rate_sunday",
  "#travel_total",
  "#reimb_total",
  "#super_rate",
  "#gst_toggle",
].forEach((id) => q(id).addEventListener("input", updateAll));
updateAll();

/* build preview HTML (no external scripts for PDF) */
function buildInvoiceHTML(template, accent, fontFamily) {
  updateAll();
  const c = window._calc || {};
  const invoiceNumber = esc(q("#invoice_number").value);
  const invoiceDate = esc(q("#invoice_date").value);
  const servicePeriod = esc(q("#service_period").value);
  const billCompany = esc(q("#bill_company").value);
  const billAbn = esc(q("#bill_abn").value);
  const contrName = esc(q("#contr_name").value);
  const contrAddress = esc(q("#contr_address").value);
  const contrPhone = esc(q("#contr_phone").value);
  const contrAbn = esc(q("#contr_abn").value);
  const superName = esc(q("#super_name").value);
  const superAcc = esc(q("#super_acc").value);
  const bankName = esc(q("#bank_name").value);
  const bankAcname = esc(q("#bank_acname").value);
  const bankBsb = esc(q("#bank_bsb").value);
  const bankAcc = esc(q("#bank_acc").value);
  const gstOn = q("#gst_toggle").checked;

  let itemsHtml = "";
  itemsBody.querySelectorAll("tr").forEach((r) => {
    const date = esc(r.querySelector(".row-date").value || "");
    const day = esc(r.querySelector(".row-day").value || "");
    const participant = esc(r.querySelector(".row-part").value || "");
    const start = esc(r.querySelector(".row-start").value || "");
    const end = esc(r.querySelector(".row-end").value || "");
    const hours = Number(r.querySelector(".row-hours").value || 0);
    const km = esc(r.querySelector(".row-km").value || "");
    itemsHtml += `<tr>
      <td style="padding:8px 6px;border-bottom:1px solid #eee">${date}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee">${day}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee">${participant}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee">${start}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee">${end}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center">${fmt(
        hours
      )}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center">${km}</td>
    </tr>`;
  });

  /* base + template styles (kept inside preview to avoid parent overrides) */
  const baseStyle = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Poppins:wght@300;400;600;700&family=Roboto:wght@300;400;500;700&family=Montserrat:wght@300;400;600;700&family=Open+Sans:wght@300;400;600&display=swap');
    body{font-family:${fontFamily};color:#222;margin:28px;}
    .company-title{font-weight:700;font-size:20px}
    .meta{font-size:13px;color:#333}
    .small{font-size:12px;color:#666}
    table{width:100%;border-collapse:collapse}
    th{font-weight:700;padding:8px 6px;border-bottom:1px solid #ddd}
    .right{text-align:right}
    .accent{color:${accent}}
    .totals{width:360px;margin-left:auto;margin-top:18px}
    .totals td{padding:6px}
    /* hide UI controls when printing */
    @media print { button, .no-print { display:none !important; } }
  `;

  const templates = {
    classic: `
      ${baseStyle}
      header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
      .company-title{font-size:20px}
    `,
    modern: `
      ${baseStyle}
      body{background:#f6f8fb}
      .card{background:#fff;padding:18px;border-radius:8px;box-shadow:0 10px 30px rgba(10,20,40,0.06)}
      header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
      .company-title{font-size:22px;color:${accent}}
    `,
    minimal: `
      ${baseStyle}
      body{background:#fff}
      header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
      .company-title{font-weight:400;letter-spacing:2px}
      th,td{padding:10px}
    `,
    boxed: `
      ${baseStyle}
      .boxed{border:1px solid #e8e8e8;padding:16px;border-radius:8px}
      header{display:flex;justify-content:space-between}
    `,
    ndis: `
      ${baseStyle}
      header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
      .ndis-note{border-left:4px solid ${accent};padding-left:10px;margin-top:8px;background:#fafafa;padding:8px}
    `,
    dark: `
      ${baseStyle}
      body{background:#0f1113;color:#eaeaea}
      th,td{color:#eaeaea}
      th{border-bottom:1px solid rgba(255,255,255,0.06)}
      td{border-bottom:1px solid rgba(255,255,255,0.03)}
    `,
    compact: `
      ${baseStyle}
      body{margin:12px;font-size:13px}
      th,td{padding:6px}
      .totals{width:320px}
    `,
  };

  const tpl = templates[template] || templates.classic;

  const totalRowsHtml = `
    <tr><td>Ordinary Hours (${fmt(c.ord)} * ${fmt(
    Number(q("#rate_ordinary").value || 0)
  )})</td><td class="right">$${fmt(
    c.ord * Number(q("#rate_ordinary").value || 0)
  )}</td></tr>
    <tr><td>Afternoon Hours (${fmt(c.aft)} * ${fmt(
    Number(q("#rate_afternoon").value || 0)
  )})</td><td class="right">$${fmt(
    c.aft * Number(q("#rate_afternoon").value || 0)
  )}</td></tr>
    <tr><td>Saturday (${fmt(c.sat)} * ${fmt(
    Number(q("#rate_saturday").value || 0)
  )})</td><td class="right">$${fmt(
    c.sat * Number(q("#rate_saturday").value || 0)
  )}</td></tr>
    <tr><td>Sunday (${fmt(c.sun)} * ${fmt(
    Number(q("#rate_sunday").value || 0)
  )})</td><td class="right">$${fmt(
    c.sun * Number(q("#rate_sunday").value || 0)
  )}</td></tr>
    <tr><td>Travels</td><td class="right">$${fmt(c.travel)}</td></tr>
    <tr><td>Reimbursement</td><td class="right">$${fmt(c.reimb)}</td></tr>
    <tr style="font-weight:700"><td>Subtotal</td><td class="right">$${fmt(
      c.subtotal
    )}</td></tr>
    ${
      gstOn
        ? `<tr><td>GST (10%)</td><td class="right">$${fmt(
            c.gstAmount
          )}</td></tr>`
        : ""
    }
    <tr><td>Super Rate (%)</td><td class="right">${fmt(c.superRate)}%</td></tr>
    <tr><td>Super Contribution</td><td class="right">$${fmt(
      c.superContribution
    )}</td></tr>
    <tr style="font-weight:700"><td>Bank Payable Amount</td><td class="right">$${fmt(
      c.bankPayable
    )}</td></tr>
  `;

  const headerHtml = `
    <header>
      <div>
        <div class="company-title">INVOICE</div>
        <div class="meta">Invoice Number: <strong>${invoiceNumber}</strong></div>
        <div class="meta">Invoice Date: <strong>${invoiceDate}</strong></div>
        <div class="meta">Service Period: <strong>${servicePeriod}</strong></div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">BILL TO:</div>
        <div class="meta"><strong>${billCompany}</strong></div>
        <div class="meta">ABN: ${billAbn}</div>
      </div>
    </header>
  `;

  const html = `<!doctype html>
  <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Invoice Preview - ${invoiceNumber}</title>
    <style>${tpl}</style>
  </head>
  <body>
    ${headerHtml}
    <section style="margin-top:12px;display:flex;gap:18px;">
      <div style="flex:1">
        <div style="font-weight:700;margin-bottom:6px">CONTRACTOR DETAILS</div>
        <div class="meta">${contrName}</div>
        <div class="meta">${contrAddress}</div>
        <div class="meta">Phone: ${contrPhone}</div>
        <div class="meta">ABN: ${contrAbn}</div>
      </div>
      <div style="width:260px;text-align:right;">
        <div style="font-weight:700">SUPERANNUATION DETAILS</div>
        <div class="meta">Super Fund: ${superName}</div>
        <div class="meta">Account #: ${superAcc}</div>
      </div>
    </section>

    <section style="margin-top:14px;">
      <div style="font-weight:700;margin-bottom:10px">ITEMISED WORK LOG</div>
      <table>
        <thead>
          <tr>
            <th style="text-align:left">Date</th>
            <th style="text-align:left">Day</th>
            <th style="text-align:left">Participant</th>
            <th style="text-align:left">Start</th>
            <th style="text-align:left">End</th>
            <th style="text-align:left">Hours</th>
            <th style="text-align:left">KMs</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </section>

    <div class="totals">
      <table>
        ${totalRowsHtml}
      </table>
    </div>

    <section style="margin-top:18px;">
      <div style="font-weight:700">Payment Details</div>
      <div class="meta">Bank: ${bankName}</div>
      <div class="meta">Account Name: ${bankAcname}</div>
      <div class="meta">BSB: ${bankBsb}, Account Number: ${bankAcc}</div>
    </section>

    <footer style="margin-top:18px;color:#666"><div class="small">Thank You</div></footer>

    <div class="no-print" style="position:fixed;right:16px;bottom:16px;display:flex;gap:8px">
      <button id="printBtn" style="padding:10px 12px;border-radius:6px;background:${accent};color:#fff;border:none;cursor:pointer;font-weight:700">Download (Print)</button>
      <button id="closeBtn" style="padding:10px 12px;border-radius:6px;background:#eee;border:none;cursor:pointer">Close</button>
    </div>

    <script>
      document.getElementById('printBtn').addEventListener('click', ()=> window.print());
      document.getElementById('closeBtn').addEventListener('click', ()=> window.close());
      // ensure UI is not printed
      const style = document.createElement('style');
      style.innerHTML = '@media print { .no-print{ display:none !important } }';
      document.head.appendChild(style);
    </script>
  </body></html>`;

  return html;
}

/* open preview */
function openPreview(autoPrint = false) {
  const template = q("#template_select").value;
  const accent = q("#accent_color").value;
  const fontFamily = q("#font_select").value;
  const html = buildInvoiceHTML(template, accent, fontFamily);
  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(html);
  w.document.close();
  if (autoPrint) {
    // auto open print after a small delay — not automatic by default
    const autoScript = `
      <script>
        (function waitAndPrint(){
          const b = document.getElementById('printBtn');
          if(b){ b.click(); } else setTimeout(waitAndPrint,200);
        })();
      <\/script>
    `;
    w.document.write(autoScript);
  }
}

/* wire controls */
q("#generate_preview").addEventListener("click", () => openPreview(false));
q("#generate_preview_2")?.addEventListener("click", () => openPreview(false));
q("#generate_and_print").addEventListener("click", () => openPreview(true));

/* update when appearance changes */
["#template_select", "#accent_color", "#font_select", "#gst_toggle"].forEach(
  (id) => q(id).addEventListener("change", () => updateAll())
);

/* periodic refresh of counts & calculations */
setInterval(() => {
  rowsCount.textContent = itemsBody.querySelectorAll("tr").length;
  updateAll();
}, 300);
