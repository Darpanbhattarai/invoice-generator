/* Helpers */
function q(sel, root=document){ return root.querySelector(sel); }
function qa(sel, root=document){ return Array.from((root||document).querySelectorAll(sel)); }
function fmt(v){ return Number(v||0).toFixed(2); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* default date */
q('#invoice_date').valueAsDate = new Date();

/* Table handling */
const itemsBody = q('#items_body');
const rowsCount = q('#rows_count');

function addRow(data={}){
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="row-date" type="text" value="${data.date||''}" placeholder="14/11/2025"></td>
    <td><input class="row-day" type="text" value="${data.day||''}" placeholder="Friday"></td>
    <td><input class="row-part" type="text" value="${esc(data.participant||'')}" placeholder="Participant"></td>
    <td><input class="row-start" type="text" value="${data.start||''}" placeholder="4:35pm / 16:30"></td>
    <td><input class="row-end" type="text" value="${data.end||''}" placeholder="10:00pm"></td>
    <td><input class="row-hours" type="number" step="0.25" value="${data.hours||''}" min="0"></td>
    <td><input class="row-km" type="number" step="0.1" value="${data.km||''}" min="0"></td>
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
  rowsCount.textContent = itemsBody.querySelectorAll('tr').length;
  qa('input,select', tr).forEach(el=>el.addEventListener('input', updateAll));
  tr.querySelector('.remove').addEventListener('click', ()=>{
    tr.remove();
    rowsCount.textContent = itemsBody.querySelectorAll('tr').length;
    updateAll();
  });
  if (data.rateType) tr.querySelector('.row-rate-type').value = data.rateType;
  updateAll();
  return tr;
}

/* Demo rows (sample) */
const demo = [
  {date:'14/11/2025', day:'Friday', participant:'Sehal Rana', start:'4:35pm', end:'10:00pm', hours:5.25, km:''},
  {date:'15/11/2025', day:'Saturday', participant:'Shady Omerie', start:'10:00am', end:'1:00pm', hours:3, km:10},
  {date:'17/11/2025', day:'Monday', participant:'Vicki Kelly', start:'10:30am', end:'1:30pm', hours:3, km:9},
  {date:'17/11/2025', day:'Monday', participant:'Kosta Vlahakis', start:'2:30pm', end:'6:00pm', hours:3.5, km:''},
  {date:'18/11/2025', day:'Tuesday', participant:'Nathan Farrely', start:'11:00am', end:'2:00pm', hours:3, km:51},
];
demo.forEach(r=>addRow(r));

/* buttons */
q('#add_row').addEventListener('click', ()=> addRow({}));
q('#clear_table').addEventListener('click', ()=>{
  if(!confirm('Clear all rows?')) return;
  itemsBody.innerHTML = '';
  rowsCount.textContent = 0;
  updateAll();
});
q('#generate_preview').addEventListener('click', ()=> openPreview(false));
q('#generate_preview_2').addEventListener('click', ()=> openPreview(false));
q('#generate_and_print').addEventListener('click', ()=> openPreview(true));

/* parse start time heuristics — accepts "4:35pm", "16:30", "4pm" */
function parseTimeTo24(text){
  if(!text) return null;
  text = text.trim().toLowerCase();
  let m;
  if(m = text.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/)){
    let hh = parseInt(m[1],10), mm = parseInt(m[2],10), ap = m[3];
    if(ap){
      if(ap==='pm' && hh<12) hh += 12;
      if(ap==='am' && hh===12) hh = 0;
    }
    return {h:hh, m:mm};
  }
  if(m = text.match(/^(\d{1,2})\s*(am|pm)$/)){
    let hh = parseInt(m[1],10), ap = m[2];
    if(ap==='pm' && hh<12) hh += 12;
    if(ap==='am' && hh===12) hh = 0;
    return {h:hh, m:0};
  }
  if(m = text.match(/^(\d{1,2}):(\d{2})$/)){
    return {h:parseInt(m[1],10), m:parseInt(m[2],10)};
  }
  return null;
}

/* auto detect rate type */
function detectRateTypeFromRow(dayText, startText){
  if(!dayText) return 'ordinary';
  const d = dayText.trim().toLowerCase();
  if(d.startsWith('sun') || d.includes('sunday')) return 'sunday';
  if(d.startsWith('sat') || d.includes('saturday')) return 'saturday';
  const t = parseTimeTo24(startText);
  if(t && t.h >= 15 && t.h <= 23) return 'afternoon';
  return 'ordinary';
}

