/* ============================================================
   Student Management System — app.js
   Frontend: Vanilla JavaScript
   Backend:  Spring Boot REST API (port 8080)
   DB1:      MongoDB  → student records
   DB2:      MySQL    → audit_logs via JDBC/JdbcTemplate
   ============================================================ */

'use strict';

/* ── API base URL ─────────────────────────────────────────── */
const BACKEND_BASE = (
  window.location.protocol === 'file:' ||
  (window.location.port !== '8080' && window.location.port !== '')
) ? 'http://localhost:8080' : '';

const API_STUDENTS  = `${BACKEND_BASE}/api/students`;
const API_LOGS      = `${BACKEND_BASE}/api/audit-logs`;
const API_STATUS    = `${BACKEND_BASE}/api/status`;

/* ── State ─────────────────────────────────────────────────── */
let allStudents       = [];   // full list from MongoDB
let filteredStudents  = [];   // after search/filter/sort
let currentPage       = 1;
const PAGE_SIZE       = 8;
let sessionAdded      = 0;    // count added in this session
let currentDetailId   = null; // id shown in modal

/* ── DOM shortcuts ─────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const qs = (sel) => document.querySelector(sel);

/* ─────────────────────────────────────────────────────────────
   NAVIGATION
───────────────────────────────────────────────────────────── */
const SECTIONS = ['dashboard', 'students', 'add-student', 'activity'];
const PAGE_TITLES = {
  dashboard:     'Dashboard',
  students:      'Students',
  'add-student': 'Add Student',
  activity:      'Activity Logs'
};

function navigateTo(sectionId) {
  // Hide all sections
  SECTIONS.forEach(id => {
    const el = $(`section-${id}`);
    if (el) el.classList.remove('active');
    const nav = $(`nav-${id === 'add-student' ? 'add' : id === 'activity' ? 'activity' : id}`);
    if (nav) nav.classList.remove('active');
  });

  // Show target
  const section = $(`section-${sectionId}`);
  if (section) section.classList.add('active');

  // Highlight sidebar link
  const navId = sectionId === 'add-student' ? 'nav-add' : `nav-${sectionId}`;
  const navEl = $(navId);
  if (navEl) navEl.classList.add('active');

  // Update topbar title
  $('page-title').textContent = PAGE_TITLES[sectionId] || '';

  // Lazy-load section data
  if (sectionId === 'students')   renderStudents();
  if (sectionId === 'dashboard')  loadDashboard();
  if (sectionId === 'activity')   loadAuditLogs();
  if (sectionId === 'add-student' && !$('student-id').value) resetForm();
}

// Sidebar nav click handlers
document.querySelectorAll('.nav-item').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const sec = link.dataset.section;
    if (sec) navigateTo(sec);
    // Close sidebar on mobile
    if (window.innerWidth <= 768) closeSidebar();
  });
});

// Hamburger toggle
$('hamburger-btn').addEventListener('click', () => {
  const sidebar = $('sidebar') || qs('.sidebar');
  sidebar.classList.toggle('open');
});

function closeSidebar() {
  const sidebar = qs('.sidebar');
  if (sidebar) sidebar.classList.remove('open');
}

// Topbar refresh button
$('topbar-refresh').addEventListener('click', () => {
  const active = qs('.page-section.active');
  if (!active) return;
  if (active.id === 'section-students')   { loadStudentsFromAPI(); }
  if (active.id === 'section-dashboard')  { loadDashboard(); }
  if (active.id === 'section-activity')   { loadAuditLogs(); }
});

/* ─────────────────────────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────────────────────────── */
function toast(message, type = 'success') {
  const container = $('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;

  const icons = {
    success: '✓',
    error:   '✕',
    info:    'ℹ'
  };
  el.innerHTML = `<span style="font-weight:700;font-size:15px">${icons[type] || '•'}</span> ${escapeHtml(message)}`;
  container.appendChild(el);

  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 350);
  }, 3500);
}

/* ─────────────────────────────────────────────────────────────
   UTILITY HELPERS
───────────────────────────────────────────────────────────── */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/** Wrapper around fetch – throws on non-OK response with server's message */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await res.json();
        detail = body.message || body.detail || body.error || body.title || detail;
      }
    } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  // Guard: only parse as JSON if the server says it's JSON
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    // Unexpected HTML/text response – treat as an error
    const text = await res.text();
    throw new Error(`Expected JSON but got: ${text.slice(0, 80)}`);
  }
  return res.json();
}

