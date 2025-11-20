// Cleaned app.js - single submit handler, realtime updates, search & filters
// Assumes firebase-init.js already defines `db` (Firestore) and `storage` (Storage)
// and that index.html contains matching element IDs.

const ADMIN_EMAIL = "foreign@tbk.com";
const ADMIN_PASSWORD = "TBK123*@";
const COLLECTION = "submissions";

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const createEl = (t, c) => { const e = document.createElement(t); if (c) e.className = c; return e; };

// Theme init
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

// Simple local auth (no Firebase Auth)
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
function showLogin(){ if ($('#login-section')) $('#login-section').style.display='block'; if ($('#panel')) $('#panel').style.display='none'; if ($('#logout-btn')) $('#logout-btn').style.display='none'; }
function showApp(){ if ($('#login-section')) $('#login-section').style.display='none'; if ($('#panel')) $('#panel').style.display='block'; if ($('#logout-btn')) $('#logout-btn').style.display='inline-block'; }

if (currentUser) { showApp(); } else { showLogin(); }

// Login handler
const loginForm = $('#login-form');
if (loginForm) {
  loginForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = $('#email').value.trim();
    const pwd = $('#password').value;
    if (email === ADMIN_EMAIL && pwd === ADMIN_PASSWORD) {
      currentUser = { email };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      showApp();
      startRealtimeListener();
    } else {
      alert('អ៊ីមែល ឬ លេខសម្ងាត់ មិនត្រឹមត្រូវ');
    }
  });
}

// logout
const logoutBtn = $('#logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', ()=>{
  localStorage.removeItem('currentUser');
  currentUser = null;
  location.reload();
});

// Helper - upload file to storage
async function uploadFileIfPresent(file, destPathPrefix){
  if (!file) return null;
  const filename = `${Date.now()}_${file.name}`;
  const path = `${destPathPrefix}${filename}`;
  const ref = storage.ref(path);
  await ref.put(file);
  const url = await ref.getDownloadURL();
  return { path, url };
}

// Single submit handler (create or edit)
const submitForm = $('#submit-form');
if (submitForm) {
  submitForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    // if editing
    if (submitForm.dataset.editId) {
      await handleEditSave();
      return;
    }
    // create new
    const payload = gatherFormData();
    try {
      console.log('Creating record...', payload);
      const docRef = await db.collection(COLLECTION).add(payload);
      const file = $('#photo').files[0];
      if (file) {
        const uploaded = await uploadFileIfPresent(file, 'photos/user-uploads/');
        if (uploaded && uploaded.url) {
          await db.collection(COLLECTION).doc(docRef.id).update({ photoUrl: uploaded.url, photoPath: uploaded.path });
        }
      }
      alert('បានរក្សាទុក'); // saved
      submitForm.reset();
      // if realtime listener is active, list updates automatically; otherwise refresh
      // loadSubmissions();
    } catch (err) {
      console.error('Create error', err);
      alert('មានបញ្ហា — មិនអាចរក្សាទិន្នន័យបាន: ' + (err.message||err));
    }
  });
}

// helper to gather form fields (matching IDs)
function gatherFormData(){
  return {
    source: ($('#source') ? $('#source').value.trim() : ''),
    name: ($('#name') ? $('#name').value.trim() : ''),
    surname: ($('#surname') ? $('#surname').value.trim() : ''),
    passport: ($('#passport') ? $('#passport').value.trim() : ''),
    birthplace: ($('#birthplace') ? $('#birthplace').value.trim() : ''),
    nationality: ($('#nationality') ? $('#nationality').value.trim() : ''),
    father: ($('#father') ? $('#father').value.trim() : ''),
    mother: ($('#mother') ? $('#mother').value.trim() : ''),
    address: ($('#address') ? $('#address').value.trim() : ''),
    request_case: ($('#request_case') ? $('#request_case').value.trim() : ''),
    reason: ($('#reason') ? $('#reason').value.trim() : ''),
    incidentDate: ($('#incident_date') ? $('#incident_date').value : null),
    status: 'មិនទាន់ដោះស្រាយ',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
}

// Edit flow
function openEdit(id, data){
  if (!submitForm) return;
  submitForm.dataset.editId = id;
  if ($('#source')) $('#source').value = data.source || '';
  if ($('#name')) $('#name').value = data.name || '';
  if ($('#surname')) $('#surname').value = data.surname || '';
  if ($('#passport')) $('#passport').value = data.passport || '';
  if ($('#birthplace')) $('#birthplace').value = data.birthplace || '';
  if ($('#nationality')) $('#nationality').value = data.nationality || '';
  if ($('#father')) $('#father').value = data.father || '';
  if ($('#mother')) $('#mother').value = data.mother || '';
  if ($('#address')) $('#address').value = data.address || '';
  if ($('#request_case')) $('#request_case').value = data.request_case || '';
  if ($('#reason')) $('#reason').value = data.reason || '';
  if ($('#incident_date')) $('#incident_date').value = data.incidentDate || '';
  window.scrollTo({top:0, behavior:'smooth'});
}

async function handleEditSave(){
  const id = submitForm.dataset.editId;
  if (!id) return;
  const update = gatherFormData();
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
    alert('បានកែប្រែ');
    submitForm.reset();
  } catch (err) {
    console.error('Edit save error', err);
    alert('កំហុសពេលកែប្រែ: ' + (err.message||err));
  }
}

// Real-time listener and rendering
let activeUnsubscribe = null;
function startRealtimeListener(queryConstraints = []) {
  if (activeUnsubscribe) activeUnsubscribe(); // stop previous
  let ref = db.collection(COLLECTION).orderBy('createdAt', 'desc');
  // apply constraints if any (handled via client side for search/filters)
  activeUnsubscribe = ref.onSnapshot(snapshot => {
    renderList(snapshot.docs.map(d => ({ id: d.id, data: d.data() })));
  }, err=>{
    console.error('Realtime error', err);
  });
}

