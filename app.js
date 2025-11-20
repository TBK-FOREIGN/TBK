const ADMIN_EMAIL = "foreign@tbk.com";
const ADMIN_PASSWORD = "TBK123*@";
const COLLECTION = "submissions";
const $ = (s) => document.querySelector(s);
const createEl = (t, c) => { const e = document.createElement(t); if (c) e.className = c; return e; };

(function initTheme(){
  const m = localStorage.getItem('tbk_mode') || 'light';
  document.documentElement.setAttribute('data-theme', m);
  const themeBtn = $('#theme-toggle');
  if (themeBtn) themeBtn.textContent = m === 'light' ? 'Dark' : 'Light';
})();

const themeBtn = $('#theme-toggle');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tbk_mode', next);
    themeBtn.textContent = next === 'light' ? 'Dark' : 'Light';
  });
}

let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

function showLogin(){ if ($('#login-section')) $('#login-section').style.display='block'; if ($('#panel')) $('#panel').style.display='none'; if ($('#logout-btn')) $('#logout-btn').style.display='none'; }
function showApp(){ if ($('#login-section')) $('#login-section').style.display='none'; if ($('#panel')) $('#panel').style.display='block'; if ($('#logout-btn')) $('#logout-btn').style.display='inline-block'; }

if (currentUser) { showApp(); loadSubmissions(); } else { showLogin(); }

const loginForm = $('#login-form');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
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
}

const logoutBtn = $('#logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    currentUser = null;
    showLogin();
  });
}

async function uploadFileIfPresent(file, destPathPrefix){
  if (!file) return null;
  const filename = `${Date.now()}_${file.name}`;
  const path = `${destPathPrefix}${filename}`;
  const ref = storage.ref(path);
  await ref.put(file);
  const url = await ref.getDownloadURL();
  return { path, url };
}

const submitForm = $('#submit-form');
if (submitForm) {
  submitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitForm.dataset.editId) {
      return;
    }
    const payload = {
      source: $('#source').value.trim(),
      name: $('#name').value.trim(),
      surname: $('#surname').value.trim(),
      passport: $('#passport').value.trim(),
      birthplace: $('#birthplace').value.trim(),
      nationality: $('#nationality').value.trim(),
      father: $('#father').value.trim(),
      mother: $('#mother').value.trim(),
      address: $('#address').value.trim(),
      request_case: $('#request_case').value.trim(),
      reason: $('#reason').value.trim(),
      incidentDate: $('#incident_date').value || null,
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
      submitForm.reset();
      loadSubmissions();
    } catch (err) {
      console.error(err);
      alert('មានបញ្ហា — មិនអាចរក្សាទិន្នន័យបាន');
    }
  });
}

const resetBtn = $('#reset-form');
if (resetBtn) resetBtn.addEventListener('click', ()=> submitForm.reset());

function openEdit(id, data){
  $('#source').value = data.source || '';
  $('#name').value = data.name || '';
  $('#surname').value = data.surname || '';
  $('#passport').value = data.passport || '';
  $('#birthplace').value = data.birthplace || '';
  $('#nationality').value = data.nationality || '';
  $('#father').value = data.father || '';
  $('#mother').value = data.mother || '';
  $('#address').value = data.address || '';
  $('#request_case').value = data.request_case || '';
  $('#reason').value = data.reason || '';
  $('#incident_date').value = data.incidentDate || '';
  submitForm.dataset.editId = id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveEditIfPresent(){
  if (!submitForm.dataset.editId) return false;
  const id = submitForm.dataset.editId;
  const update = {
    source: $('#source').value.trim(),
    name: $('#name').value.trim(),
    surname: $('#surname').value.trim(),
    passport: $('#passport').value.trim(),
    birthplace: $('#birthplace').value.trim(),
    nationality: $('#nationality').value.trim(),
    father: $('#father').value.trim(),
    mother: $('#mother').value.trim(),
    address: $('#address').value.trim(),
    request_case: $('#request_case').value.trim(),
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
    delete submitForm.dataset.editId;
    return true;
  } catch (err) {
    console.error(err);
    alert('កំហុសពេលកែប្រែ');
    return false;
  }
}

submitForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (submitForm.dataset.editId) {
    const ok = await saveEditIfPresent();
    if (ok) { alert('បានកែប្រែ'); loadSubmissions(); submitForm.reset(); }
    return;
  }
});