/* main calculation from table & inputs */
function updateAll(){
  const rates = {
    ordinary: Number(q('#rate_ordinary').value||0),
    afternoon: Number(q('#rate_afternoon').value||0),
    saturday: Number(q('#rate_saturday').value||0),
    sunday: Number(q('#rate_sunday').value||0)
  };
  let ord=0, aft=0, sat=0, sun=0, totalKm=0, gross=0;
  const rows = itemsBody.querySelectorAll('tr');
  rows.forEach(r=>{
    const hours = Number(r.querySelector('.row-hours').value || 0);
    const km = Number(r.querySelector('.row-km').value || 0);
    const dayText = r.querySelector('.row-day').value || '';
    const startText = r.querySelector('.row-start').value || '';
    let rateType = r.querySelector('.row-rate-type').value || '';
    if(!rateType) rateType = detectRateTypeFromRow(dayText, startText);
    const rate = rates[rateType] || rates.ordinary || 0;
    const line = hours * rate;
    r.querySelector('.row-line-total').textContent = '$' + fmt(line);
    gross += line;
    totalKm += km;
    if(rateType==='ordinary') ord += hours;
    if(rateType==='afternoon') aft += hours;
    if(rateType==='saturday') sat += hours;
    if(rateType==='sunday') sun += hours;
  });

  const travelTotal = Number(q('#travel_total').value||0);
  const reimbTotal = Number(q('#reimb_total').value||0);
  const gstOn = q('#gst_toggle').checked;
  const gstRate = gstOn ? 0.10 : 0;
  const subtotal = gross + travelTotal + reimbTotal;
  const gstAmount = subtotal * gstRate;
  const totalWithGst = subtotal + gstAmount;
  const superRate = Number(q('#super_rate').value || 0);
  const superContribution = gross * (superRate/100);
  const bankPayable = totalWithGst - superContribution;
  window._calc = {
    ord, aft, sat, sun, totalKm, gross,
    travelTotal, reimbTotal, subtotal,
    gstAmount, totalWithGst, superRate,
    superContribution, bankPayable
  };
}

/* keep updating */
setInterval(()=>{ rowsCount.textContent = itemsBody.querySelectorAll('tr').length; updateAll(); }, 300);

