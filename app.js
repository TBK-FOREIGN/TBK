/* app.js
   TBK - Full app logic (Khmer UI) with ទីតាំង កើតហេតុ date field
   - Hardcoded admin login: foreign@tbk.com / TBK123*@
   - Firestore collection: "submissions"
   - Storage folder for images: "photos/user-uploads/"
   - Export combined PDF using assets/form_template.jpeg (or fallback to your uploaded path)
*/

// ---------- CONFIG ----------
const ADMIN_EMAIL = "foreign@tbk.com";
const ADMIN_PASSWORD = "TBK123*@";
const COLLECTION = "submissions";

// helpers
const $ = s => document.querySelector(s);
const createEl = (t,c) => { const e = document.createElement(t); if (c) e.className = c; return e; };

// theme init
(function initTheme(){
  const mode = localStorage.getItem('tbk_mode') || 'light';
  document.documentElement.setAttribute('data-theme', mode);
  $('#theme-toggle').textContent = mode === 'light' ? 'Dark' : 'Light';
})();
$('#theme-toggle').addEventListener('click', ()=>{
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  const next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('tbk_mode', next);
  $('#theme-toggle').textContent = next === 'light' ? 'Dark' : 'Light';
});

// auth state
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
function showLogin(){ $('#login-section').style.display='block'; $('#panel').style.display='none'; $('#logout-btn').style.display='none'; }
function showApp(){ $('#login-section').style.display='none'; $('#panel').style.display='block'; $('#logout-btn').style.display='inline-block'; }

if (currentUser) { showApp(); loadSubmissions(); } else { showLogin(); }

// LOGIN (no alert on success per prior request)
$('#login-form').addEventListener('submit',(e)=>{
  e.preventDefault();
  const emailVal = $('#email').value.trim();
  const passVal = $('#password').value;
  if (emailVal === ADMIN_EMAIL && passVal === ADMIN_PASSWORD) {
    currentUser = { email: emailVal };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showApp();
    loadSubmissions();
  } else {
    alert('អ៊ីមែល ឬ លេខសម្ងាត់ មិនត្រឹមត្រូវ');
  }
});
$('#logout-btn').addEventListener('click', ()=>{ localStorage.removeItem('currentUser'); currentUser = null; showLogin(); });

// ---------- UPLOAD helper ----------
async function uploadFileIfPresent(file, destPathPrefix){
  if (!file) return null;
  const filename = `${Date.now()}_${file.name}`;
  const path = `${destPathPrefix}${filename}`;
  const ref = storage.ref(path);
  await ref.put(file);
  const url = await ref.getDownloadURL();
  return { path, url };
}

// ---------- CREATE SUBMISSION ----------
$('#submit-form').addEventListener('submit', async (e)=>{
  e.preventDefault();

  // if editing handled elsewhere
  if ($('#submit-form').dataset.editId) {
    // avoid double create; edit flow uses saveEditIfPresent bound later
    return;
  }

  const incidentDateValue = $('#incident_date').value || null; // yyyy-mm-dd or empty

  const payload = {
    name: $('#name').value.trim(),
    surname: $('#surname').value.trim(),
    passport: $('#passport').value.trim(),
    phone: $('#phone').value.trim(),
    nationality: $('#nationality').value.trim(),
    address: $('#address').value.trim(),
    reason: $('#reason').value.trim(),
    incidentDate: incidentDateValue, // keep ISO date string
    status: 'មិនទាន់ដោះស្រាយ',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    const docRef = await db.collection(COLLECTION).add(payload);

    const file = $('#photo').files[0];
    if (file) {
      const uploaded = await uploadFileIfPresent(file, 'photos/user-uploads/');
      if (uploaded && uploaded.url) {
        await db.collection(COLLECTION).doc(docRef.id).update({ photoUrl: uploaded.url, photoPath: uploaded.path });
      }
    }

    alert('បានរក្សាទុក');
    $('#submit-form').reset();
    loadSubmissions();
  } catch (err) {
    console.error(err);
    alert('មានបញ្ហា — មិនអាចរក្សាទិន្នន័យបាន');
  }
});