async function loadSubmissions(){
  const container = $('#submissions');
  if (!container) return;
  container.innerHTML = 'កំពុងទាញទិន្នន័យ...';
  try {
    const snap = await db.collection(COLLECTION).orderBy('createdAt','desc').get();
    container.innerHTML = '';
    snap.forEach(doc => {
      const d = doc.data();
      const div = createEl('div','submission');
      const meta = createEl('div','meta');
      meta.innerHTML = `<strong>${escapeHtml(d.name||'')} ${escapeHtml(d.surname||'')}</strong> • ${escapeHtml(d.source||'')}`;
      const status = createEl('div', d.status === 'មិនទាន់ដោះស្រាយ' ? 'status pending' : 'status done');
      status.textContent = d.status === 'មិនទាន់ដោះស្រាយ' ? 'មិនទាន់ដោះស្រាយ' : 'ដោះស្រាយរួច';
      meta.appendChild(status);
      div.appendChild(meta);
      if (d.photoUrl) {
        const img = createEl('img');
        img.src = d.photoUrl;
        img.alt = 'photo';
        img.style.maxWidth = '120px';
        div.appendChild(img);
      }
      const info = createEl('div','info');
      info.innerHTML = `<div>លេខលិខិត: ${escapeHtml(d.passport||'')}</div>
                        <div>ទីកន្លែងកំណើត: ${escapeHtml(d.birthplace||'')}</div>
                        <div>សញ្ជាតិ: ${escapeHtml(d.nationality||'')}</div>
                        <div>ឪពុក: ${escapeHtml(d.father||'')}</div>
                        <div>ម្ដាយ: ${escapeHtml(d.mother||'')}</div>
                        <div>អាសយដ្ឋាន: ${escapeHtml(d.address||'')}</div>
                        <div>ស្នើឲ្យជួយ: ${escapeHtml(d.request_case||'')}</div>
                        <div>មូលហេតុ: ${escapeHtml(d.reason||'')}</div>
                        <div>ថ្ងៃខែឆ្នាំកើតហេតុ: ${escapeHtml(d.incidentDate||'')}</div>`;
      div.appendChild(info);
      const createdAt = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().getTime() : null;
      const now = Date.now();
      const canEdit = createdAt ? ((now - createdAt) < (2*24*60*60*1000) || (currentUser && currentUser.email === ADMIN_EMAIL)) : (currentUser && currentUser.email === ADMIN_EMAIL);
      if (canEdit) {
        const editBtn = createEl('button');
        editBtn.textContent = 'កែសម្រួល';
        editBtn.onclick = ()=> openEdit(doc.id, d);
        div.appendChild(editBtn);
      }
      const dots = createEl('div','dots');
      dots.textContent = '⋯';
      dots.onclick = (e)=>{
        e.stopPropagation();
        if (!(currentUser && currentUser.email === ADMIN_EMAIL)) { alert('អនុញ្ញាតសម្រាប់អ្នកគម្រោងប៉ុណ្ណោះ'); return; }
        const menu = createEl('div');
        menu.style.position = 'absolute';
        menu.style.right = '12px';
        menu.style.top = '36px';
        menu.style.background = 'var(--card)';
        menu.style.border = '1px solid rgba(0,0,0,0.08)';
        menu.style.padding = '6px';
        const opt1 = createEl('div'); opt1.textContent = 'ដោះស្រាយរួច'; opt1.onclick = async ()=>{ await db.collection(COLLECTION).doc(doc.id).update({ status:'ដោះស្រាយរួច' }); loadSubmissions(); };
        const opt2 = createEl('div'); opt2.textContent = 'មិនទាន់ដោះស្រាយ'; opt2.onclick = async ()=>{ await db.collection(COLLECTION).doc(doc.id).update({ status:'មិនទាន់ដោះស្រាយ' }); loadSubmissions(); };
        menu.appendChild(opt1); menu.appendChild(opt2);
        div.appendChild(menu);
        document.addEventListener('click', ()=> menu.remove(), {once:true});
      };
      div.appendChild(dots);
      container.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = 'មិនអាចទាញទិន្នន័យបាន';
  }
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[m]); }

async function exportCombinedPDF(){
  try {
    const snap = await db.collection(COLLECTION).orderBy('createdAt','asc').get();
    const candidatePaths = ['/mnt/data/photo_2025-11-17 09.48.51.jpeg','assets/form_template.jpeg'];
    let bgDataUrl = null;
    for (const p of candidatePaths) {
      try {
        const bg = await loadLocalOrRemoteImageToDataURL(p);
        if (bg) { bgDataUrl = bg; break; }
      } catch(e){}
    }
    if (!bgDataUrl) throw new Error('PDF background not available');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a4' });
    let first = true;
    for (const d of snap.docs) {
      if (!first) doc.addPage();
      first = false;
      const rec = d.data();
      doc.addImage(bgDataUrl, 'JPEG', 0, 0, 210, 297);
      const xFrom = 26, yFrom = 52, xName = 26, yName = 60, xSurname = 26, ySurname = 68, xPassport = 140, yPassport = 60, xBirth = 26, yBirth = 76, xNationality = 140, yNationality = 76, xFather = 26, yFather = 92, xMother = 140, yMother = 92, xAddress = 26, yAddress = 100, xRequest = 26, yRequest = 120, xReason = 26, yReason = 140, xIncident = 140, yIncident = 100, imgX = 156, imgY = 30, imgW = 38, imgH = 48;
      doc.setFontSize(12);
      doc.text(String(rec.source || ''), xFrom, yFrom);
      doc.text(String(rec.name || ''), xName, yName);
      doc.text(String(rec.surname || ''), xSurname, ySurname);
      doc.text(String(rec.passport || ''), xPassport, yPassport);
      doc.text(String(rec.birthplace || ''), xBirth, yBirth);
      doc.text(String(rec.nationality || ''), xNationality, yNationality);
      doc.text(String(rec.father || ''), xFather, yFather);
      doc.text(String(rec.mother || ''), xMother, yMother);
      const addrLines = doc.splitTextToSize(String(rec.address || ''), 120);
      doc.text(addrLines, xAddress, yAddress);
      const reqLines = doc.splitTextToSize(String(rec.request_case || ''), 150);
      doc.text(reqLines, xRequest, yRequest);
      const reasonLines = doc.splitTextToSize(String(rec.reason || ''), 150);
      doc.text(reasonLines, xReason, yReason);
      if (rec.incidentDate) doc.text(String(rec.incidentDate), xIncident, yIncident);
      if (rec.photoUrl) {
        try {
          const dataUrl = await loadImageToDataURL(rec.photoUrl);
          doc.addImage(dataUrl, 'JPEG', imgX, imgY, imgW, imgH);
        } catch (err) {}
      }
    }
    doc.save('TBK_REPORT_COMBINED.pdf');
  } catch (err) {
    console.error(err);
    alert('មិនអាចនាំចេញ PDF បាន');
  }
}

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

async function exportCSV(){
  try {
    const snap = await db.collection(COLLECTION).orderBy('createdAt','asc').get();
    let csv = '\uFEFFsource,name,surname,passport,birthplace,nationality,father,mother,address,request_case,reason,incidentDate,status,createdAt\n';
    snap.forEach(doc => {
      const r = doc.data();
      const when = r.createdAt && r.createdAt.toDate ? r.createdAt.toDate().toLocaleString('km-KH') : '';
      csv += `"${(r.source||'').replace(/"/g,'""')}","${(r.name||'').replace(/"/g,'""')}","${(r.surname||'').replace(/"/g,'""')}","${(r.passport||'').replace(/"/g,'""')}","${(r.birthplace||'').replace(/"/g,'""')}","${(r.nationality||'').replace(/"/g,'""')}","${(r.father||'').replace(/"/g,'""')}","${(r.mother||'').replace(/"/g,'""')}","${(r.address||'').replace(/"/g,'""')}","${(r.request_case||'').replace(/"/g,'""')}","${(r.reason||'').replace(/"/g,'""')}","${(r.incidentDate||'')}","${(r.status||'')}","${when}"\n`;
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

const exportPdfBtn = $('#export-pdf');
if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportCombinedPDF);
const exportExcelBtn = $('#export-excel');
if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportCSV);

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

window.addEventListener('load', ()=>{
  if (window.db) loadSubmissions();
});