/** Generate avatar background colour deterministically from name */
function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `av-${Math.abs(hash) % 8}`;
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function formatDateTime(raw) {
  if (!raw) return '—';
  const d = new Date(typeof raw === 'number' ? raw : raw.replace ? raw.replace(' ', 'T') : raw);
  if (isNaN(d)) return String(raw);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─────────────────────────────────────────────────────────────
   STATUS INDICATORS
───────────────────────────────────────────────────────────── */
async function checkStatus() {
  try {
    const s = await apiFetch(API_STATUS);

    // Backend is always connected if this endpoint responds
    setStatusRow('backend', true, 'connected');

    // MongoDB: 'connected' (Spring Boot) | 'na' (Node.js dev server)
    setStatusRow('mongodb', s.mongodb === 'connected', s.mongodb);

  } catch {
    setStatusRow('backend', false, 'error');
    setStatusRow('mongodb', false, 'error');
  }
}

function setStatusRow(key, ok, rawValue) {
  const dot = $(`dot-${key}`);
  const val = $(`val-${key}`);
  if (!dot && !val) return; // element doesn't exist in this layout

  // Determine display text and colour class
  let text, cls, dotCls;

  if (rawValue === 'na') {
    text   = 'N/A';
    cls    = 'na';
    dotCls = 'na';
  } else if (rawValue === 'json') {
    text   = 'JSON';
    cls    = 'ok';
    dotCls = 'ok';
  } else if (rawValue === 'error' || rawValue === 'Offline') {
    text   = 'Offline';
    cls    = 'error';
    dotCls = 'error';
  } else if (ok) {
    text   = 'OK';
    cls    = 'ok';
    dotCls = 'ok';
  } else {
    text   = 'Offline';
    cls    = 'error';
    dotCls = 'error';
  }

  if (dot) dot.className = `status-dot ${dotCls}`;
  if (val) {
    val.textContent = text;
    val.className   = `status-val ${cls}`;
  }
}

/* ─────────────────────────────────────────────────────────────
   STUDENT DATA — LOAD FROM MONGODB
───────────────────────────────────────────────────────────── */
async function loadStudentsFromAPI() {
  try {
    allStudents = await apiFetch(API_STUDENTS);
    // Populate course filter dropdown
    populateCourseFilter();
    // Apply current filters and render
    applyFiltersAndRender();
    // Update nav badge
    $('nav-student-count').textContent = allStudents.length;
    return true;
  } catch (err) {
    allStudents = [];
    $('student-list').innerHTML = `
      <p class="empty-state" style="border-color:#fecaca;background:#fef2f2;color:#991b1b;">
        <strong>Cannot reach backend.</strong><br>
        ${escapeHtml(err.message)}<br>
        <small>Make sure the Spring Boot server is running on port 8080.</small>
      </p>`;
    $('nav-student-count').textContent = '0';
    return false;
  }
}

function populateCourseFilter() {
  const sel = $('filter-course');
  const courses = [...new Set(allStudents.map(s => s.course).filter(Boolean))].sort();
  const current = sel.value;
  sel.innerHTML = `<option value="">All Courses</option>` +
    courses.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if (courses.includes(current)) sel.value = current;
}

/* ─────────────────────────────────────────────────────────────
   FILTERING, SORTING, PAGINATION
───────────────────────────────────────────────────────────── */
function applyFiltersAndRender() {
  const query  = ($('search-input').value || '').trim().toLowerCase();
  const course = ($('filter-course').value || '').toLowerCase();
  const sort   = ($('sort-select').value || 'name-asc');

  filteredStudents = allStudents.filter(s => {
    const matchQuery  = !query  || s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query);
    const matchCourse = !course || (s.course || '').toLowerCase() === course;
    return matchQuery && matchCourse;
  });

  // Sort
  filteredStudents.sort((a, b) => {
    if (sort === 'name-asc')  return a.name.localeCompare(b.name);
    if (sort === 'name-desc') return b.name.localeCompare(a.name);
    if (sort === 'age-asc')   return a.age - b.age;
    if (sort === 'age-desc')  return b.age - a.age;
    return 0;
  });

  // Reset to page 1 when filters change
  currentPage = 1;
  renderStudents();
}