// reset
$('#reset-form').addEventListener('click', ()=> $('#submit-form').reset());

// ---------- EDIT ----------
function openEdit(id, data){
  $('#name').value = data.name || '';
  $('#surname').value = data.surname || '';
  $('#passport').value = data.passport || '';
  $('#phone').value = data.phone || '';
  $('#nationality').value = data.nationality || '';
  $('#address').value = data.address || '';
  $('#reason').value = data.reason || '';
  $('#incident_date').value = data.incidentDate || ''; // set date input
  $('#submit-form').dataset.editId = id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveEditIfPresent(){
  if (!$('#submit-form').dataset.editId) return false;
  const id = $('#submit-form').dataset.editId;
  const update = {
    name: $('#name').value.trim(),
    surname: $('#surname').value.trim(),
    passport: $('#passport').value.trim(),
    phone: $('#phone').value.trim(),
    nationality: $('#nationality').value.trim(),
    address: $('#address').value.trim(),
    reason: $('#reason').value.trim(),
    incidentDate: $('#incident_date').value || null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  try {
    await db.collection(COLLECTION).doc(id).update(update);
    const file = $('#photo').files[0];
    if (file) {
      const uploaded = await uploadFileIfPresent(file, 'photos/user-uploads/');
      if (uploaded && uploaded.url) {
        await db.collection(COLLECTION).doc(id).update({ photoUrl: uploaded.url, photoPath: uploaded.path });
      }
    }
    delete $('#submit-form').dataset.editId;
    return true;
  } catch (err) {
    console.error(err);
    alert('កំហុសពេលកែប្រែ');
    return false;
  }
}

// intercept submit to handle edit vs create without double-binding
document.getElementById('submit-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  if ($('#submit-form').dataset.editId) {
    const ok = await saveEditIfPresent();
    if (ok) { alert('បានកែប្រែ'); loadSubmissions(); $('#submit-form').reset(); }
    return;
  }
  // create flow is already bound above; to avoid duplicate create, we dispatch custom event
  const ev = new Event('submitOriginal');
  document.getElementById('submit-form').dispatchEvent(ev);
});

// the original create handler (kept idempotent) - only fired via submitOriginal
document.getElementById('submit-form').addEventListener('submitOriginal', async ()=>{
  // already implemented at top, but keep as fallback if needed
});