/* Build preview HTML with chosen template, font, accent */
function buildInvoiceHTML(template, accent, fontFamily){
  updateAll();
  const c = window._calc || {};
  const invoiceNumber = esc(q('#invoice_number').value);
  const invoiceDate = esc(q('#invoice_date').value);
  const servicePeriod = esc(q('#service_period').value);
  const billCompany = esc(q('#bill_company').value);
  const billAbn = esc(q('#bill_abn').value);
  const contrName = esc(q('#contr_name').value);
  const contrAddress = esc(q('#contr_address').value);
  const contrPhone = esc(q('#contr_phone').value);
  const contrAbn = esc(q('#contr_abn').value);
  const superName = esc(q('#super_name').value);
  const superAcc = esc(q('#super_acc').value);
  const bankName = esc(q('#bank_name').value);
  const bankAcname = esc(q('#bank_acname').value);
  const bankBsb = esc(q('#bank_bsb').value);
  const bankAcc = esc(q('#bank_acc').value);
  const gstOn = q('#gst_toggle').checked;

  /* build rows */
  let itemsHtml = '';
  itemsBody.querySelectorAll('tr').forEach(r=>{
    const date = esc(r.querySelector('.row-date').value || '');
    const day = esc(r.querySelector('.row-day').value || '');
    const participant = esc(r.querySelector('.row-part').value || '');
    const start = esc(r.querySelector('.row-start').value || '');
    const end = esc(r.querySelector('.row-end').value || '');
    const hours = Number(r.querySelector('.row-hours').value || 0);
    const km = esc(r.querySelector('.row-km').value || '');
    itemsHtml += `<tr>
      <td>${date}</td>
      <td>${day}</td>
      <td>${participant}</td>
      <td>${start}</td>
      <td>${end}</td>
      <td class="num">${fmt(hours)}</td>
      <td class="num">${km}</td>
    </tr>`;
  });

  const rateOrd = Number(q('#rate_ordinary').value||0);
  const rateAft = Number(q('#rate_afternoon').value||0);
  const rateSat = Number(q('#rate_saturday').value||0);
  const rateSun = Number(q('#rate_sunday').value||0);

  const totalsRowsHtml = `
    <tr><td>Ordinary Hours (${fmt(c.ord)} × ${fmt(rateOrd)})</td><td class="num">$${fmt(c.ord * rateOrd)}</td></tr>
    <tr><td>Afternoon Hours (${fmt(c.aft)} × ${fmt(rateAft)})</td><td class="num">$${fmt(c.aft * rateAft)}</td></tr>
    <tr><td>Saturday Hours (${fmt(c.sat)} × ${fmt(rateSat)})</td><td class="num">$${fmt(c.sat * rateSat)}</td></tr>
    <tr><td>Sunday Hours (${fmt(c.sun)} × ${fmt(rateSun)})</td><td class="num">$${fmt(c.sun * rateSun)}</td></tr>
    <tr><td>Travel</td><td class="num">$${fmt(c.travelTotal)}</td></tr>
    <tr><td>Reimbursement</td><td class="num">$${fmt(c.reimbTotal)}</td></tr>
    <tr class="strong"><td>Subtotal</td><td class="num">$${fmt(c.subtotal)}</td></tr>
    ${ gstOn ? `<tr><td>GST (10%)</td><td class="num">$${fmt(c.gstAmount)}</td></tr>` : '' }
    <tr><td>Super Rate</td><td class="num">${fmt(c.superRate)}%</td></tr>
    <tr><td>Super Contribution</td><td class="num">$${fmt(c.superContribution)}</td></tr>
    <tr class="strong total-row"><td>Bank Payable Amount</td><td class="num">$${fmt(c.bankPayable)}</td></tr>
  `;

  const baseStyle = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Poppins:wght@300;400;600;700&family=Roboto:wght@300;400;500;700&family=Montserrat:wght@300;400;600;700&display=swap');
    *{box-sizing:border-box;}
    body{
      font-family:${fontFamily};
      color:#222;
      margin:0;
      padding:24px;
    }
    .page{max-width:820px;margin:0 auto;}
    h1,h2,h3,h4{margin:0;}
    table{width:100%;border-collapse:collapse;}
    th,td{padding:6px 8px;font-size:13px;}
    th{text-align:left;}
    .meta{font-size:12px;color:#555;}
    .label{font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#777;}
    .num{text-align:right;}
    .totals-table td{padding:4px 0;}
    .totals-table .strong td{font-weight:600;}
    .footer-note{font-size:11px;color:#777;margin-top:16px;}
    .pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;}
    .print-actions{
      position:fixed;
      right:16px;
      bottom:16px;
      display:flex;
      gap:8px;
      z-index:1000;
    }
    .print-btn{
      padding:10px 12px;
      border-radius:6px;
      background:${accent};
      color:#fff;
      border:none;
      cursor:pointer;
      font-weight:600;
      font-size:13px;
    }
    .close-btn{
      padding:10px 12px;
      border-radius:6px;
      background:#eee;
      border:none;
      cursor:pointer;
      font-size:13px;
    }
    @media print{
      .print-actions{display:none;}
      body{padding:0;}
      .page{margin:0;}
    }
  `;

  const templates = {
    /* 1. CLASSIC – simple, clean, blue header stripe */
    classic: {
      style: `
        ${baseStyle}
        .header-bar{
          border-bottom:3px solid ${accent};
          padding-bottom:12px;
          margin-bottom:16px;
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
        }
        .invoice-title{
          font-size:26px;
          font-weight:700;
          letter-spacing:0.08em;
        }
        .accent-text{color:${accent};}
        .bill-block{font-size:13px;text-align:right;}
        .section-title{
          font-size:13px;
          font-weight:600;
          text-transform:uppercase;
          letter-spacing:0.06em;
          margin-bottom:4px;
        }
        .two-col{display:flex;gap:24px;margin-bottom:12px;}
        .two-col > div{flex:1;}
        .items-card{
          margin-top:16px;
          border-radius:6px;
          border:1px solid #e6e6e6;
          overflow:hidden;
        }
        .items-card th{
          background:#f5f7ff;
          font-weight:600;
          border-bottom:1px solid #dfe4ff;
        }
        .items-card td{
          border-bottom:1px solid #f0f0f0;
        }
        .totals-wrap{
          margin-top:16px;
          display:flex;
          justify-content:flex-end;
        }
        .totals-card{
          width:340px;
          border-radius:6px;
          border:1px solid #e2e5f0;
          padding:10px 12px;
          background:#fbfcff;
        }
        .total-row td{
          border-top:1px solid #d9def2;
          padding-top:6px;
          margin-top:4px;
        }
      `,
      render: () => `
        <div class="page classic">
          <header class="header-bar">
            <div>
              <div class="label">Invoice</div>
              <div class="invoice-title accent-text">INVOICE</div>
              <div class="meta">Invoice Number: <strong>${invoiceNumber}</strong></div>
              <div class="meta">Invoice Date: <strong>${invoiceDate}</strong></div>
              <div class="meta">Service Period: <strong>${servicePeriod}</strong></div>
            </div>
            <div class="bill-block">
              <div class="label">Bill To</div>
              <div><strong>${billCompany}</strong></div>
              <div class="meta">ABN: ${billAbn}</div>
            </div>
          </header>

          <section class="two-col">
            <div>
              <div class="section-title">Contractor</div>
              <div class="meta">${contrName}</div>
              <div class="meta">${contrAddress}</div>
              <div class="meta">Phone: ${contrPhone}</div>
              <div class="meta">ABN: ${contrAbn}</div>
            </div>
            <div>
              <div class="section-title">Superannuation</div>
              <div class="meta">Super Fund: ${superName}</div>
              <div class="meta">Account #: ${superAcc}</div>
            </div>
          </section>

          <section class="items-card">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Participant</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Hours</th>
                  <th>KMs</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </section>

          <section class="totals-wrap">
            <div class="totals-card">
              <table class="totals-table">
                ${totalsRowsHtml}
              </table>
              <div class="meta" style="margin-top:6px;">
                Bank: ${bankName}<br>
                Account Name: ${bankAcname}<br>
                BSB: ${bankBsb} &nbsp;&nbsp; Account: ${bankAcc}
              </div>
            </div>
          </section>

          <div class="footer-note">Thank you for your business.</div>
        </div>
      `
    },

    /* 2. MODERN – big coloured banner, left/right layout */
    modern: {
      style: `
        ${baseStyle}
        body{background:#f4f6fb;}
        .page{
          background:#fff;
          padding:24px 28px 28px;
          border-radius:10px;
          box-shadow:0 10px 30px rgba(15,20,40,0.12);
        }
        .top-banner{
          background:${accent};
          color:#fff;
          border-radius:8px;
          padding:14px 18px;
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          margin-bottom:18px;
        }
        .invoice-main-title{
          font-size:24px;
          font-weight:700;
          letter-spacing:0.12em;
        }
        .top-banner .meta{color:rgba(255,255,255,0.9);}
        .pill{background:rgba(255,255,255,0.12);}
        .info-grid{
          display:grid;
          grid-template-columns:2fr 1.3fr;
          gap:16px;
          margin-bottom:16px;
        }
        .card{
          border-radius:8px;
          border:1px solid #e4e7f2;
          padding:10px 12px;
          background:#fafbff;
        }
        .card h3{
          font-size:13px;
          margin-bottom:4px;
          text-transform:uppercase;
          letter-spacing:0.09em;
          color:#445;
        }
        .items-table-wrap{
          border-radius:8px;
          border:1px solid #e9ecf7;
          overflow:hidden;
          margin-top:6px;
        }
        table thead th{
          background:#f3f4ff;
          border-bottom:1px solid #dde1ff;
        }
        tbody td{
          border-bottom:1px solid #f2f3fb;
        }
        .bottom-grid{
          display:grid;
          grid-template-columns:1.2fr 1fr;
          gap:18px;
          margin-top:16px;
        }
        .totals-card{
          border-radius:8px;
          border:1px solid #e0e4ff;
          padding:10px 12px;
          background:#f7f8ff;
        }
        .total-row td{
          border-top:1px dashed #c0c7ff;
          padding-top:6px;
        }
      `,
      render: () => `
        <div class="page modern">
          <header class="top-banner">
            <div>
              <div class="invoice-main-title">INVOICE</div>
              <div class="meta">Invoice Number: <strong>${invoiceNumber}</strong></div>
              <div class="meta">Invoice Date: <strong>${invoiceDate}</strong></div>
              <div class="meta">Service Period: <strong>${servicePeriod}</strong></div>
            </div>
            <div style="text-align:right;">
              <div class="label">Bill To</div>
              <div style="font-weight:600;">${billCompany}</div>
              <div class="meta">ABN: ${billAbn}</div>
              <div style="margin-top:6px;">
                <span class="pill">NDIS Support Services</span>
              </div>
            </div>
          </header>

          <section class="info-grid">
            <div class="card">
              <h3>Contractor</h3>
              <div class="meta">${contrName}</div>
              <div class="meta">${contrAddress}</div>
              <div class="meta">Phone: ${contrPhone}</div>
              <div class="meta">ABN: ${contrAbn}</div>
            </div>
            <div class="card">
              <h3>Super &amp; Payment</h3>
              <div class="meta">Super Fund: ${superName}</div>
              <div class="meta">Super Account: ${superAcc}</div>
              <div class="meta" style="margin-top:6px;">Bank: ${bankName}</div>
              <div class="meta">Acct Name: ${bankAcname}</div>
              <div class="meta">BSB: ${bankBsb} &nbsp; Acct: ${bankAcc}</div>
            </div>
          </section>

          <section class="items-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Participant</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Hours</th>
                  <th>KMs</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </section>

          <section class="bottom-grid">
            <div class="card">
              <h3>Notes</h3>
              <div class="meta">
                Support work and travel have been provided in accordance with service agreements.
                Please make payment to the bank details listed. Superannuation is calculated on the
                gross hourly earnings component only.
              </div>
            </div>
            <div class="totals-card">
              <table class="totals-table">
                ${totalsRowsHtml}
              </table>
            </div>
          </section>
        </div>
      `
    },

    /* 3. MINIMAL – ultra clean, lots of white space, no boxes */
    minimal: {
      style: `
        ${baseStyle}
        body{background:#ffffff;}
        .page{max-width:760px;}
        .top-row{
          display:flex;
          justify-content:space-between;
          margin-bottom:24px;
        }
        .invoice-title{
          font-size:24px;
          font-weight:600;
          margin-bottom:6px;
        }
        .label{color:#888;}
        .meta{color:#444;}
        .line{
          height:1px;
          background:#e4e4e4;
          margin:10px 0 18px;
        }
        .info-row{
          display:flex;
          justify-content:space-between;
          margin-bottom:18px;
          font-size:13px;
        }
        th{
          border-bottom:1px solid #ddd;
          font-weight:500;
        }
        td{
          border-bottom:1px solid #f0f0f0;
        }
        .totals-right{
          margin-top:16px;
          display:flex;
          justify-content:flex-end;
        }
        .totals-table td{
          padding:2px 0;
        }
        .total-row td{
          border-top:1px solid #ddd;
          padding-top:6px;
        }
      `,
      render: () => `
        <div class="page minimal">
          <header class="top-row">
            <div>
              <div class="label">Invoice</div>
              <div class="invoice-title">Invoice</div>
              <div class="meta">Invoice #: ${invoiceNumber}</div>
              <div class="meta">Date: ${invoiceDate}</div>
              <div class="meta">Service: ${servicePeriod}</div>
            </div>
            <div style="text-align:right;">
              <div class="label">Bill To</div>
              <div><strong>${billCompany}</strong></div>
              <div class="meta">ABN: ${billAbn}</div>
            </div>
          </header>

          <div class="line"></div>

          <section class="info-row">
            <div>
              <div class="label">Contractor</div>
              <div>${contrName}</div>
              <div class="meta">${contrAddress}</div>
              <div class="meta">${contrPhone}</div>
              <div class="meta">ABN: ${contrAbn}</div>
            </div>
            <div style="text-align:right;">
              <div class="label">Super</div>
              <div class="meta">Fund: ${superName}</div>
              <div class="meta">Account: ${superAcc}</div>
            </div>
          </section>

          <section>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Participant</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Hours</th>
                  <th>KMs</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </section>

          <section class="totals-right">
            <table class="totals-table">
              ${totalsRowsHtml}
            </table>
          </section>

          <div class="footer-note">
            Bank: ${bankName} — ${bankAcname} — BSB ${bankBsb} — Acct ${bankAcc}
          </div>
        </div>
      `
    },

    /* 4. BOXED – content in framed box in middle of page */
    boxed: {
      style: `
        ${baseStyle}
        body{
          background:#e8ecf6;
          padding:32px 0;
        }
        .page{
          background:#ffffff;
          padding:22px 24px 26px;
          border-radius:10px;
          box-shadow:0 12px 32px rgba(10,20,50,0.18);
        }
        .box-border{
          border:2px solid ${accent};
          border-radius:10px;
          padding:18px 20px 20px;
        }
        .header-row{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          margin-bottom:14px;
        }
        .invoice-title{
          font-size:20px;
          font-weight:700;
          letter-spacing:0.14em;
          color:${accent};
        }
        .meta{color:#333;}
        .bill-block{
          text-align:right;
          font-size:13px;
        }
        .bill-block .label{color:#555;}
        .info-grid{
          display:grid;
          grid-template-columns:1.3fr 1fr;
          gap:14px;
          margin-bottom:12px;
          font-size:13px;
        }
        .info-box{
          border-radius:6px;
          border:1px solid #e3e6f0;
          padding:8px 10px;
          background:#f9fbff;
        }
        .info-box h3{
          font-size:13px;
          margin:0 0 4px;
          text-transform:uppercase;
          letter-spacing:0.07em;
          color:#555;
        }
        th{
          background:#f4f5ff;
          border-bottom:1px solid #dfe1ff;
        }
        td{
          border-bottom:1px solid #f0f0ff;
        }
        .bottom-row{
          display:flex;
          justify-content:space-between;
          margin-top:14px;
          gap:16px;
        }
        .bottom-note{
          font-size:11px;
          color:#666;
          max-width:55%;
        }
        .totals-card{
          border-radius:6px;
          border:1px solid #dde1ff;
          padding:8px 10px;
          background:#f7f8ff;
          width:300px;
        }
        .total-row td{
          border-top:1px solid #c9cff5;
          padding-top:6px;
        }
      `,
      render: () => `
        <div class="page boxed">
          <div class="box-border">
            <header class="header-row">
              <div>
                <div class="invoice-title">INVOICE</div>
                <div class="meta">Number: ${invoiceNumber}</div>
                <div class="meta">Date: ${invoiceDate}</div>
                <div class="meta">Service: ${servicePeriod}</div>
              </div>
              <div class="bill-block">
                <div class="label">Bill To</div>
                <div><strong>${billCompany}</strong></div>
                <div class="meta">ABN: ${billAbn}</div>
              </div>
            </header>

            <section class="info-grid">
              <div class="info-box">
                <h3>Contractor</h3>
                <div class="meta">${contrName}</div>
                <div class="meta">${contrAddress}</div>
                <div class="meta">Phone: ${contrPhone}</div>
                <div class="meta">ABN: ${contrAbn}</div>
              </div>
              <div class="info-box">
                <h3>Super &amp; Bank</h3>
                <div class="meta">Super: ${superName}</div>
                <div class="meta">Super Account: ${superAcc}</div>
                <div class="meta" style="margin-top:4px;">Bank: ${bankName}</div>
                <div class="meta">${bankAcname}</div>
                <div class="meta">BSB ${bankBsb} — Acct ${bankAcc}</div>
              </div>
            </section>

            <section>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Participant</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Hours</th>
                    <th>KMs</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
            </section>

            <section class="bottom-row">
              <div class="bottom-note">
                Please reference the invoice number ${invoiceNumber} when making payment.
                Payment terms: 7 days from invoice date, unless otherwise agreed.
              </div>
              <div class="totals-card">
                <table class="totals-table">
                  ${totalsRowsHtml}
                </table>
              </div>
            </section>
          </div>
        </div>
      `
    },

    /* 5. NDIS – purple accent, compliance-style look */
    ndis: {
      style: `
        ${baseStyle}
        body{
          background:#f5f0fb;
        }
        .page{
          background:#fff;
          padding:22px 24px 26px;
          border-radius:8px;
          box-shadow:0 8px 24px rgba(40,0,80,0.18);
        }
        .header-band{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          border-left:6px solid #6a1b9a;
          padding-left:14px;
          margin-bottom:14px;
        }
        .invoice-title{
          font-size:22px;
          font-weight:700;
          color:#6a1b9a;
          text-transform:uppercase;
          letter-spacing:0.09em;
        }
        .meta{color:#333;}
        .provider-block{
          text-align:right;
          font-size:13px;
        }
        .provider-block .label{color:#8051b5;}
        .ndis-note{
          background:#f7eaff;
          border-radius:6px;
          padding:8px 10px;
          font-size:11px;
          color:#5b3b81;
          margin-bottom:10px;
        }
        .top-info-grid{
          display:grid;
          grid-template-columns:1.4fr 1fr;
          gap:12px;
          font-size:13px;
          margin-bottom:10px;
        }
        th{
          background:#f2e8ff;
          border-bottom:1px solid #ddcaff;
        }
        td{
          border-bottom:1px solid #f3ecff;
        }
        .totals-row-wrap{
          margin-top:14px;
          display:flex;
          justify-content:flex-end;
        }
        .totals-card{
          width:330px;
          border-radius:6px;
          border:1px solid #d8c6ff;
          padding:10px 11px;
          background:#faf6ff;
        }
        .total-row td{
          border-top:1px solid #c3aef7;
        }
      `,
      render: () => `
        <div class="page ndis">
          <header class="header-band">
            <div>
              <div class="invoice-title">NDIS Invoice</div>
              <div class="meta">Invoice #: ${invoiceNumber}</div>
              <div class="meta">Date: ${invoiceDate}</div>
              <div class="meta">Service Period: ${servicePeriod}</div>
            </div>
            <div class="provider-block">
              <div class="label">Bill To (NDIS Provider)</div>
              <div><strong>${billCompany}</strong></div>
              <div class="meta">ABN: ${billAbn}</div>
            </div>
          </header>

          <div class="ndis-note">
            This invoice relates to NDIS supports provided under a service agreement.
            All support hours and travel have been delivered in accordance with NDIS requirements.
          </div>

          <section class="top-info-grid">
            <div>
              <div class="label">Contractor</div>
              <div class="meta">${contrName}</div>
              <div class="meta">${contrAddress}</div>
              <div class="meta">Phone: ${contrPhone}</div>
              <div class="meta">ABN: ${contrAbn}</div>
            </div>
            <div>
              <div class="label">Super &amp; Bank</div>
              <div class="meta">Super Fund: ${superName}</div>
              <div class="meta">Super Acc: ${superAcc}</div>
              <div class="meta" style="margin-top:4px;">Bank: ${bankName}</div>
              <div class="meta">Acct: ${bankAcname}</div>
              <div class="meta">BSB: ${bankBsb} — ${bankAcc}</div>
            </div>
          </section>

          <section>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Participant</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Hours</th>
                  <th>KMs</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </section>

          <section class="totals-row-wrap">
            <div class="totals-card">
              <table class="totals-table">
                ${totalsRowsHtml}
              </table>
            </div>
          </section>
        </div>
      `
    },

    /* 6. DARK – dark background, light text */
    dark: {
      style: `
        ${baseStyle}
        body{
          background:#05060a;
          color:#f2f5ff;
        }
        .page{
          background:#0f1117;
          padding:22px 24px 26px;
          border-radius:10px;
          box-shadow:0 16px 40px rgba(0,0,0,0.55);
        }
        .header-row{
          display:flex;
          justify-content:space-between;
          margin-bottom:18px;
        }
        .invoice-title{
          font-size:24px;
          font-weight:700;
          letter-spacing:0.12em;
          color:${accent};
        }
        .meta{color:#c2c6dd;}
        .label{color:#8b8fa4;}
        th{
          background:#151827;
          color:#e5e8ff;
          border-bottom:1px solid #272a3c;
        }
        td{
          border-bottom:1px solid #171a28;
        }
        .items-wrapper{
          border-radius:8px;
          border:1px solid #22263b;
          overflow:hidden;
          margin-top:10px;
        }
        .totals-wrap{
          margin-top:16px;
          display:flex;
          justify-content:space-between;
          gap:18px;
          align-items:flex-start;
        }
        .totals-card{
          width:330px;
          border-radius:8px;
          background:#151827;
          padding:10px 12px;
          border:1px solid #313652;
        }
        .totals-table td{
          color:#e2e6ff;
        }
        .total-row td{
          border-top:1px solid #444a70;
        }
        .footer-note{
          color:#858bb0;
        }
      `,
      render: () => `
        <div class="page dark">
          <header class="header-row">
            <div>
              <div class="label">Invoice</div>
              <div class="invoice-title">INVOICE</div>
              <div class="meta">Number: ${invoiceNumber}</div>
              <div class="meta">Date: ${invoiceDate}</div>
              <div class="meta">Service Period: ${servicePeriod}</div>
            </div>
            <div style="text-align:right;">
              <div class="label">Bill To</div>
              <div style="font-weight:600;">${billCompany}</div>
              <div class="meta">ABN: ${billAbn}</div>
            </div>
          </header>

          <section style="display:flex;gap:18px;margin-bottom:10px;font-size:13px;">
            <div style="flex:1;">
              <div class="label">Contractor</div>
              <div class="meta">${contrName}</div>
              <div class="meta">${contrAddress}</div>
              <div class="meta">Phone: ${contrPhone}</div>
              <div class="meta">ABN: ${contrAbn}</div>
            </div>
            <div style="flex:1;text-align:right;">
              <div class="label">Super &amp; Bank</div>
              <div class="meta">Super: ${superName}</div>
              <div class="meta">Acc: ${superAcc}</div>
              <div class="meta" style="margin-top:4px;">Bank: ${bankName}</div>
              <div class="meta">Acct: ${bankAcname}</div>
              <div class="meta">BSB: ${bankBsb} — ${bankAcc}</div>
            </div>
          </section>

          <section class="items-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Participant</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Hours</th>
                  <th>KMs</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </section>

          <section class="totals-wrap">
            <div style="flex:1;">
              <div class="footer-note">
                Please make payment within 7 days. Use the invoice number ${invoiceNumber}
                as the payment reference. For any questions, contact ${contrName}.
              </div>
            </div>
            <div class="totals-card">
              <table class="totals-table">
                ${totalsRowsHtml}
              </table>
            </div>
          </section>
        </div>
      `
    },

    /* 7. COMPACT – dense, one-page, smaller font */
    compact: {
      style: `
        ${baseStyle}
        body{
          font-size:12px;
        }
        .page{
          max-width:760px;
        }
        .header-row{
          display:flex;
          justify-content:space-between;
          margin-bottom:10px;
        }
        .invoice-title{
          font-size:18px;
          font-weight:700;
          color:${accent};
        }
        .meta{font-size:11px;}
        th,td{
          padding:4px 5px;
          font-size:11px;
        }
        th{
          background:#f0f4ff;
          border-bottom:1px solid #d3ddff;
        }
        td{
          border-bottom:1px solid #f3f5ff;
        }
        .top-info{
          display:flex;
          justify-content:space-between;
          margin-bottom:8px;
          font-size:11px;
        }
        .totals-right{
          margin-top:8px;
          display:flex;
          justify-content:flex-end;
        }
        .totals-table td{
          padding:2px 0;
        }
        .total-row td{
          border-top:1px solid #ccd3ff;
        }
      `,
      render: () => `
        <div class="page compact">
          <header class="header-row">
            <div>
              <div class="invoice-title">INVOICE</div>
              <div class="meta">#${invoiceNumber}</div>
            </div>
            <div style="text-align:right;">
              <div class="meta">Date: ${invoiceDate}</div>
              <div class="meta">Service: ${servicePeriod}</div>
              <div class="meta"><strong>${billCompany}</strong></div>
              <div class="meta">ABN: ${billAbn}</div>
            </div>
          </header>

          <section class="top-info">
            <div>
              <div class="label">Contractor</div>
              <div>${contrName}</div>
              <div class="meta">${contrPhone}</div>
              <div class="meta">ABN: ${contrAbn}</div>
            </div>
            <div style="text-align:right;">
              <div class="label">Bank</div>
              <div class="meta">${bankName}</div>
              <div class="meta">${bankAcname}</div>
              <div class="meta">BSB: ${bankBsb}</div>
              <div class="meta">Acct: ${bankAcc}</div>
            </div>
          </section>

          <section>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Participant</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Hours</th>
                  <th>KMs</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </section>

          <section class="totals-right">
            <table class="totals-table">
              ${totalsRowsHtml}
            </table>
          </section>
        </div>
      `
    }
  };

  const cfg = templates[template] || templates.classic;

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Invoice Preview - ${invoiceNumber}</title>
      <style>${cfg.style}</style>
    </head>
    <body>
      ${cfg.render()}
      <div class="print-actions">
        <button id="printBtn" class="print-btn">Download (Print)</button>
        <button id="closeBtn" class="close-btn">Close</button>
      </div>
      <script>
        document.getElementById('printBtn').addEventListener('click', function(){ window.print(); });
        document.getElementById('closeBtn').addEventListener('click', function(){ window.close(); });
      <\/script>
    </body>
  </html>`;

  return html;
}

/* open preview, optionally auto print */
function openPreview(autoPrint=false){
  const template = q('#template_select').value;
  const accent = q('#accent_color').value;
  const fontFamily = q('#font_select').value;
  const html = buildInvoiceHTML(template, accent, fontFamily);
  const w = window.open('', '_blank');
  if(!w) return alert('Please allow popups for this site.');
  w.document.open();
  w.document.write(html);
  w.document.close();
  if(autoPrint){
    const printInterval = setInterval(()=>{
      const btn = w.document.getElementById('printBtn');
      if(btn){
        btn.click();
        clearInterval(printInterval);
      }
    }, 200);
  }
}

/* recalc when appearance changes */
['#template_select','#accent_color','#font_select','#gst_toggle',
 '#rate_ordinary','#rate_afternoon','#rate_saturday','#rate_sunday',
 '#travel_total','#reimb_total','#super_rate'
].forEach(id=>{
  const el = q(id);
  if(el) el.addEventListener('input', updateAll);
});

updateAll();