function renderStudents() {
  const total = filteredStudents.length;
  $('record-count').textContent = `${total} ${total === 1 ? 'student' : 'students'}`;

  if (total === 0) {
    $('student-list').innerHTML = `<p class="empty-state">No students match your search.<br><small>Try changing the filter or search term.</small></p>`;
    $('pagination').innerHTML = '';
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filteredStudents.slice(start, start + PAGE_SIZE);

  $('student-list').innerHTML = page.map(s => `
    <article class="student-card">
      <div class="student-card-header">
        <div class="student-avatar ${avatarColor(s.name)}">${escapeHtml(initials(s.name))}</div>
        <div>
          <p class="student-name">${escapeHtml(s.name)}</p>
          <p class="student-email">${escapeHtml(s.email)}</p>
        </div>
      </div>
      <div class="student-pills">
        <span class="pill pill-course">${escapeHtml(s.course)}</span>
        <span class="pill pill-age">Age ${escapeHtml(s.age)}</span>
      </div>
      <div class="student-card-actions">
        <button class="btn btn-ghost btn-sm" data-view="${escapeHtml(s.id)}">View</button>
        <button class="btn btn-secondary btn-sm" data-edit="${escapeHtml(s.id)}">Edit</button>
        <button class="btn btn-danger btn-sm"    data-delete="${escapeHtml(s.id)}" data-name="${escapeHtml(s.name)}">Delete</button>
      </div>
    </article>`).join('');

  renderPagination(total);
}

function renderPagination(total) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) { $('pagination').innerHTML = ''; return; }

  let html = `<button class="page-btn" id="pg-prev" ${currentPage===1?'disabled':''}>‹ Prev</button>`;
  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn ${i===currentPage?'active':''}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="page-btn" id="pg-next" ${currentPage===pages?'disabled':''}>Next ›</button>`;
  $('pagination').innerHTML = html;

  $('pagination').addEventListener('click', e => {
    const btn = e.target.closest('.page-btn');
    if (!btn) return;
    if (btn.id === 'pg-prev') { currentPage--; renderStudents(); }
    else if (btn.id === 'pg-next') { currentPage++; renderStudents(); }
    else if (btn.dataset.page) { currentPage = Number(btn.dataset.page); renderStudents(); }
  }, { once: true });
}

/* ─────────────────────────────────────────────────────────────
   STUDENT LIST CLICK — EDIT / DELETE / VIEW
───────────────────────────────────────────────────────────── */
$('student-list').addEventListener('click', async e => {
  const btn = e.target.closest('[data-view],[data-edit],[data-delete]');
  if (!btn) return;

  if (btn.dataset.view) {
    openModal(btn.dataset.view);
  }

  if (btn.dataset.edit) {
    startEditMode(btn.dataset.edit);
  }

  if (btn.dataset.delete) {
    const name = btn.dataset.name || 'this student';
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    try {
      await apiFetch(`${API_STUDENTS}/${encodeURIComponent(btn.dataset.delete)}`, { method: 'DELETE' });
      toast(`"${name}" deleted successfully.`);
      await loadStudentsFromAPI();
      loadDashboard(); // refresh dashboard counts
    } catch (err) {
      toast(err.message, 'error');
    }
  }
});

/* ─────────────────────────────────────────────────────────────
   ADD STUDENT button on Students page
───────────────────────────────────────────────────────────── */
$('add-student-btn').addEventListener('click', () => {
  resetForm();
  navigateTo('add-student');
});

$('dash-view-all-logs').addEventListener('click', () => navigateTo('activity'));

/* ─────────────────────────────────────────────────────────────
   STUDENT DETAIL MODAL
───────────────────────────────────────────────────────────── */
async function openModal(id) {
  currentDetailId = id;
  try {
    const s = await apiFetch(`${API_STUDENTS}/${encodeURIComponent(id)}`);
    $('modal-student-name').textContent = s.name;
    $('modal-body').innerHTML = `
      <div class="modal-detail-row">
        <span class="modal-detail-label">ID</span>
        <span class="modal-detail-val modal-detail-id">${escapeHtml(s.id)}</span>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Name</span>
        <span class="modal-detail-val">${escapeHtml(s.name)}</span>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Email</span>
        <span class="modal-detail-val">${escapeHtml(s.email)}</span>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Course</span>
        <span class="modal-detail-val"><span class="pill pill-course">${escapeHtml(s.course)}</span></span>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Age</span>
        <span class="modal-detail-val"><span class="pill pill-age">Age ${escapeHtml(s.age)}</span></span>
      </div>`;
    $('modal-overlay').classList.remove('hidden');
  } catch (err) {
    toast(err.message, 'error');
  }
}

$('modal-close').addEventListener('click', () => $('modal-overlay').classList.add('hidden'));
$('modal-overlay').addEventListener('click', e => {
  if (e.target === $('modal-overlay')) $('modal-overlay').classList.add('hidden');
});

$('modal-edit-btn').addEventListener('click', () => {
  $('modal-overlay').classList.add('hidden');
  if (currentDetailId) startEditMode(currentDetailId);
});

$('modal-delete-btn').addEventListener('click', async () => {
  if (!currentDetailId) return;
  if (!confirm('Delete this student? This cannot be undone.')) return;
  try {
    await apiFetch(`${API_STUDENTS}/${encodeURIComponent(currentDetailId)}`, { method: 'DELETE' });
    $('modal-overlay').classList.add('hidden');
    toast('Student deleted successfully.');
    await loadStudentsFromAPI();
    loadDashboard();
  } catch (err) {
    toast(err.message, 'error');
  }
});

/* ─────────────────────────────────────────────────────────────
   EDIT MODE
───────────────────────────────────────────────────────────── */
async function startEditMode(id) {
  try {
    const s = await apiFetch(`${API_STUDENTS}/${encodeURIComponent(id)}`);
    $('student-id').value  = s.id;
    $('name').value        = s.name;
    $('email').value       = s.email;
    $('course').value      = s.course;
    $('age').value         = s.age;
    $('form-section-title').textContent = 'Edit Student';
    $('save-button').innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      Save Changes`;
    $('cancel-button').classList.remove('hidden');
    clearFormErrors();
    navigateTo('add-student');
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ─────────────────────────────────────────────────────────────
   STUDENT FORM — ADD / UPDATE