// ---------- LOAD SUBMISSIONS ----------
async function loadSubmissions(){
  submissionsContainer.innerHTML = 'កំពុងទាញទិន្នន័យ...';
  try {
    const snap = await db.collection(COLLECTION).orderBy('createdAt','desc').get();
    submissionsContainer.innerHTML = '';
    snap.forEach(doc => {
      const d = doc.data();
      const div = createEl('div','submission');

      const meta = createEl('div','meta');
      meta.innerHTML = `<strong>${escapeHtml(d.name||'')} ${escapeHtml(d.surname||'')}</strong> • ${escapeHtml(d.phone||'')}`;

      const status = createEl('div', d.status === 'មិនទាន់ដោះស្រាយ' ? 'status pending' : 'status done');
      status.textContent = d.status === 'មិនទាន់ដោះស្រាយ' ? 'មិនទាន់ដោះស្រាយ' : 'ដោះស្រាយរួច';
      meta.appendChild(status);
      div.appendChild(meta);

      if (d.photoUrl) {
        const img = createEl('img'); img.src = d.photoUrl; img.alt = 'photo'; img.style.maxWidth = '120px';
        div.appendChild(img);
      }

      const info = createEl('div','info');
      info.innerHTML = `<div>លេខលិខិត: ${escapeHtml(d.passport||'')}</div>
                        <div>សញ្ជាតិ: ${escapeHtml(d.nationality||'')}</div>
                        <div>អាសយដ្ឋាន: ${escapeHtml(d.address||'')}</div>
                        <div>មូលហេតុ: ${escapeHtml(d.reason||'')}</div>
                        <div>ថ្ងៃខែឆ្នាំ កើតហេតុ: ${escapeHtml(d.incidentDate||'')}</div>`;
      div.appendChild(info);

      // edit permission
      const createdAt = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().getTime() : null;
      const now = Date.now();
      const canEdit = createdAt ? ((now - createdAt) < (2*24*60*60*1000) || (currentUser && currentUser.email === ADMIN_EMAIL)) : (currentUser && currentUser.email === ADMIN_EMAIL);
      if (canEdit) {
        const editBtn = createEl('button'); editBtn.textContent = 'កែសម្រួល'; editBtn.onclick = ()=> openEdit(doc.id, d);
        div.appendChild(editBtn);
      }

      const dots = createEl('div','dots'); dots.textContent = '⋯';
      dots.onclick = (e)=>{
        e.stopPropagation();
        if (!(currentUser && currentUser.email === ADMIN_EMAIL)) { alert('អនុញ្ញាតសម្រាប់អ្នកគម្រោងប៉ុណ្ណោះ'); return; }
        const menu = createEl('div','menu');
        menu.style.position = 'absolute'; menu.style.right = '12px'; menu.style.top = '36px';
        menu.style.background = 'var(--card)'; menu.style.border = '1px solid rgba(0,0,0,0.08)'; menu.style.padding = '6px';
        const opt1 = createEl('div'); opt1.textContent = 'ដោះស្រាយរួច'; opt1.onclick = async ()=>{ await db.collection(COLLECTION).doc(doc.id).update({ status:'ដោះស្រាយរួច' }); loadSubmissions(); };
        const opt2 = createEl('div'); opt2.textContent = 'មិនទាន់ដោះស្រាយ'; opt2.onclick = async ()=>{ await db.collection(COLLECTION).doc(doc.id).update({ status:'មិនទាន់ដោះស្រាយ' }); loadSubmissions(); };
        menu.appendChild(opt1); menu.appendChild(opt2);
        div.appendChild(menu);
        document.addEventListener('click', ()=> menu.remove(), { once:true });
      };
      div.appendChild(dots);

      submissionsContainer.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    submissionsContainer.innerHTML = 'មិនអាចទាញទិន្នន័យបាន';
  }
}

// escape helper
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[m]); }

// ---------- PDF EXPORT (combined) ----------
async function exportCombinedPDF() {
  try {
    const snap = await db.collection(COLLECTION).orderBy('createdAt','asc').get();

    // Try exact uploaded path first (developer requested exact path). Fallback to assets/form_template.jpeg.
    const candidatePaths = [
      '/mnt/data/photo_2025-11-17 09.48.51.jpeg', // your uploaded local path (will be transformed when packaging)
      'assets/form_template.jpeg'
    ];

    // find a path that loads successfully
    let bgDataUrl = null;
    for (const p of candidatePaths) {
      try {
        const bg = await loadLocalOrRemoteImageToDataURL(p);
        if (bg) { bgDataUrl = bg; break; }
      } catch(e){ /* try next */ }
    }
    if (!bgDataUrl) throw new Error('PDF background not available');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a4' });

    let first = true;
    for (const d of snap.docs) {
      if (!first) doc.addPage();
      first = false;
      const rec = d.data();

      // background page
      doc.addImage(bgDataUrl, 'JPEG', 0, 0, 210, 297);

      // Coordinates (mm) tuned for your template — if you need micro-adjustment tell me which field
      const xName = 26, yName = 58;
      const xSurname = 26, ySurname = 67;
      const xPassport = 140, yPassport = 58;
      const xPhone = 140, yPhone = 67;
      const xNationality = 26, yNationality = 76;
      const xAddress = 26, yAddress = 85;
      const xReason = 26, yReason = 110;
      const xIncidentDate = 140, yIncidentDate = 90; // new date box position
      const imgBoxX = 156, imgBoxY = 30, imgBoxW = 38, imgBoxH = 48;

      doc.setFontSize(12);
      doc.text(String(rec.name || ''), xName, yName);
      doc.text(String(rec.surname || ''), xSurname, ySurname);
      doc.text(String(rec.passport || ''), xPassport, yPassport);
      doc.text(String(rec.phone || ''), xPhone, yPhone);
      doc.text(String(rec.nationality || ''), xNationality, yNationality);

      const addrLines = doc.splitTextToSize(String(rec.address || ''), 120);
      doc.text(addrLines, xAddress, yAddress);

      const reasonLines = doc.splitTextToSize(String(rec.reason || ''), 150);
      doc.text(reasonLines, xReason, yReason);

      // incident date: print in Khmer locale formatted YYYY-MM-DD -> human readable
      if (rec.incidentDate) {
        // rec.incidentDate stored as ISO yyyy-mm-dd
        doc.text(String(rec.incidentDate), xIncidentDate, yIncidentDate);
      }

      if (rec.photoUrl) {
        try {
          const dataUrl = await loadImageToDataURL(rec.photoUrl);
          doc.addImage(dataUrl, 'JPEG', imgBoxX, imgBoxY, imgBoxW, imgBoxH);
        } catch (err) {
          console.warn('Could not add record image to PDF', err);
        }
      }
    }

    doc.save('TBK_REPORT_COMBINED.pdf');
  } catch (err) {
    console.error(err);
    alert('មិនអាចនាំចេញ PDF បាន');
  }
}

