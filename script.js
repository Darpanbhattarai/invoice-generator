/* Main app logic for input page and preview generation (opens new tab) */

/* Small helpers */
function fmt(v){ return Number(v||0).toFixed(2) }
function q(sel, root=document){ return root.querySelector(sel) }
function qa(sel, root=document){ return Array.from(root.querySelectorAll(sel)) }
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

/* Default date */
q('#invoice_date').valueAsDate = new Date();

/* Table management */
const itemsBody = q('#items_body');
const rowsCount = q('#rows_count');

function addRow(data={}){
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="row-date" type="text" value="${data.date||''}" placeholder="14/11/2025"></td>
    <td><input class="row-day" type="text" value="${data.day||''}" placeholder="Friday"></td>
    <td><input class="row-part" type="text" value="${escapeHtml(data.participant||'')}" placeholder="Participant"></td>
    <td><input class="row-start" type="text" value="${data.start||''}" placeholder="4:35pm"></td>
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
  qAllInputs(tr).forEach(i => i.addEventListener('input', updateAll));
  tr.querySelector('.remove').addEventListener('click', ()=>{ tr.remove(); rowsCount.textContent = itemsBody.querySelectorAll('tr').length; updateAll(); });
  if (data.rateType) tr.querySelector('.row-rate-type').value = data.rateType;
  updateAll();
  return tr;
}
function qAllInputs(tr){ return Array.from(tr.querySelectorAll('input,select')) }

/* Demo rows to match your sample */
const demoRows = [
  {date:'14/11/2025', day:'Friday', participant:'Sehal Rana', start:'4:35pm', end:'10:00pm', hours:5.25, km:''},
  {date:'15/11/2025', day:'Saturday', participant:'Shady Omerie', start:'10:00am', end:'1:00pm', hours:3, km:10},
  {date:'17/11/2025', day:'Monday', participant:'Vicki Kelly', start:'10:30am', end:'1:30pm', hours:3, km:9},
  {date:'17/11/2025', day:'Monday', participant:'Kosta Vlahakis', start:'2:30pm', end:'6:00pm', hours:3.5, km:''},
  {date:'18/11/2025', day:'Tuesday', participant:'Nathan Farrely', start:'11:00am', end:'2:00pm', hours:3, km:51},
]
demoRows.forEach(r=> addRow(r));

/* Add row button */
q('#add_row').addEventListener('click', ()=> addRow({}));

/* Clear table */
q('#clear_table').addEventListener('click', ()=>{
  if(!confirm('Clear all rows?')) return;
  itemsBody.innerHTML = ''; rowsCount.textContent = 0; updateAll();
});

/* Detect rate type from day */
function detectRateTypeFromDay(dayText){
  if (!dayText) return 'ordinary';
  const d = dayText.trim().toLowerCase();
  if (d.startsWith('sat') || d.includes('saturday')) return 'saturday';
  if (d.startsWith('sun') || d.includes('sunday')) return 'sunday';
  return 'ordinary';
}

/* Update calculations from table */
function updateAll(){
  const rates = {
    ordinary: Number(q('#rate_ordinary').value||0),
    afternoon: Number(q('#rate_afternoon').value||0),
    saturday: Number(q('#rate_saturday').value||0),
    sunday: Number(q('#rate_sunday').value||0)
  };
  let ordHours=0, aftHours=0, satHours=0, sunHours=0, totalKm=0, gross=0;

  const rows = itemsBody.querySelectorAll('tr');
  rows.forEach(r=>{
    const hours = Number(r.querySelector('.row-hours').value || 0);
    const km = Number(r.querySelector('.row-km').value || 0);
    const dayText = r.querySelector('.row-day').value || '';
    let rateType = r.querySelector('.row-rate-type').value || '';
    if (!rateType) rateType = detectRateTypeFromDay(dayText);
    const rate = rates[rateType] || rates.ordinary || 0;
    const lineTotal = hours * rate;
    r.querySelector('.row-line-total').textContent = '$' + fmt(lineTotal);
    totalKm += km; gross += lineTotal;
    if (rateType === 'ordinary') ordHours += hours;
    if (rateType === 'afternoon') aftHours += hours;
    if (rateType === 'saturday') satHours += hours;
    if (rateType === 'sunday') sunHours += hours;
  });

  const travelTotal = Number(q('#travel_total').value || 0);
  const reimbTotal = Number(q('#reimb_total').value || 0);
  const superRate = Number(q('#super_rate').value || 0);
  const superContribution = gross * (superRate / 100);
  const bankPayable = gross + travelTotal + reimbTotal - superContribution;

  window._calc = {
    ordHours, aftHours, satHours, sunHours,
    totalHours: ordHours+aftHours+satHours+sunHours,
    totalKm, gross, travelTotal, reimbTotal, superRate, superContribution, bankPayable
  };
}

/* Wire rate/travel/super inputs to recalc */
['#rate_ordinary','#rate_afternoon','#rate_saturday','#rate_sunday','#travel_total','#reimb_total','#super_rate'].forEach(id=>{
  q(id).addEventListener('input', updateAll)
});