───────────────────────────────────────────────────────────── */
$('student-form').addEventListener('submit', async e => {
  e.preventDefault();
  clearFormErrors();

  const id      = $('student-id').value;
  const name    = $('name').value.trim();
  const email   = $('email').value.trim();
  const course  = $('course').value.trim();
  const age     = Number($('age').value);

  // Client-side validation
  let valid = true;
  if (!name)                    { setFieldError('name',   'Name is required.');               valid = false; }
  if (!email || !email.includes('@')) { setFieldError('email', 'Enter a valid email address.'); valid = false; }
  if (!course)                  { setFieldError('course', 'Course is required.');              valid = false; }
  if (!age || age < 1 || age > 120) { setFieldError('age', 'Age must be between 1 and 120.'); valid = false; }
  if (!valid) return;

  const btn = $('save-button');
  btn.disabled = true;
  btn.textContent = id ? 'Saving…' : 'Adding…';

  try {
    const payload = { name, email, course, age };
    if (id) {
      await apiFetch(`${API_STUDENTS}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });
      showFormMessage('Student updated successfully!', 'success');
      toast('Student updated successfully!');
    } else {
      await apiFetch(API_STUDENTS, { method: 'POST', body: JSON.stringify(payload) });
      showFormMessage('Student added successfully!', 'success');
      toast('Student added to MongoDB!');
      sessionAdded++;
    }
    resetForm();
    await loadStudentsFromAPI();
    loadDashboard();
    // Navigate to students list after brief delay
    setTimeout(() => navigateTo('students'), 800);
  } catch (err) {
    showFormMessage(err.message, 'error');
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = id
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Save Changes`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Add Student`;
  }
});

$('cancel-button').addEventListener('click', () => {
  resetForm();
  navigateTo('students');
});

function resetForm() {
  $('student-form').reset();
  $('student-id').value = '';
  $('form-section-title').textContent = 'Add Student';
  $('save-button').innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    Add Student`;
  $('cancel-button').classList.add('hidden');
  hideFormMessage();
  clearFormErrors();
}

function setFieldError(field, msg) {
  const input = $(field);
  const err   = $(`err-${field}`);
  if (input) input.classList.add('invalid');
  if (err)   err.textContent = msg;
}

function clearFormErrors() {
  ['name', 'email', 'course', 'age'].forEach(f => {
    const input = $(f);
    const err   = $(`err-${f}`);
    if (input) input.classList.remove('invalid');
    if (err)   err.textContent = '';
  });
}

function showFormMessage(text, type) {
  const el = $('form-message');
  el.textContent = text;
  el.className = `form-message ${type}`;
  el.classList.remove('hidden');
}

function hideFormMessage() {
  const el = $('form-message');
  el.classList.add('hidden');
}

/* ─────────────────────────────────────────────────────────────
   SEARCH / FILTER / SORT EVENT LISTENERS
───────────────────────────────────────────────────────────── */
$('search-input').addEventListener('input',  applyFiltersAndRender);
$('filter-course').addEventListener('change', applyFiltersAndRender);
$('sort-select').addEventListener('change',  applyFiltersAndRender);

/* ─────────────────────────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────────────────────── */
async function loadDashboard() {
  // Ensure student data is loaded
  if (allStudents.length === 0) await loadStudentsFromAPI();

  const total   = allStudents.length;
  const courses = new Set(allStudents.map(s => s.course).filter(Boolean)).size;

  $('stat-total').textContent   = total;
  $('stat-courses').textContent = courses;
  $('stat-recent').textContent  = sessionAdded;

  // Audit log count
  try {
    const logs = await apiFetch(`${API_LOGS}?limit=5`);
    $('stat-logs').textContent = logs.length > 0 ? '5+' : '0';
    renderRecentLogs(logs, 'dash-recent-logs');
  } catch {
    $('stat-logs').textContent = '—';
    $('dash-recent-logs').innerHTML = `<p class="empty-state" style="font-size:13px">Activity logs unavailable (MySQL may be offline).</p>`;
  }
}

/* ─────────────────────────────────────────────────────────────
   AUDIT LOGS — FROM MYSQL VIA JDBC
───────────────────────────────────────────────────────────── */
async function loadAuditLogs() {
  const notice   = $('mysql-notice');
  const logList  = $('log-list');
  const badgeEl  = $('log-count-badge');

  logList.innerHTML = `<p class="empty-state">Fetching audit logs from MongoDB…</p>`;
  notice.classList.add('hidden');

  try {
    const logs = await apiFetch(`${API_LOGS}?limit=100`);
    badgeEl.textContent = `${logs.length} entr${logs.length === 1 ? 'y' : 'ies'}`;
    $('nav-logs-count').textContent = logs.length > 99 ? '99+' : logs.length;

    // Detect Node.js dev server (no real MongoDB)
    const statusData = await apiFetch(API_STATUS).catch(() => ({}));
    const isNodeServer = statusData.mongodb === 'na';

    if (isNodeServer) {
      notice.className = 'info-notice';
      notice.style.cssText = 'background:#eff6ff;border-color:#bfdbfe;color:#1e40af';
      notice.classList.remove('hidden');
      $('mysql-notice-text').textContent =
        'Running in Node.js dev mode — logs are stored in database/audit_logs.json. ' +
        'Run Spring Boot to use real MongoDB audit logs.';
    }

    if (logs.length === 0) {
      logList.innerHTML = `<p class="empty-state">No audit entries yet. Add, edit, or delete a student to create one.</p>`;
      return;
    }

    renderRecentLogs(logs, 'log-list');
  } catch (err) {
    notice.className = 'info-notice error';
    notice.style.cssText = '';
    notice.classList.remove('hidden');
    $('mysql-notice-text').textContent =
      `Cannot fetch logs: ${err.message}. Make sure the backend is running.`;
    logList.innerHTML = `<p class="empty-state" style="border-color:#fecaca;background:#fef2f2;color:#991b1b;">Audit logs unavailable.</p>`;
    badgeEl.textContent = '0 entries';
  }
}

function renderRecentLogs(logs, containerId) {
  const el = $(containerId);
  if (!logs || logs.length === 0) {
    el.innerHTML = `<p class="empty-state">No recent activity.</p>`;
    return;
  }
  el.innerHTML = logs.map(log => {
    const action = (log.action || 'ACTION').toUpperCase();
    const detail = log.details || log.student_id || '';
    // created_at may come as string or object depending on MySQL driver
    const ts = log.created_at || log.createdAt || '';
    return `
    <div class="log-entry">
      <span class="log-action-badge badge-${action}">${escapeHtml(action)}</span>
      <span class="log-text">${escapeHtml(detail)}</span>
      <span class="log-time">${formatDateTime(ts)}</span>
    </div>`;
  }).join('');
}

$('refresh-logs-btn').addEventListener('click', loadAuditLogs);

/* ─────────────────────────────────────────────────────────────
   INITIAL BOOT SEQUENCE
───────────────────────────────────────────────────────────── */
(async function init() {
  // 1. Check backend/DB status
  await checkStatus();

  // 2. Load all students from MongoDB
  await loadStudentsFromAPI();

  // 3. Render dashboard (default active section)
  await loadDashboard();

  // 4. Periodically refresh status indicator (every 30s)
  setInterval(checkStatus, 30_000);
})();