// render list
function renderList(items){
  const container = $('#submissions') || $('#request-list') || document.createElement('div');
  container.innerHTML = '';
  items.forEach(item=>{
    const d = item.data || item;
    const id = item.id || '';
    const row = createEl('div','submission-row');
    const meta = createEl('div','meta');
    meta.innerHTML = `<strong>${escapeHtml(d.name||'')} ${escapeHtml(d.surname||'')}</strong> • ${escapeHtml(d.source||'')}`;
    const statusClass = (d.status === 'មិនទាន់ដោះស្រាយ' || d.status==='pending') ? 'status pending' : 'status done';
    const statusElem = createEl('div', statusClass);
    statusElem.textContent = (d.status === 'មិនទាន់ដោះស្រាយ' || d.status==='pending') ? 'មិនទាន់ដោះស្រាយ' : 'ដោះស្រាយរួច';
    meta.appendChild(statusElem);
    row.appendChild(meta);

    if (d.photoUrl) {
      const img = createEl('img');
      img.src = d.photoUrl;
      img.alt = 'photo';
      img.style.maxWidth = '100px';
      img.style.marginLeft = '12px';
      row.appendChild(img);
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
    row.appendChild(info);

    // actions
    const actions = createEl('div','actions');
    const editBtn = createEl('button','small');
    editBtn.textContent = 'កែសម្រួល';
    editBtn.onclick = ()=> openEdit(id, d);
    actions.appendChild(editBtn);

    const dots = createEl('button','small dots-btn');
    dots.textContent = '⋯';
    dots.onclick = (e)=>{
      e.stopPropagation();
      if (!(currentUser && currentUser.email === ADMIN_EMAIL)) { alert('អនុញ្ញាតសម្រាប់អ្នកគម្រោងប៉ុណ្ណោះ'); return; }
const menu = createEl('div','popup-menu');

const opt1 = createEl('div');
opt1.textContent = 'ដោះស្រាយរួច';
opt1.onclick = async () => {
  await db.collection(COLLECTION).doc(id).update({ status: 'ដោះស្រាយរួច' });
};

const opt2 = createEl('div');
opt2.textContent = 'មិនទាន់ដោះស្រាយ';
opt2.onclick = async () => {
  await db.collection(COLLECTION).doc(id).update({ status: 'មិនទាន់ដោះស្រាយ' });
};

menu.appendChild(opt1);
menu.appendChild(opt2);
row.appendChild(menu);
document.addEventListener('click', () => menu.remove(), { once: true });

    };
    actions.appendChild(dots);

    row.appendChild(actions);

    container.appendChild(row);
  });
}

// escape
function escapeHtml(s){
  return String(s || '');
}

// Search & filters
let lastQuery = '';
let debounceTimer = null;
function applyClientFilters(){
  // we will fetch all and filter client-side for simplicity (small datasets)
  db.collection(COLLECTION).orderBy('createdAt','desc').get().then(snap=>{
    let items = snap.docs.map(d=>({ id: d.id, data: d.data() }));
    const q = ($('#global-search') ? $('#global-search').value.trim().toLowerCase() : '');
    const status = ($('#status-filter') ? $('#status-filter').value : 'all');
    const dateFrom = ($('#date-from') ? $('#date-from').value : '');
    const dateTo = ($('#date-to') ? $('#date-to').value : '');
    if (q) {
      items = items.filter(it=>{
        const d = it.data || {};
        return (String(d.name||'')+ ' ' + String(d.surname||'') + ' ' + String(d.passport||'') + ' ' + String(d.request_case||'')).toLowerCase().includes(q);
      });
    }
    if (status && status !== 'all') {
      if (status === 'pending') items = items.filter(it => (it.data.status === 'មិនទាន់ដោះស្រាយ' || it.data.status === 'pending'));
      else items = items.filter(it => (it.data.status === 'ដោះស្រាយរួច' || it.data.status === 'done'));
    }
    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      items = items.filter(it => {
        if (!it.data.createdAt) return false;
        const t = it.data.createdAt.toDate ? it.data.createdAt.toDate().getTime() : (it.data.createdAt.seconds?it.data.createdAt.seconds*1000:0);
        return t >= fromTime;
      });
    }
    if (dateTo) {
      const toTime = new Date(dateTo).getTime() + (24*60*60*1000 - 1);
      items = items.filter(it => {
        if (!it.data.createdAt) return false;
        const t = it.data.createdAt.toDate ? it.data.createdAt.toDate().getTime() : (it.data.createdAt.seconds?it.data.createdAt.seconds*1000:0);
        return t <= toTime;
      });
    }
    renderList(items);
  }).catch(err=>{
    console.error('Filter fetch error', err);
  });
}

const searchInput = $('#global-search');
if (searchInput) {
  searchInput.addEventListener('input', ()=>{
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(()=>{ applyClientFilters(); }, 350);
  });
}
const applyBtn = $('#apply-filters');
if (applyBtn) applyBtn.addEventListener('click', applyClientFilters);
const clearBtn = $('#clear-filters');
if (clearBtn) clearBtn.addEventListener('click', ()=>{
  if ($('#global-search')) $('#global-search').value = '';
  if ($('#status-filter')) $('#status-filter').value = 'all';
  if ($('#date-from')) $('#date-from').value = '';
  if ($('#date-to')) $('#date-to').value = '';
  applyClientFilters();
});

// start realtime listener on login or page load
function initApp(){
  if (currentUser) {
    startRealtimeListener();
  }
}
initApp();