/* initial calc */
updateAll();

/* Build invoice HTML string for preview tab */
function buildInvoiceHTML(template='classic', accent='#0b75ef', fontFamily='Arial,Helvetica,sans-serif'){
  updateAll();
  const c = window._calc || {};
  const invoiceNumber = escapeHtml(q('#invoice_number').value||'');
  const invoiceDate = escapeHtml(q('#invoice_date').value||'');
  const servicePeriod = escapeHtml(q('#service_period').value||'');
  const billCompany = escapeHtml(q('#bill_company').value||'');
  const billAbn = escapeHtml(q('#bill_abn').value||'');
  const contrName = escapeHtml(q('#contr_name').value||'');
  const contrAddress = escapeHtml(q('#contr_address').value||'');
  const contrPhone = escapeHtml(q('#contr_phone').value||'');
  const contrAbn = escapeHtml(q('#contr_abn').value||'');
  const superName = escapeHtml(q('#super_name').value||'');
  const superAcc = escapeHtml(q('#super_acc').value||'');
  const bankName = escapeHtml(q('#bank_name').value||'');
  const bankAcname = escapeHtml(q('#bank_acname').value||'');
  const bankBsb = escapeHtml(q('#bank_bsb').value||'');
  const bankAcc = escapeHtml(q('#bank_acc').value||'');

  // build table rows HTML
  let itemsHtml = '';
  itemsBody.querySelectorAll('tr').forEach(r=>{
    const date = escapeHtml(r.querySelector('.row-date').value||'');
    const day = escapeHtml(r.querySelector('.row-day').value||'');
    const participant = escapeHtml(r.querySelector('.row-part').value||'');
    const start = escapeHtml(r.querySelector('.row-start').value||'');
    const end = escapeHtml(r.querySelector('.row-end').value||'');
    const hours = Number(r.querySelector('.row-hours').value || 0);
    const km = r.querySelector('.row-km').value || '';
    const rateType = r.querySelector('.row-rate-type').value || detectRateTypeFromDay(day);
    const rate = Number(q('#rate_' + rateType)?.value || q('#rate_ordinary').value || 0);
    const lineTotal = hours * rate;
    itemsHtml += `<tr>
      <td style="padding:8px 6px;border-bottom:1px solid #eee">${date}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee">${day}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee">${participant}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee">${start}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee">${end}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center">${fmt(hours)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center">${escapeHtml(km)}</td>
    </tr>`;
  });

  // Common style used in preview window (keeps it simple & printable)
  const previewStyle = `
    body{font-family:${fontFamily};color:#222;margin:24px;}
    .company-title{font-weight:700;font-size:20px}
    .meta{font-size:13px;color:#333}
    .right{text-align:right}
    table{width:100%;border-collapse:collapse}
    th{font-weight:700;padding:8px 6px;border-bottom:1px solid #ddd;}
    .totals{width:360px;margin-left:auto;margin-top:18px}
    .totals td{padding:6px}
    .accent{color:${accent}}
    .small{font-size:12px;color:#666}
  `;

  // Template variations
  let headerHtml = '';
  if (template === 'classic'){
    headerHtml = `
      <header style="display:flex;justify-content:space-between;align-items:flex-start">
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
  } else { // compact
    headerHtml = `
      <header style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="company-title">INVOICE</div>
          <div class="meta">#${invoiceNumber} • ${invoiceDate}</div>
          <div class="small">Service Period: ${servicePeriod}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700">${billCompany}</div>
          <div class="meta small">ABN: ${billAbn}</div>
        </div>
      </header>
    `;
  }

  const html = `<!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Invoice Preview - ${invoiceNumber}</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>${previewStyle}</style>
      <!-- load html2canvas & jspdf for PDF export in preview window -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
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
          <tr><td>Ordinary Hours (${fmt(c.ordHours)} * ${fmt(Number(q('#rate_ordinary').value||0))})</td><td class="right">$${fmt(c.ordHours * Number(q('#rate_ordinary').value||0))}</td></tr>
          <tr><td>Afternoon Hours (${fmt(c.aftHours)} * ${fmt(Number(q('#rate_afternoon').value||0))})</td><td class="right">$${fmt(c.aftHours * Number(q('#rate_afternoon').value||0))}</td></tr>
          <tr><td>Saturday (${fmt(c.satHours)} * ${fmt(Number(q('#rate_saturday').value||0))})</td><td class="right">$${fmt(c.satHours * Number(q('#rate_saturday').value||0))}</td></tr>
          <tr><td>Sunday Hours (${fmt(c.sunHours)} * ${fmt(Number(q('#rate_sunday').value||0))})</td><td class="right">$${fmt(c.sunHours * Number(q('#rate_sunday').value||0))}</td></tr>
          <tr><td>Travels</td><td class="right">$${fmt(c.travelTotal)}</td></tr>
          <tr><td>Reimbursement</td><td class="right">$${fmt(c.reimbTotal)}</td></tr>
          <tr style="font-weight:700"><td>Gross Income</td><td class="right">$${fmt(c.gross)}</td></tr>
          <tr><td>Super Rate (%)</td><td class="right">${fmt(c.superRate)}%</td></tr>
          <tr><td>Super Contribution</td><td class="right">$${fmt(c.superContribution)}</td></tr>
          <tr style="font-weight:700"><td>Bank Payable Amount</td><td class="right">$${fmt(c.bankPayable)}</td></tr>
        </table>
      </div>

      <section style="margin-top:18px;">
        <div style="font-weight:700">Payment Details</div>
        <div class="meta">Bank: ${bankName}</div>
        <div class="meta">Account Name: ${bankAcname}</div>
        <div class="meta">BSB: ${bankBsb}, Account Number: ${bankAcc}</div>
      </section>

      <footer style="margin-top:18px;color:#666">
        <div class="small">Thank You</div>
      </footer>

      <div style="position:fixed;right:16px;bottom:16px;display:flex;gap:8px">
        <button id="downloadPdfBtn" style="padding:10px 12px;border-radius:6px;background:${accent};color:#fff;border:none;cursor:pointer;font-weight:700">Download PDF</button>
        <button id="closeBtn" style="padding:10px 12px;border-radius:6px;background:#eee;border:none;cursor:pointer">Close</button>
      </div>

      <script>
        // PDF generation (handles long pages by slicing)
        async function downloadPDF(){
          const root = document.body;
          const canvas = await html2canvas(root, {scale:2, useCORS:true, allowTaint:true});
          const imgData = canvas.toDataURL('image/png');
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF('p','pt','a4');
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = pageWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let pos = 20;
          if (imgHeight <= pageHeight - 40) {
            pdf.addImage(imgData, 'PNG', 20, pos, imgWidth, imgHeight);
          } else {
            // slicing
            let remainingHeight = canvas.height;
            let sourceY = 0;
            const pageCanvas = document.createElement('canvas');
            const pageCtx = pageCanvas.getContext('2d');
            const ratio = canvas.width / imgWidth;
            const pageCanvasHeight = Math.floor((pageHeight - 40) * ratio);
            pageCanvas.width = canvas.width;
            pageCanvas.height = pageCanvasHeight;
            while (remainingHeight > 0){
              pageCtx.clearRect(0,0,pageCanvas.width,pageCanvas.height);
              pageCtx.drawImage(canvas, 0, sourceY, canvas.width, pageCanvasHeight, 0, 0, pageCanvas.width, pageCanvas.height);
              const pageData = pageCanvas.toDataURL('image/png');
              pdf.addImage(pageData, 'PNG', 20, pos, imgWidth, (pageCanvas.height*imgWidth)/pageCanvas.width);
              remainingHeight -= pageCanvasHeight;
              sourceY += pageCanvasHeight;
              if (remainingHeight > 0) pdf.addPage();
            }
          }
          pdf.save('${invoiceNumber}.pdf');
        }

        document.getElementById('downloadPdfBtn').addEventListener('click', async ()=>{
          document.getElementById('downloadPdfBtn').disabled = true;
          document.getElementById('downloadPdfBtn').textContent = 'Preparing...';
          try { await downloadPDF(); } catch(e){ alert('PDF failed: '+e.message) }
          document.getElementById('downloadPdfBtn').disabled = false;
          document.getElementById('downloadPdfBtn').textContent = 'Download PDF';
        });

        document.getElementById('closeBtn').addEventListener('click', ()=> window.close());
      </script>
    </body>
    </html>
  `;
  return html;
}

/* Open preview in new tab */
function openPreview(newTab = true, alsoDownload=false){
  const template = q('#template_select').value;
  const accent = q('#accent_color').value;
  const fontFamily = q('#font_select').value;
  const html = buildInvoiceHTML(template, accent, fontFamily);
  const w = window.open('', '_blank');
  w.document.open();
  w.document.write(html);
  w.document.close();
  if (alsoDownload){
    // let preview load and auto click download after small delay
    const script = `
      <script>
        (function(){
          function tryClick(){ 
            const btn = document.getElementById('downloadPdfBtn'); 
            if(btn){ btn.click(); return; } 
            setTimeout(tryClick,300); 
          } 
          tryClick();
        })();
      <\/script>
    `;
    // append script to auto-trigger - by re-opening and writing again we can append
    w.document.write(script);
  }
}

/* Buttons */
q('#generate_preview').addEventListener('click', ()=> openPreview(true,false));
q('#generate_preview_2').addEventListener('click', ()=> openPreview(true,false));
q('#download_preview_pdf').addEventListener('click', ()=> openPreview(true,true));

/* Keep table rows count updated and recalc on load */
function keepCountAndCalc(){
  rowsCount.textContent = itemsBody.querySelectorAll('tr').length;
  updateAll();
}
setInterval(keepCountAndCalc, 300); // simple keepalive to update count (lightweight)