// helper: load remote or local image path into dataURL
function loadLocalOrRemoteImageToDataURL(path){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img,0,0);
      try { resolve(c.toDataURL('image/jpeg', 0.92)); } catch(e){ reject(e); }
    };
    img.onerror = function(){ reject(new Error('image load error')); };
    img.src = path;
  });
}

// convert remote image to dataURL
function loadImageToDataURL(url){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img,0,0);
      try { resolve(c.toDataURL('image/jpeg', 0.9)); } catch(e){ reject(e); }
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ---------- CSV EXPORT ----------
async function exportCSV(){
  try {
    const snap = await db.collection(COLLECTION).orderBy('createdAt','asc').get();
    let csv = '\uFEFFname,surname,passport,phone,nationality,address,reason,incidentDate,status,createdAt\n';
    snap.forEach(doc => {
      const r = doc.data();
      const when = r.createdAt && r.createdAt.toDate ? r.createdAt.toDate().toLocaleString('km-KH') : '';
      csv += `"${(r.name||'').replace(/"/g,'""')}","${(r.surname||'').replace(/"/g,'""')}","${(r.passport||'').replace(/"/g,'""')}","${(r.phone||'').replace(/"/g,'""')}","${(r.nationality||'').replace(/"/g,'""')}","${(r.address||'').replace(/"/g,'""')}","${(r.reason||'').replace(/"/g,'""')}","${(r.incidentDate||'')}","${(r.status||'')}","${when}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'TBK_REPORT.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    console.error(err);
    alert('មិនអាចនាំចេញ CSV បាន');
  }
}

// wire exports and reports
$('#export-pdf').addEventListener('click', exportCombinedPDF);
$('#export-excel').addEventListener('click', exportCSV);

document.querySelectorAll('.reports button').forEach(btn=>{
  btn.onclick = async ()=>{
    const range = btn.dataset.range;
    const now = Date.now();
    let start = 0;
    if (range==='day') start = now - (24*60*60*1000);
    if (range==='week') start = now - (7*24*60*60*1000);
    if (range==='month') start = now - (30*24*60*60*1000);
    if (range==='year') start = now - (365*24*60*60*1000);

    try {
      const snap = await db.collection(COLLECTION).where('createdAt','>=', firebase.firestore.Timestamp.fromMillis(start)).get();
      alert(`មាន ${snap.size} សំណើក្នុងរយៈពេលនេះ`);
    } catch (err) {
      console.error(err);
      alert('មិនអាចទាញរបាយការណ៍បាន');
    }
  };
});

// initial load
window.addEventListener('load', ()=>{
  if (window.db) loadSubmissions();
});
