import { API_BASE } from './config.js';

const $ = (id) => document.getElementById(id);
const ROUTES = {
  overview: ['CONTROL CENTER', 'ภาพรวมเซิร์ฟเวอร์', 'สถานะระบบและการทดลองต่อสู้ในพื้นที่เดียว', 'ภาพรวม'],
  teams: ['TEAM WORKSHOP', 'ทีมจำลอง', 'จัดสเตตัส อุปกรณ์ และสกิลให้ทีม 3 ตัวละคร', 'ทีมจำลอง'],
  match: ['BATTLE SIMULATOR', 'เริ่มการต่อสู้', 'เลือกสองทีม พร้อม seed และกติกาที่ตรวจสอบย้อนหลังได้', 'เริ่มการต่อสู้'],
  batches: ['EXPERIMENT LAB', 'ชุดทดลองและเปรียบเทียบ', 'ทดสอบหลาย seed วัดอัตราชนะ และเปรียบเทียบผลจาก snapshot ที่ล็อกไว้', 'ชุดทดลอง'],
  security: ['ACCOUNT & SECURITY', 'บัญชีและความปลอดภัย', 'จัดการรหัสผ่าน เซสชัน และตรวจบันทึกการใช้งานแอดมิน', 'ความปลอดภัย'],
  history: ['BATTLE ARCHIVE', 'ประวัติแมตช์', 'ติดตามผลและเปิดดูรายละเอียดของแต่ละการทดลอง', 'ประวัติแมตช์'],
  replay: ['SNAPSHOT & REPLAY', 'Snapshot และรีเพลย์', 'สำรวจเหตุการณ์และตรวจว่าการจำลองซ้ำให้ผลตรงกัน', 'Snapshot และรีเพลย์'],
  jobs: ['WORKER OPERATIONS', 'คิวและข้อผิดพลาด', 'ติดตามงานประมวลผล และลองงานที่ล้มเหลวใหม่', 'คิวและข้อผิดพลาด'],
  backups: ['DATA RECOVERY', 'สำรองและกู้คืน', 'สร้างข้อมูลสำรอง และตรวจการกู้คืนในฐานทดสอบ', 'สำรองและกู้คืน'],
};
const STATE_LABELS = {
  queued: 'รอประมวลผล', pending: 'รอประมวลผล', running: 'กำลังทำงาน', processing: 'กำลังทำงาน',
  succeeded: 'สำเร็จ', completed: 'สำเร็จ', success: 'สำเร็จ', failed: 'ล้มเหลว', error: 'ผิดพลาด',
  online: 'ออนไลน์', ok: 'พร้อมใช้งาน', healthy: 'พร้อมใช้งาน', missing: 'ไม่พบสัญญาณ', offline: 'ออฟไลน์',
  disabled: 'ปิดใช้งาน', configured: 'ตั้งค่าแล้ว', unconfigured: 'ยังไม่ตั้งค่า', degraded: 'ต้องตรวจสอบ', uploaded: 'อัปโหลดแล้ว', deleted: 'ลบตามนโยบายแล้ว', uploading: 'กำลังอัปโหลด', partial: 'สำเร็จบางส่วน',
  creating: 'กำลังสร้าง', passed: 'ผ่าน', verified: 'ผ่านการตรวจสอบ', mismatch: 'ผลไม่ตรงกัน', ready: 'พร้อมใช้งาน',
};
const state = {
  token: null, apiBase: '', username: '', route: 'overview', session: 0,
  teams: [], matches: [], jobs: [], backups: [], restoreTests: [], status: null,
  editTeamId: null, editRevision: null, teamDirty: false, pendingCommand: null,
  selectedMatchId: null, detail: null, snapshot: null, snapshotId: null, eventIndex: 0,
  batches: [], selectedBatchId: null, batchDetail: null, pendingBatchCommand: null, batchBusy: false, rerunCommands: {}, comparison: null, compareIds: null, compareEpoch: 0,
  auditEntries: [], auditCursor: null, auditNextCursor: null, auditPage: 1, auditBusy: false, auditEpoch: 0, backupPolicy: null, backupCopies: [],
  playback: null, refreshing: false, mutationBusy: false, restoreTarget: null, expiryTimer: null,
};
const requests = new Set();
const dateFormatter = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' });

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined && content !== null) node.textContent = String(content);
  return node;
}
function replace(id, ...nodes) { $(id).replaceChildren(...nodes); }
function text(id, value) { $(id).textContent = value === null || value === undefined ? '—' : String(value); }
function pretty(value) { return JSON.stringify(value, null, 2); }
function list(value, name) { return Array.isArray(value) ? value : (Array.isArray(value?.[name]) ? value[name] : []); }
function stamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : dateFormatter.format(date);
}
function asText(value) {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'object') return pretty(value);
  return String(value);
}
function label(status) { return STATE_LABELS[status] || asText(status); }
function pill(status) {
  const good = ['succeeded', 'completed', 'success', 'online', 'ok', 'healthy', 'passed', 'verified', 'ready'];
  const bad = ['failed', 'error', 'missing', 'offline', 'mismatch'];
  const active = ['running', 'processing'];
  return element('span', `status-pill ${good.includes(status) ? 'success' : bad.includes(status) ? 'danger' : active.includes(status) ? 'active' : 'warning'}`, label(status));
}
function action(caption, fn, style = 'secondary small') {
  const button = element('button', `button ${style}`, caption);
  button.type = 'button';
  button.addEventListener('click', fn);
  return button;
}
function link(caption, route, style = 'secondary small') {
  const node = element('a', `button ${style}`, caption);
  node.href = `#${route}`;
  return node;
}
function detailItem(caption, value, mono = false) {
  const node = element('div', 'detail-item');
  node.append(element('span', '', caption), element('strong', mono ? 'mono' : '', asText(value)));
  return node;
}
function empty(title, description, route = null, caption = '') {
  const node = element('div', 'empty-state');
  node.append(element('span', 'empty-icon', '◇'), element('h3', '', title), element('p', '', description));
  if (route) node.append(link(caption, route));
  return node;
}
function table(headers, rows) {
  const wrap = element('div', 'table-wrap');
  const tableNode = element('table');
  const thead = element('thead');
  const tr = element('tr');
  headers.forEach((header) => { const th = element('th', '', header); th.scope = 'col'; tr.append(th); });
  thead.append(tr);
  const tbody = element('tbody');
  rows.forEach((row) => {
    const line = element('tr');
    row.forEach((value) => { const cell = element('td'); cell.append(value instanceof Node ? value : document.createTextNode(asText(value))); line.append(cell); });
    tbody.append(line);
  });
  tableNode.append(thead, tbody); wrap.append(tableNode);
  return wrap;
}
function errorMessage(error) { return error instanceof Error ? error.message : asText(error); }
function showError(id, error) { text(id, errorMessage(error)); $(id).hidden = false; }
function clearError(id) { $(id).hidden = true; text(id, ''); }
function notice(message, isError = false) {
  const node = element('div', `notification${isError ? ' error' : ''}`, message);
  node.setAttribute('role', isError ? 'alert' : 'status');
  $('notifications').append(node);
  setTimeout(() => node.remove(), isError ? 11000 : 6500);
}
function normalizeBase(value) {
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('กรอก URL API ให้ครบ เช่น https://arena-api.example.com'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('API ต้องใช้ HTTPS ยกเว้น localhost หรือ IP loopback สำหรับทดสอบ');
  if (url.username || url.password || url.search || url.hash) throw new Error('URL API ต้องไม่มีรหัสผ่าน ข้อความค้นหา หรือ #');
  return `${url.origin}${url.pathname.replace(/\/+$/, '').replace(/\/api\/v1$/, '')}`;
}
function publicStoredUrl() { try { return localStorage.getItem('guild-arena-api-url') || ''; } catch { return ''; } }
function savePublicUrl(url) { try { localStorage.setItem('guild-arena-api-url', url); } catch { /* การเก็บ URL เป็นเพียงความสะดวก จึงใช้แอปต่อได้เมื่อ browser ปิด storage */ } }

async function api(path, options = {}) {
  const { method = 'GET', body, auth = true, headers = {}, timeout = 25000, responseType = 'json' } = options;
  if (auth && !state.token) throw new Error('กรุณาเข้าสู่ระบบก่อนใช้ข้อมูล');
  const session = state.session;
  const controller = new AbortController();
  requests.add(controller);
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${state.apiBase}/api/v1${path}`, {
      method, credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { Accept: responseType === 'blob' ? 'text/csv' : 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(auth ? { Authorization: `Bearer ${state.token}` } : {}), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let data = null;
    if (response.status !== 204) {
      const contentType = response.headers.get('content-type') || '';
      if (responseType === 'blob' && response.ok) data = await response.blob();
      else if (contentType.includes('application/json')) data = await response.json();
      else throw new Error(`API ตอบกลับเป็นรูปแบบที่ไม่รองรับ (HTTP ${response.status}) ตรวจสอบปลายทางและ reverse proxy`);
    }
    if (auth && session !== state.session) throw new Error('เซสชันนี้สิ้นสุดแล้ว');
    if (!response.ok) {
      if (response.status === 401 && auth) endSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
      const serverError = data?.error;
      const message = typeof serverError === 'string' ? serverError : serverError?.message || data?.message;
      const code = typeof serverError === 'object' && serverError?.code ? ` [${serverError.code}]` : '';
      throw new Error(`${message || (response.status === 401 ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : `คำขอไม่สำเร็จ (HTTP ${response.status})`)}${code}`);
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('การเชื่อมต่อหมดเวลา หรือเซสชันถูกปิด หากส่งคำสั่งต่อสู้แล้ว ให้ลองข้อมูลเดิมอีกครั้ง');
    if (error instanceof TypeError) throw new Error('เชื่อมต่อ API ไม่ได้ ตรวจสอบ HTTPS เครือข่าย และการอนุญาต CORS บนเซิร์ฟเวอร์');
    throw error;
  } finally { clearTimeout(timer); requests.delete(controller); }
}
function endSession(message = '') {
  state.token = null; state.session += 1; state.username = ''; state.status = null;
  state.teams = []; state.matches = []; state.jobs = []; state.backups = []; state.restoreTests = [];
  clearV11Session();
  state.snapshot = null; state.snapshotId = null; state.detail = null; state.selectedMatchId = null;
  state.pendingCommand = null; state.restoreTarget = null; state.refreshing = false;
  state.editTeamId = null; state.editRevision = null; state.teamDirty = false;
  requests.forEach((request) => request.abort()); requests.clear();
  clearTimeout(state.expiryTimer); stopPlayback();
  $('app-shell').hidden = true; $('login-screen').hidden = false;
  if ($('restore-dialog').open) $('restore-dialog').close();
  $('password').value = ''; $('team-json').value = ''; $('snapshot-id').value = ''; $('restore-confirmation').value = '';
  ['team-a','team-b'].forEach((id) => replace(id));
  ['metric-api','metric-worker','metric-queue','metric-matches','last-updated'].forEach((id) => text(id,'—'));
  clearError('team-error'); clearError('match-error'); clearError('page-error');
  $('page-loading').hidden = true; $('refresh-button').disabled = false;
  ['team-list','recent-matches','match-history','match-detail','jobs-list','backups-list','restore-tests-list','snapshot-meta','event-table','current-event','submitted-match'].forEach((id) => replace(id));
  text('snapshot-json', ''); text('raw-status', 'ยังไม่มีข้อมูล');
  $('snapshot-content').hidden = true; $('snapshot-empty').hidden = false; $('match-detail-panel').hidden = true; $('submitted-match').hidden = true;
  if (message) showError('login-error', new Error(message));
  $('password').focus();
}
async function login(event) {
  event.preventDefault(); clearError('login-error');
  const button = $('login-button'); button.disabled = true; button.textContent = 'กำลังเข้าสู่ระบบ…';
  try {
    state.apiBase = normalizeBase($('api-url').value);
    const username = $('username').value.trim();
    const result = await api('/auth/login', { method: 'POST', auth: false, body: { username, password: $('password').value } });
    if (!result?.token || typeof result.token !== 'string') throw new Error('API ไม่ส่งโทเคนสำหรับเซสชัน กรุณาตรวจรูปแบบคำตอบ');
    state.token = result.token; state.username = username; state.session += 1;
    savePublicUrl(state.apiBase);
    text('admin-name', username); text('overview-endpoint', state.apiBase);
    $('login-screen').hidden = true; $('app-shell').hidden = false;
    const expiry = result.expiresAt ? new Date(result.expiresAt).getTime() - Date.now() : NaN;
    if (Number.isFinite(expiry)) state.expiryTimer = setTimeout(() => endSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'), Math.max(0, Math.min(expiry, 2147483647)));
    newTeam(false); randomSeed(); randomBatchSeed();
    await navigate();
  } catch (error) { showError('login-error', error); }
  finally { $('password').value = ''; button.disabled = false; button.textContent = 'เข้าสู่ระบบ ↗'; }
}
async function logout() {
  const button = $('logout-button'); button.disabled = true; $('topbar-logout-button').disabled = true;
  try { await api('/auth/logout', { method: 'POST', timeout: 8000 }); }
  catch (error) { notice(`ปิดเซสชันบนหน้าเว็บแล้ว แต่ยืนยันการออกจากระบบบนเซิร์ฟเวอร์ไม่ได้: ${errorMessage(error)}`, true); }
  finally { endSession(); button.disabled = false; $('topbar-logout-button').disabled = false; }
}
async function navigate() {
  const route = location.hash.slice(1).split('?')[0];
  state.route = Object.hasOwn(ROUTES, route) ? route : 'overview';
  stopPlayback();
  document.querySelectorAll('.view').forEach((node) => { node.hidden = node.id !== `view-${state.route}`; });
  document.querySelectorAll('[data-route]').forEach((node) => {
    const selected = node.dataset.route === state.route;
    node.classList.toggle('active', selected);
    if (selected) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current');
  });
  const [eyebrow, title, description, crumb] = ROUTES[state.route];
  text('page-eyebrow', eyebrow); text('page-title', title); text('page-description', description); text('breadcrumb-current', crumb);
  document.title = `${crumb} · Guild Arena`;
  clearError('page-error');
  if (state.token) await refresh();
}
async function refresh(quiet = false) {
  if (!state.token || state.refreshing) return;
  state.refreshing = true;
  const session = state.session;
  $('refresh-button').disabled = true;
  if (!quiet) { $('page-loading').hidden = false; clearError('page-error'); }
  const tasks = [{ path: '/system/status', assign: (data) => { state.status = data; renderStatus(); } }];
  const route = state.route;
  if (route === 'overview' || route === 'history') tasks.push({ path: '/matches', assign: (data) => { state.matches = list(data, 'matches'); renderMatches(); } });
  if (route === 'teams' || route === 'match' || route === 'batches') tasks.push({ path: '/teams', assign: (data) => { state.teams = list(data, 'teams'); renderTeams(); } });
  if (route === 'batches') {
    tasks.push({ path: '/batches', assign: (data) => { state.batches = list(data, 'batches'); renderBatches(); } });
    if (state.selectedBatchId) { const selectedId = state.selectedBatchId; tasks.push({ path: '/batches/' + encodeURIComponent(selectedId), assign: (data) => { if(state.selectedBatchId === selectedId) { state.batchDetail = data?.batch || data; renderBatchDetail(); } } }); }
    if (state.compareIds) { const epoch=state.compareEpoch; state.compareIds.forEach((id,index) => tasks.push({ path:'/batches/'+encodeURIComponent(id), assign:(data)=>{ if(state.compareEpoch===epoch && state.comparison) { state.comparison[index]=data?.batch || data; renderComparison(); } } })); }
  }
  if (route === 'security' && !state.auditBusy) { const epoch=state.auditEpoch; tasks.push({path:auditPath(state.auditCursor),assign:(data)=>{if(state.auditEpoch===epoch){state.auditEntries=list(data,'entries');state.auditNextCursor=data?.nextCursor ?? null;renderAudit();}}}); }
  if (route === 'jobs') tasks.push({ path: '/jobs', assign: (data) => { state.jobs = list(data, 'jobs'); renderJobs(); } });
  if (route === 'backups') {
    tasks.push({ path: '/backup-policy', assign: (data) => { state.backupPolicy=data; renderBackupPolicy(); } });
    tasks.push({ path: '/backup-copies', assign: (data) => { state.backupCopies=list(data,'copies'); renderBackupCopies(); } });
    tasks.push({ path: '/backups', assign: (data) => { state.backups = list(data, 'backups'); renderBackups(); } });
    tasks.push({ path: '/restore-tests', assign: (data) => { state.restoreTests = list(data, 'restoreTests'); renderRestoreTests(); } });
  }
  if (route === 'history' && state.selectedMatchId) tasks.push({ path: `/matches/${encodeURIComponent(state.selectedMatchId)}`, assign: (data) => { state.detail = data?.match || data; renderMatchDetail(); } });
  try {
    const results = await Promise.allSettled(tasks.map((task) => api(task.path)));
    if (session !== state.session) return;
    const failures = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') { tasks[index].assign(result.value); }
      else {
        failures.push(errorMessage(result.reason));
        if (index === 0) { $('connection-badge').classList.add('offline'); $('connection-badge').lastElementChild.textContent = 'เชื่อมต่อไม่ได้'; }
      }
    });
    if (failures.length) showError('page-error', new Error([...new Set(failures)].join('\n')));
    else { clearError('page-error'); text('last-updated', `อัปเดต ${stamp(new Date())}`); }
  } finally {
    if (session === state.session) { state.refreshing = false; $('page-loading').hidden = true; $('refresh-button').disabled = false; if(route !== state.route) refresh(); }
  }
}
function renderStatus() {
  const data = state.status || {};
  const apiStatus = data.api?.status;
  const workerStatus = data.worker?.status;
  text('metric-api', apiStatus ? label(apiStatus) : 'ไม่ระบุ');
  text('metric-api-caption', data.api?.version ? `API v${data.api.version}` : 'ไม่ได้ระบุเวอร์ชัน');
  text('metric-worker', workerStatus ? label(workerStatus) : 'ไม่ระบุ');
  text('metric-worker-caption', data.worker?.lastHeartbeatAt ? `ล่าสุด ${stamp(data.worker.lastHeartbeatAt)}` : 'ยังไม่มีเวลา heartbeat');
  const queued = data.queue?.queued, running = data.queue?.running;
  text('metric-queue', Number.isFinite(queued) && Number.isFinite(running) ? queued + running : '—');
  text('metric-matches', data.matches?.total ?? '—');
  text('raw-status', pretty(data));
  renderStorageAndAlerts(data); renderQueueWarning();
  const okay = ['ok','online','healthy'].includes(apiStatus);
  $('connection-badge').classList.toggle('offline', !okay);
  $('connection-badge').lastElementChild.textContent = apiStatus ? `API ${label(apiStatus)}` : 'API ตอบกลับแล้ว';
}
function matchName(match) { return `${match.teamAName || match.input?.teamA?.name || 'ฝ่าย A'}  ×  ${match.teamBName || match.input?.teamB?.name || 'ฝ่าย B'}`; }
function winnerText(winner) { return winner === 'A' || winner === 'teamA' ? 'ฝ่าย A ชนะ' : winner === 'B' || winner === 'teamB' ? 'ฝ่าย B ชนะ' : winner === 'draw' || winner === 'tie' ? 'เสมอ' : winner ? asText(winner) : 'ยังไม่มีผล'; }
function renderMatches() {
  const recent = state.matches.slice(0, 5);
  if (!recent.length) replace('recent-matches', empty('ยังไม่มีแมตช์', 'เริ่มจากสร้างทีม แล้วส่งการต่อสู้ครั้งแรก', 'teams', 'ไปจัดทีม ↗'));
  else replace('recent-matches', ...recent.map((match) => {
    const row = element('div', 'recent-row'); const main = element('div', 'recent-main');
    const open = element('button', 'text-link', matchName(match)); open.type = 'button'; open.style.border = '0'; open.style.background = 'transparent'; open.style.padding = '0'; open.style.textAlign = 'left';
    open.addEventListener('click', () => openMatch(match.id));
    main.append(open, element('small', '', `${stamp(match.createdAt)} · ${winnerText(match.winner)}`));
    row.append(element('span', 'recent-mark', '⚔'), main, pill(match.status)); return row;
  }));
  const selected = $('match-filter').value;
  const records = state.matches.filter((match) => selected === 'all' || match.status === selected || (selected === 'succeeded' && ['completed','success'].includes(match.status)));
  if (!records.length) replace('match-history', empty('ไม่พบแมตช์', selected === 'all' ? 'ผลการทดลองจะปรากฏที่นี่เมื่อคุณเริ่มการต่อสู้' : 'ยังไม่มีแมตช์ตามสถานะที่เลือก', 'match', 'เริ่มการต่อสู้ ↗'));
  else replace('match-history', table(['แมตช์ / ทีม', 'สถานะ', 'ผล', 'เริ่มเมื่อ', ''], records.map((match) => {
    const id = element('div'); id.append(element('span', '', matchName(match)), element('span', 'subtext mono', match.id));
    return [id, pill(match.status), winnerText(match.winner), stamp(match.createdAt), action('รายละเอียด', () => openMatch(match.id))];
  })));
}

function fixture(side) {
  const first = side === 'A';
  const names = first ? ['ผู้พิทักษ์อรุณ', 'นักดาบตะวัน', 'ผู้เยียวยาแสง'] : ['อสูรหิน', 'หมาป่าเงา', 'ภูตป่า'];
  const stats = first ? [{hp:180,attack:26,defense:20,speed:12},{hp:120,attack:40,defense:8,speed:22},{hp:100,attack:24,defense:7,speed:17}] : [{hp:190,attack:28,defense:22,speed:10},{hp:115,attack:38,defense:9,speed:24},{hp:105,attack:25,defense:8,speed:18}];
  return { schemaVersion:1, name:first ? 'กิลด์อรุณ' : 'ฝูงอสูรป่า', characters:names.map((name,index) => ({ id:`${side.toLowerCase()}-${index+1}`, name, position:index+1, stats:stats[index], equipment:{ weaponAttack:4, armorDefense:3, bonusHp:10 }, skills:[{id:index===2?'heal':index===1?'power-strike':'strike'}] })) };
}
function cleanTeam(team) {
  const data = team.data || team;
  return { schemaVersion:data.schemaVersion, name:data.name, characters:data.characters };
}
function guardTeamChange() { return !state.teamDirty || window.confirm('คุณมีข้อมูลทีมที่ยังไม่ได้บันทึก ต้องการแทนที่แบบฟอร์มหรือไม่?'); }
function newTeam(confirm = true) {
  if (confirm && !guardTeamChange()) return;
  state.editTeamId = null; state.editRevision = null; state.teamDirty = false;
  $('team-json').value = pretty(fixture('A'));
  text('team-editor-title','สร้างทีมจำลอง'); text('team-revision','SCHEMA V1'); text('save-team-button','บันทึกทีม'); clearError('team-error');
  renderTeams();
}
function fillSample(side) {
  if (!guardTeamChange()) return;
  newTeam(false); $('team-json').value = pretty(fixture(side)); state.teamDirty = true;
  notice('เติมตัวอย่างในแบบฟอร์มแล้ว กดบันทึกเพื่อสร้างทีมบนเซิร์ฟเวอร์');
}
function editTeam(team) {
  if (!guardTeamChange()) return;
  state.editTeamId = team.id; state.editRevision = team.revision; state.teamDirty = false;
  $('team-json').value = pretty(cleanTeam(team)); text('team-editor-title','แก้ไขทีมจำลอง'); text('team-revision',`REVISION ${team.revision ?? '—'}`); text('save-team-button','บันทึกการแก้ไข'); clearError('team-error');
  renderTeams(); $('team-json').focus();
}
function renderTeams() {
  text('team-count',state.teams.length);
  if (!state.teams.length) replace('team-list',empty('ทีมแรกของคุณเริ่มที่นี่','ใช้ตัวอย่างหรือแก้ JSON แล้วบันทึกทีม 3 ตัวละคร'));
  else replace('team-list',...state.teams.map((team) => {
    const card = element('article',`team-card${state.editTeamId === team.id ? ' selected' : ''}`);
    const header = element('div','team-card-header'); const title = element('div');
    title.append(element('h3','',team.name || team.data?.name),element('small','',`Revision ${team.revision ?? '—'}`));
    header.append(title,element('span','tiny-tag','3V3'));
    const chars = element('div','character-chips');
    (team.characters || team.data?.characters || []).forEach((character) => { const chip = element('div','character-chip'); chip.append(element('span','',character.position),document.createTextNode(character.name || character.id)); chars.append(chip); });
    const footer = element('div','team-card-footer'); footer.append(element('small','',stamp(team.updatedAt || team.createdAt)),action('แก้ไข',()=>editTeam(team)));
    card.append(header,chars,footer); return card;
  }));
  ['team-a','team-b','batch-team-a','batch-team-b'].forEach((id) => {
    const select = $(id); const previous = select.value;
    const placeholder = element('option','','เลือกทีม'); placeholder.value=''; select.replaceChildren(placeholder);
    state.teams.forEach((team) => { const option = element('option','',team.name || team.data?.name || team.id); option.value=team.id; select.append(option); });
    if (state.teams.some((team)=>team.id===previous)) select.value=previous;
  });
  updateTeamInfo(); updateBatchTeamInfo();
}
function validateTeam(team) {
  if (!team || team.schemaVersion !== 1) throw new Error('schemaVersion ต้องเป็น 1');
  if (typeof team.name !== 'string' || !team.name.trim()) throw new Error('ระบุชื่อทีมใน name');
  if (!Array.isArray(team.characters) || team.characters.length !== 3) throw new Error('characters ต้องมี 3 ตัวละคร');
  const positions = new Set(), ids = new Set();
  team.characters.forEach((character) => {
    if (!character || typeof character.id !== 'string' || !character.id || ids.has(character.id)) throw new Error('ตัวละครต้องมี id ที่ไม่ซ้ำกัน');
    ids.add(character.id);
    if (typeof character.name !== 'string' || !character.name.trim()) throw new Error('ตัวละครทุกตัวต้องมี name');
    if (![1,2,3].includes(character.position) || positions.has(character.position)) throw new Error('position ต้องเป็น 1, 2 และ 3 โดยไม่ซ้ำกัน');
    positions.add(character.position);
    ['hp','attack','defense','speed'].forEach((key) => { if (!Number.isInteger(character.stats?.[key]) || character.stats[key] < (key==='hp' ? 1 : 0)) throw new Error(`stats.${key} ของ ${character.name} ต้องเป็นจำนวนเต็ม${key==='hp'?'มากกว่า 0':'ตั้งแต่ 0'}`); });
    ['weaponAttack','armorDefense','bonusHp'].forEach((key) => { if (!Number.isInteger(character.equipment?.[key]) || character.equipment[key] < 0) throw new Error(`equipment.${key} ของ ${character.name} ต้องเป็นจำนวนเต็มตั้งแต่ 0`); });
    if (!Array.isArray(character.skills) || character.skills.length === 0 || character.skills.some((skill)=>!['strike','power-strike','heal'].includes(skill?.id))) throw new Error(`skills ของ ${character.name} ต้องใช้ strike, power-strike หรือ heal`);
  });
}
async function saveTeam(event) {
  event.preventDefault(); clearError('team-error'); const button=$('save-team-button'); button.disabled=true;
  try {
    let team; try { team=JSON.parse($('team-json').value); } catch { throw new Error('JSON ไม่ถูกต้อง ตรวจเครื่องหมายคำพูด จุลภาค และวงเล็บ'); }
    validateTeam(team);
    if (state.editTeamId && !Number.isInteger(state.editRevision)) throw new Error('ไม่มี revision ของทีม กรุณาโหลดข้อมูลใหม่ก่อนแก้ไข');
    const result=await api(state.editTeamId?`/teams/${encodeURIComponent(state.editTeamId)}`:'/teams',{method:state.editTeamId?'PUT':'POST',body:state.editTeamId?{...team,revision:state.editRevision}:team});
    const saved=result?.team || result;
    state.teamDirty=false;
    if (saved?.id) { state.editTeamId=saved.id; state.editRevision=saved.revision; text('team-editor-title','แก้ไขทีมจำลอง'); text('team-revision',`REVISION ${saved.revision ?? '—'}`); text('save-team-button','บันทึกการแก้ไข'); }
    notice('บันทึกทีมบนเซิร์ฟเวอร์แล้ว'); await refresh();
  } catch(error) { showError('team-error',error); }
  finally { button.disabled=false; }
}
function updateTeamInfo() {
  ['a','b'].forEach((side) => { const team=state.teams.find((item)=>item.id===$(`team-${side}`).value); text(`team-${side}-info`,team?`Revision ${team.revision ?? '—'} · ${(team.characters || team.data?.characters || []).length} ตัวละคร`:'เลือกทีมที่บันทึกไว้'); });
}
function randomSeed() { const values=new Uint32Array(1); crypto.getRandomValues(values); $('battle-seed').value=String(values[0]); }
function matchPayload() {
  const teamA=state.teams.find((team)=>team.id===$('team-a').value), teamB=state.teams.find((team)=>team.id===$('team-b').value);
  if (!teamA || !teamB) throw new Error('เลือกทีมทั้งสองฝ่ายก่อนเริ่ม');
  if (!Number.isInteger(teamA.revision) || !Number.isInteger(teamB.revision)) throw new Error('API ไม่ส่ง revision ของทีม กรุณาโหลดทีมใหม่');
  const seed=$('battle-seed').value.trim();
  if (!/^\d+$/.test(seed) || Number(seed)>4294967295) throw new Error('Seed ต้องเป็นจำนวนเต็ม 0–4294967295');
  return {teamAId:teamA.id,teamBId:teamB.id,teamARevision:teamA.revision,teamBRevision:teamB.revision,seed:String(Number(seed)),rulesVersion:'prototype-v1'};
}
function uuid() { return crypto.randomUUID(); }
async function submitMatch(event) {
  event.preventDefault(); clearError('match-error'); const button=$('start-match-button'); button.disabled=true;
  const controls=['team-a','team-b','battle-seed','random-seed-button','new-command-button'];
  controls.forEach((id)=>{$(id).disabled=true;});
  try {
    const body=matchPayload(), fingerprint=JSON.stringify(body);
    if (!state.pendingCommand || state.pendingCommand.fingerprint!==fingerprint) state.pendingCommand={key:uuid(),fingerprint,result:null};
    const command=state.pendingCommand;
    const result=await api('/matches',{method:'POST',body,headers:{'Idempotency-Key':command.key}});
    command.result=result;
    const box=element('div'); box.append(element('strong','','เซิร์ฟเวอร์รับคำสั่งแล้ว'),element('p','mono',`Match: ${result.matchId || result.id || '—'}`),element('p','',`สถานะ: ${label(result.status)}`),element('p','small-text','การส่งข้อมูลชุดเดิมอีกครั้งจะอ้างถึงคำสั่งนี้ กด “เริ่มคำสั่งใหม่” หากต้องการทดสอบแมตช์ใหม่'));
    if(result.matchId || result.id) box.append(action('ติดตามผล ↗',()=>openMatch(result.matchId || result.id),'secondary small'));
    replace('submitted-match',box); $('submitted-match').hidden=false;
    notice('รับคำสั่งต่อสู้แล้ว เปิดประวัติเพื่อติดตามผล');
  } catch(error) { showError('match-error',error); }
  finally { button.disabled=false; controls.forEach((id)=>{$(id).disabled=false;}); }
}

async function openMatch(id) {
  if (!id) return;
  state.selectedMatchId=id; location.hash='history';
  clearError('page-error');
  try { state.detail=(await api(`/matches/${encodeURIComponent(id)}`)); state.detail=state.detail?.match || state.detail; renderMatchDetail(); }
  catch(error) { showError('page-error',error); }
}
function renderMatchDetail() {
  const match=state.detail; if(!match) return;
  $('match-detail-panel').hidden=false;
  const grid=element('div','match-detail-grid');
  grid.append(detailItem('รหัสแมตช์',match.id || state.selectedMatchId,true),detailItem('สถานะ',label(match.status)),detailItem('ทีม',matchName(match)),detailItem('ผล',winnerText(match.result?.winner || match.winner)),detailItem('เริ่มเมื่อ',stamp(match.createdAt)),detailItem('เสร็จเมื่อ',stamp(match.completedAt)),detailItem('Seed',match.input?.seed ?? match.seed,true),detailItem('กติกา',match.input?.rulesVersion || match.rulesVersion,true),detailItem('Input hash',match.inputHash,true),detailItem('Output hash',match.outputHash,true));
  const details=element('details','raw-details'); details.append(element('summary','','ข้อมูลแมตช์ทั้งหมด'),element('pre','json-output',pretty(match)));
  replace('match-detail',grid);
  if(match.error) $('match-detail').append(element('p','inline-error',typeof match.error==='string'?match.error:pretty(match.error)));
  $('match-detail').append(details);
}
function snapshotEvents() { return state.snapshot?.events || state.snapshot?.output?.events || state.snapshot?.battle?.events || []; }
function stopPlayback() { if(state.playback) clearInterval(state.playback); state.playback=null; text('play-events-button','เล่นเหตุการณ์'); }
async function openSnapshot(id) {
  if(!id) return;
  state.snapshotId=id; $('snapshot-id').value=id;
  location.hash='replay'; await loadSnapshot();
}
async function loadSnapshot(event) {
  if(event) event.preventDefault();
  const id=$('snapshot-id').value.trim(); if(!id) return;
  stopPlayback(); clearError('page-error');
  const button=$('load-snapshot-button'); button.disabled=true;
  try {
    const data=await api(`/matches/${encodeURIComponent(id)}/snapshot`);
    state.snapshot=data?.snapshot || data; state.snapshotId=id; state.eventIndex=0;
    $('snapshot-empty').hidden=true; $('snapshot-content').hidden=false; $('replay-check-result').hidden=true;
    const snapshot=state.snapshot;
    replace('snapshot-meta',detailItem('รหัสแมตช์',snapshot.matchId || snapshot.id || id,true),detailItem('Seed',snapshot.input?.seed ?? snapshot.seed,true),detailItem('กติกา',snapshot.input?.rulesVersion || snapshot.rulesVersion,true),detailItem('เวลาบันทึก',stamp(snapshot.createdAt || snapshot.capturedAt)),detailItem('เหตุการณ์',`${snapshotEvents().length} รายการ`),detailItem('ผล',winnerText(snapshot.result?.winner || snapshot.output?.result?.winner)));
    text('snapshot-json',pretty(snapshot));
    const events=snapshotEvents();
    $('event-range').max=String(Math.max(0,events.length-1)); $('event-range').value='0';
    if(!events.length) replace('event-table',empty('ยังไม่มีเหตุการณ์','แมตช์อาจยังไม่เสร็จ ตรวจสถานะแล้วเปิด snapshot อีกครั้ง'));
    else {
      const eventTable=table(['ลำดับ / รอบ','ผู้กระทำ','เป้าหมาย','เหตุการณ์ / สกิล','ค่า','HP หลังเหตุการณ์'],events.map((entry,index) => [action(`${entry.seq ?? index+1} / ${entry.round ?? '—'}`,()=>selectEvent(index)),actorName(entry.actor ?? entry.actorId),actorName(entry.target ?? entry.targetId),eventType(entry),eventAmount(entry),entry.hpAfter ?? entry.targetHp ?? entry.hp ?? '—']));
      replace('event-table',eventTable);
    }
    selectEvent(0);
  } catch(error) { showError('page-error',error); }
  finally { button.disabled=false; }
}
function actorName(actor) {
  if(actor===undefined || actor===null) return '—';
  if(typeof actor==='object') return actor.name || actor.id || asText(actor);
  const id=String(actor);
  const input=state.snapshot?.input || state.snapshot;
  const side=id.startsWith('A:')?'A':id.startsWith('B:')?'B':null;
  const candidates=(side==='A'?[input?.teamA,input?.teams?.A]:side==='B'?[input?.teamB,input?.teams?.B]:[input?.teamA,input?.teamB,input?.teams?.A,input?.teams?.B]).filter(Boolean);
  for(const team of candidates) {
    const character=(team.characters || team.data?.characters || []).find((entry)=>entry.id===id || `A:${entry.id}`===id || `B:${entry.id}`===id);
    if(character) return `${character.name} (${id})`;
  }
  return id;
}
function eventType(event) {
  const types={attack:'โจมตี',heal:'รักษา',damage:'ความเสียหาย',battle_start:'เริ่มต่อสู้',battle_end:'จบการต่อสู้',round_start:'เริ่มรอบ',defeat:'ล้มลง',death:'ล้มลง'};
  const skills={strike:'โจมตีปกติ','power-strike':'โจมตีหนัก',heal:'รักษา'};
  const skill=event.skill ?? event.skillId;
  return skill ? `${skills[skill] || asText(skill)}${event.type && event.type!==skill ? ` · ${types[event.type] || event.type}` : ''}` : types[event.type] || event.type || 'เหตุการณ์';
}
function eventAmount(event) {
  if(event.damage!==undefined) return `เสียหาย ${event.damage}`;
  if(event.heal!==undefined) return `ฟื้นฟู ${event.heal}`;
  if(event.healing!==undefined) return `ฟื้นฟู ${event.healing}`;
  return event.amount ?? '—';
}
function selectEvent(index) {
  const events=snapshotEvents(); state.eventIndex=Math.max(0,Math.min(index,events.length-1));
  $('event-range').value=String(state.eventIndex);
  text('event-position',`${events.length?state.eventIndex+1:0} / ${events.length}`);
  $('previous-event-button').disabled=!events.length || state.eventIndex===0;
  $('next-event-button').disabled=!events.length || state.eventIndex===events.length-1;
  $('play-events-button').disabled=!events.length; $('event-range').disabled=!events.length;
  document.querySelectorAll('#event-table tbody tr').forEach((row,position)=>row.classList.toggle('active-event',position===state.eventIndex));
  if(!events.length) { replace('current-event',element('p','','ไม่มีเหตุการณ์ให้เล่น')); return; }
  const event=events[state.eventIndex];
  replace('current-event',element('strong','',`#${event.seq ?? state.eventIndex+1} · ${eventType(event)}`),element('p','',`${actorName(event.actor ?? event.actorId)} → ${actorName(event.target ?? event.targetId)}`),element('p','',`รอบ ${event.round ?? '—'} · ${eventAmount(event)} · HP หลังเหตุการณ์ ${event.hpAfter ?? event.targetHp ?? event.hp ?? '—'}`));
  const details=element('details','raw-details'); details.append(element('summary','','ข้อมูลเหตุการณ์นี้'),element('pre','json-output',pretty(event))); $('current-event').append(details);
}
function togglePlayback() {
  if(state.playback) { stopPlayback(); return; }
  const events=snapshotEvents(); if(!events.length) return;
  if(state.eventIndex>=events.length-1) selectEvent(0);
  text('play-events-button','หยุดชั่วคราว');
  state.playback=setInterval(()=>{ if(state.eventIndex>=events.length-1) {stopPlayback();return;} selectEvent(state.eventIndex+1); },1000);
}
async function replayCheck() {
  if(!state.snapshotId) return;
  const button=$('replay-check-button'); button.disabled=true; button.textContent='กำลังตรวจผลซ้ำ…';
  try {
    const result=await api(`/matches/${encodeURIComponent(state.snapshotId)}/replay-checks`,{method:'POST',timeout:60000});
    const check=result?.check || result;
    const verified=check.identical ?? check.matches ?? check.matched ?? check.passed ?? check.verified ?? (['passed','matched','verified','success'].includes(check.status)?true:['failed','mismatch'].includes(check.status)?false:null);
    const node=$('replay-check-result'); node.hidden=false; node.classList.toggle('failed',verified===false);
    node.replaceChildren(element('strong','',verified===true?'ผลตรงกัน — การจำลองซ้ำผ่านการตรวจสอบ':verified===false?'ผลไม่ตรงกัน — ตรวจรายละเอียดความแตกต่างด้านล่าง':'เซิร์ฟเวอร์รับคำขอตรวจผลซ้ำแล้ว'),element('pre','json-output',pretty(result)));
  } catch(error) { notice(errorMessage(error),true); }
  finally { button.disabled=false; button.textContent='ตรวจผลการจำลองซ้ำ'; }
}
function downloadSnapshot() {
  if(!state.snapshot) return;
  const blob=new Blob([pretty(state.snapshot)],{type:'application/json'}), url=URL.createObjectURL(blob);
  const a=element('a'); a.href=url; a.download=`guild-arena-snapshot-${String(state.snapshotId).replace(/[^a-zA-Z0-9_-]/g,'_')}.json`;
  a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function renderJobs() {
  if(!state.jobs.length) {replace('jobs-list',empty('ยังไม่มีงานในระบบ','งานจะถูกสร้างเมื่อส่งคำสั่งต่อสู้'));return;}
  replace('jobs-list',table(['งาน / แมตช์','สถานะ','จำนวนครั้ง','ข้อผิดพลาด','อัปเดตล่าสุด',''],state.jobs.map((job)=>{
    const ids=element('div','mono',job.id); ids.append(element('span','subtext',job.matchId));
    const error=element('span','table-error',job.error?asText(job.error):'—');
    const buttons=element('div','button-row');
    if(job.matchId) buttons.append(action('ดูแมตช์',()=>openMatch(job.matchId)));
    if(job.status==='failed') {
      const retry=action('ลองใหม่',async()=>{
        retry.disabled=true;
        try {await api(`/jobs/${encodeURIComponent(job.id)}/retry`,{method:'POST'});notice('ส่งงานเดิมเข้าคิวอีกครั้งแล้ว');await refresh();}
        catch(error){notice(errorMessage(error),true);} finally{retry.disabled=false;}
      }); buttons.append(retry);
    }
    return [ids,pill(job.status),`ประมวลผล ${job.attempts ?? '—'} / ลองใหม่ ${job.retries ?? '—'}`,error,stamp(job.updatedAt || job.createdAt),buttons];
  })));
}
function byteSize(value) { if(value===null || value===undefined)return '—'; const bytes=Number(value); if(!Number.isFinite(bytes))return '—'; return bytes<1024?`${bytes} B`:bytes<1048576?`${(bytes/1024).toFixed(1)} KB`:bytes<1073741824?`${(bytes/1048576).toFixed(1)} MB`:`${(bytes/1073741824).toFixed(2)} GB`; }
function renderBackups() {
  if(!state.backups.length) {replace('backups-list',empty('ยังไม่มีข้อมูลสำรอง','สร้าง Backup แรก แล้วทดสอบกู้คืนเพื่อยืนยันว่าข้อมูลใช้ได้'));return;}
  replace('backups-list',table(['รหัส Backup','สร้างเมื่อ','สถานะ','ขนาด',''],state.backups.map((backup)=>{
    const id=backup.id || backup.backupId;
    const buttons=element('div','button-row');
    if(!backup.status || ['succeeded','completed','success','ready','verified'].includes(backup.status)) buttons.append(action('ทดสอบกู้คืน',()=>openRestore(id)));
    return [element('span','mono',id),stamp(backup.createdAt),pill(backup.status || 'ready'),byteSize(backup.sizeBytes ?? backup.bytes ?? backup.size),buttons];
  })));
}
function renderRestoreTests() {
  if(!state.restoreTests.length) {replace('restore-tests-list',empty('ยังไม่มีประวัติทดสอบกู้คืน','เลือกข้อมูลสำรอง แล้วกดทดสอบกู้คืนในฐานทดสอบ'));return;}
  replace('restore-tests-list',table(['การทดสอบ / Backup','สถานะ','เริ่มเมื่อ','รายละเอียด'],state.restoreTests.map((test)=>{
    const ids=element('div','mono',test.id);ids.append(element('span','subtext',test.backupId));
    const details=element('details');details.append(element('summary','text-link','ดูผลการตรวจ'),element('pre','json-output',pretty(test)));
    return [ids,pill(test.status),stamp(test.createdAt || test.startedAt),details];
  })));
}
async function createBackup() {
  const button=$('create-backup-button');button.disabled=true;button.textContent='กำลังสร้าง…';
  try {await api('/backups',{method:'POST',timeout:60000});notice('เซิร์ฟเวอร์รับคำสั่งสำรองข้อมูลแล้ว');await refresh();}
  catch(error){notice(errorMessage(error),true);}finally{button.disabled=false;button.textContent='+ สร้าง Backup';}
}
function openRestore(id) {state.restoreTarget=id;text('restore-target',`Backup: ${id}`);$('restore-confirmation').value='';$('restore-dialog').showModal();$('restore-confirmation').focus();}
async function submitRestore(event) {
  event.preventDefault();
  if($('restore-confirmation').value!=='RESTORE TEST' || !state.restoreTarget)return;
  const button=$('confirm-restore-button');button.disabled=true;
  try {await api(`/backups/${encodeURIComponent(state.restoreTarget)}/restore-tests`,{method:'POST',body:{confirmation:'RESTORE TEST'},timeout:60000});$('restore-dialog').close();notice('ส่งคำสั่งทดสอบกู้คืนแล้ว ตรวจผลได้ในประวัติด้านล่าง');await refresh();}
  catch(error){notice(errorMessage(error),true);}finally{button.disabled=false;}
}


function clearV11Session() {
  state.batches=[]; state.batchDetail=null; state.selectedBatchId=null; state.pendingBatchCommand=null; state.rerunCommands={}; state.batchBusy=false;
  state.comparison=null; state.compareIds=null; state.compareEpoch+=1;
  state.auditEntries=[]; state.auditCursor=null; state.auditNextCursor=null; state.auditPage=1; state.auditBusy=false; state.auditEpoch+=1;
  state.backupPolicy=null; state.backupCopies=[];
  ['current-password','new-password','confirm-new-password','revoke-password','batch-name','batch-start-seed','audit-filter'].forEach((id)=>{$(id).value='';});
  ['batch-team-a','batch-team-b','compare-batch-a','compare-batch-b','batch-list','batch-detail-meta','batch-summary','batch-matches','batch-comparison','batch-submitted','audit-list','backup-policy','backup-copies','storage-summary','system-alerts'].forEach((id)=>replace(id));
  ['password-error','revoke-error','batch-error'].forEach(clearError);
  $('batch-detail-panel').hidden=true; $('batch-submitted').hidden=true; $('audit-next-button').disabled=true;
}
function renderStorageAndAlerts(data) {
  const storage=data.storage;
  if(!storage)replace('storage-summary',element('p','muted small-text','API ยังไม่ส่งข้อมูลพื้นที่จัดเก็บ'));
  else replace('storage-summary',...[
    ['พื้นที่ว่าง',storage.freeBytes],['ความจุดิสก์',storage.totalBytes],['ฐานข้อมูล',storage.databaseBytes],['ไฟล์ WAL',storage.walBytes],['Backup ในเครื่อง',storage.backupBytes],['ฐานทดสอบกู้คืน',storage.restoreTestBytes],
  ].map(([caption,bytes])=>detailItem(caption,byteSize(bytes))));
  if(!Array.isArray(data.alerts)) {replace('system-alerts',element('p','muted small-text','API ยังไม่ส่งข้อมูลการแจ้งเตือน'));return;}
  if(!data.alerts.length) {replace('system-alerts',element('p','system-clear','API รายงานว่าไม่มีการแจ้งเตือนขณะนี้'));return;}
  replace('system-alerts',...data.alerts.map((alert)=>{const node=element('div',alert.severity==='critical'?'system-alert critical':'system-alert');node.append(element('strong','',alert.severity==='critical'?'ต้องตรวจสอบทันที':'ควรตรวจสอบ'),element('p','',alert.message || alert.code),element('small','mono',alert.code));return node;}));
}
function renderQueueWarning() {
  const queued=state.status?.queue?.queued,running=state.status?.queue?.running;
  let message='API ยังไม่ส่งจำนวนงานในคิว';
  if(Number.isFinite(queued)&&Number.isFinite(running))message='คิวปัจจุบัน: รอ '+queued+' งาน · กำลังทำงาน '+running+' งาน'+(queued>0?' — ชุดใหม่จะเข้าคิวต่อจากงานที่มีอยู่':'');
  if(state.status?.worker?.status==='missing')message+=' · ไม่พบสัญญาณ Worker โปรดตรวจสอบก่อนส่งชุดใหญ่';
  if(state.status?.queue?.oldestQueuedAt)message+=' · งานเก่าสุดรอตั้งแต่ '+stamp(state.status.queue.oldestQueuedAt);
  text('batch-queue-warning',message);
}
function updateBatchTeamInfo() {
  ['a','b'].forEach((side)=>{const team=state.teams.find((item)=>item.id===$('batch-team-'+side).value);text('batch-team-'+side+'-info',team?'Revision '+(team.revision??'—')+' · '+(team.characters || team.data?.characters || []).length+' ตัวละคร':'เลือกทีมที่บันทึกไว้');});
}
function randomBatchSeed() {
  const values=new Uint32Array(1);crypto.getRandomValues(values);
  const count=Math.max(1,Math.min(100,Number($('batch-count').value)||10));
  $('batch-start-seed').value=String(values[0]%(4294967296-count+1));
}
function batchPayload() {
  const name=$('batch-name').value.trim(),teamA=state.teams.find((item)=>item.id===$('batch-team-a').value),teamB=state.teams.find((item)=>item.id===$('batch-team-b').value);
  if(!name || name.length>80)throw new Error('ระบุชื่อชุดทดลองไม่เกิน 80 ตัวอักษร');
  if(!teamA || !teamB)throw new Error('เลือกทีมทั้งสองฝ่าย');
  if(!Number.isInteger(teamA.revision)||!Number.isInteger(teamB.revision))throw new Error('API ไม่ส่ง revision ของทีม กรุณาโหลดข้อมูลใหม่');
  const count=Number($('batch-count').value),seed=$('batch-start-seed').value.trim();
  if(!Number.isInteger(count)||count<1||count>100)throw new Error('จำนวนแมตช์ต้องเป็นจำนวนเต็ม 1–100');
  if(!/^\d+$/.test(seed)||Number(seed)>4294967295)throw new Error('Seed เริ่มต้นต้องเป็นจำนวนเต็ม 0–4294967295');
  if(Number(seed)+count-1>4294967295)throw new Error('Seed สุดท้ายเกิน 4294967295 ลด seed เริ่มต้นหรือจำนวนแมตช์');
  return{name,teamAId:teamA.id,teamBId:teamB.id,teamARevision:teamA.revision,teamBRevision:teamB.revision,rulesVersion:'prototype-v1',startSeed:String(Number(seed)),count};
}
async function submitBatch(event) {
  event.preventDefault();if(state.batchBusy)return;clearError('batch-error');
  state.batchBusy=true;const ids=['batch-name','batch-team-a','batch-team-b','batch-start-seed','batch-count','batch-random-seed-button','batch-new-command-button','start-batch-button'];ids.forEach((id)=>{$(id).disabled=true;});
  try{
    const body=batchPayload(),fingerprint=JSON.stringify(body);
    if(!state.pendingBatchCommand||state.pendingBatchCommand.fingerprint!==fingerprint)state.pendingBatchCommand={key:uuid(),fingerprint,result:null};
    const command=state.pendingBatchCommand;
    const result=await api('/batches',{method:'POST',body,headers:{'Idempotency-Key':command.key}});
    command.result=result;const id=result.id || result.batchId;
    const message=element('div');message.append(element('strong','',result.reused?'เปิดคำสั่งชุดทดลองเดิม':'รับชุดทดลองเข้าระบบแล้ว'),element('p','mono',id),element('p','small-text','ส่งข้อมูลเดิมซ้ำจะใช้คำสั่งเดิม กด “เริ่มคำสั่งชุดใหม่” เมื่อต้องการสร้างการทดลองใหม่'));
    if(id)message.append(action('เปิดรายละเอียด',()=>openBatch(id)));
    replace('batch-submitted',message);$('batch-submitted').hidden=false;
    notice(result.reused?'ใช้ชุดทดลองเดิม ไม่มีการสร้างซ้ำ':'ส่งชุดทดลองแล้ว ติดตามผลในรายละเอียดด้านล่าง');
    if(id)await openBatch(id);await refresh();
  }catch(error){showError('batch-error',error);}finally{state.batchBusy=false;ids.forEach((id)=>{$(id).disabled=false;});}
}
function batchTeam(batch,side) {
  const input=batch.input || {},team=input['team'+side] || input.teams?.[side] || {};
  return{name:team.name || team.data?.name || input['team'+side+'Name'] || batch['team'+side+'Name'] || 'ไม่ระบุชื่อทีม',revision:team.revision ?? input['team'+side+'Revision'] ?? batch['team'+side+'Revision'],id:team.id || input['team'+side+'Id'] || batch['team'+side+'Id']};
}
function batchTeamCaption(batch,side) {const team=batchTeam(batch,side);return team.name+' · revision '+(team.revision??'—');}
function batchProvisional(batch) {
  const summary=batch.summary || {};
  return !Number.isFinite(summary.total)||!Number.isFinite(summary.succeeded)||summary.succeeded<summary.total||Number(summary.failed)>0;
}
function percent(value) {return typeof value==='number'&&Number.isFinite(value)?value.toFixed(1)+'%':'—';}
function average(value) {return typeof value==='number'&&Number.isFinite(value)?value.toFixed(2):'—';}
function renderBatches() {
  if(!state.batches.length)replace('batch-list',empty('ยังไม่มีชุดทดลอง','เลือกสองทีมและจำนวนแมตช์เพื่อเริ่มเก็บผลจากหลาย seed'));
  else replace('batch-list',table(['ชื่อชุด / รหัส','สถานะ','ความคืบหน้า','สร้างเมื่อ',''],state.batches.map((batch)=>{
    const title=element('div','',batch.name || batch.id);title.append(element('span','subtext mono',batch.id));
    const summary=batch.summary;const progress=summary?String(summary.succeeded??'—')+' / '+String(summary.total??'—')+' สำเร็จ':'เปิดรายละเอียดเพื่อดูผล';
    return[title,pill(batch.status),progress,stamp(batch.createdAt),action('รายละเอียด',()=>openBatch(batch.id))];
  })));
  ['compare-batch-a','compare-batch-b'].forEach((id)=>{const select=$(id),previous=select.value,placeholder=element('option','','เลือกชุดทดลอง');placeholder.value='';select.replaceChildren(placeholder);state.batches.forEach((batch)=>{const option=element('option','',(batch.name || batch.id)+' · '+stamp(batch.createdAt));option.value=batch.id;select.append(option);});if(state.batches.some((batch)=>batch.id===previous))select.value=previous;});
}
async function openBatch(id) {
  if(!id)return;state.selectedBatchId=id;
  if(state.route!=='batches')location.hash='batches';
  try{const response=await api('/batches/'+encodeURIComponent(id));if(state.selectedBatchId!==id)return;state.batchDetail=response?.batch || response;renderBatchDetail();}
  catch(error){showError('page-error',error);}
}
function renderBatchDetail() {
  const batch=state.batchDetail;if(!batch)return;
  $('batch-detail-panel').hidden=false;text('batch-detail-title',batch.name || 'รายละเอียดชุดทดลอง');
  const input=batch.input || {},summary=batch.summary || {};
  replace('batch-detail-meta',detailItem('รหัสชุดทดลอง',batch.id,true),detailItem('ฝ่าย A',batchTeamCaption(batch,'A')),detailItem('ฝ่าย B',batchTeamCaption(batch,'B')),detailItem('Seed เริ่มต้น',input.startSeed,true),detailItem('จำนวนแมตช์',input.count ?? summary.total),detailItem('กติกา',input.rulesVersion,true));
  const provisional=batchProvisional(batch);$('batch-provisional').hidden=!provisional;
  text('batch-provisional','ผลเบื้องต้น: สำเร็จ '+(summary.succeeded??'—')+' จาก '+(summary.total??'—')+' แมตช์ · ล้มเหลว '+(summary.failed??'—')+' แมตช์ สถิติยังไม่ครอบคลุมชุดทดลองทั้งหมด');
  const cards=[['ชนะฝ่าย A',summary.winsA,percent(summary.winRateA)],['ชนะฝ่าย B',summary.winsB,percent(summary.winRateB)],['เสมอ',summary.draws,'จากแมตช์ที่สำเร็จ'],['รอบเฉลี่ย',average(summary.averageRounds),'จากแมตช์ที่สำเร็จ'],['รอ / ทำงาน',(summary.queued??'—')+' / '+(summary.running??'—'),'สถานะคิว'],['สำเร็จ / ทั้งหมด',(summary.succeeded??'—')+' / '+(summary.total??'—'),'ล้มเหลว '+(summary.failed??'—')]];
  replace('batch-summary',...cards.map(([caption,value,sub])=>{const card=element('div','batch-stat');card.append(element('span','',caption),element('strong','',asText(value)),element('small','',sub));return card;}));
  const matches=list(batch,'matches');
  if(!matches.length)replace('batch-matches',empty('ยังไม่มีรายการแมตช์','โหลดข้อมูลใหม่หลังเซิร์ฟเวอร์เตรียมคิว'));
  else replace('batch-matches',table(['แมตช์','Seed','สถานะ','ผล','รอบ',''],matches.map((match)=>[element('span','mono',match.matchId || match.id),element('span','mono',match.seed),pill(match.status),winnerText(match.winner),match.rounds??'—',action('ดูผล',()=>openMatch(match.matchId || match.id))])));
}
async function rerunBatch() {
  const id=state.selectedBatchId;if(!id||state.batchBusy)return;
  state.batchBusy=true;$('batch-rerun-button').disabled=true;
  try{
    if(!state.rerunCommands[id])state.rerunCommands[id]={key:uuid(),result:null};
    const command=state.rerunCommands[id];
    const result=await api('/batches/'+encodeURIComponent(id)+'/reruns',{method:'POST',headers:{'Idempotency-Key':command.key}});
    command.result=result;const newId=result.id || result.batchId;
    notice(result.reused?'เปิดชุดที่ทดลองซ้ำไว้แล้ว':'สร้างชุดทดลองซ้ำด้วย snapshot เดิมแล้ว');
    if(newId)await openBatch(newId);await refresh();
  }catch(error){notice(errorMessage(error),true);}finally{state.batchBusy=false;$('batch-rerun-button').disabled=false;}
}
async function exportBatchCsv() {
  const id=state.selectedBatchId;if(!id)return;
  const button=$('batch-csv-button');button.disabled=true;
  try{const blob=await api('/batches/'+encodeURIComponent(id)+'/export.csv',{responseType:'blob'}),url=URL.createObjectURL(blob),a=element('a');a.href=url;a.download='guild-arena-batch-'+String(id).replace(/[^a-zA-Z0-9_-]/g,'_')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('ดาวน์โหลด CSV ผ่านการตรวจสิทธิ์แล้ว');}
  catch(error){notice(errorMessage(error),true);}finally{button.disabled=false;}
}
async function compareBatches(event) {
  event.preventDefault();const ids=[$('compare-batch-a').value,$('compare-batch-b').value];
  if(!ids[0]||!ids[1])return;
  if(ids[0]===ids[1]){notice('เลือกคนละชุดทดลองเพื่อเปรียบเทียบ',true);return;}
  const button=$('compare-batches-button');button.disabled=true;const epoch=++state.compareEpoch;
  try{const results=await Promise.all(ids.map((id)=>api('/batches/'+encodeURIComponent(id))));if(epoch!==state.compareEpoch)return;state.compareIds=ids;state.comparison=results.map((item)=>item?.batch||item);renderComparison();}
  catch(error){notice(errorMessage(error),true);}finally{button.disabled=false;}
}
function renderComparison() {
  if(!state.comparison || state.comparison.length!==2)return;
  const [a,b]=state.comparison;const summaries=[a.summary||{},b.summary||{}];
  const rows=[['สถานะ',pill(a.status),pill(b.status)],['ฝ่าย A',batchTeamCaption(a,'A'),batchTeamCaption(b,'A')],['ฝ่าย B',batchTeamCaption(a,'B'),batchTeamCaption(b,'B')],['กติกา',a.input?.rulesVersion,b.input?.rulesVersion],['Seed เริ่มต้น',a.input?.startSeed,b.input?.startSeed],['จำนวนแมตช์',a.input?.count??summaries[0].total,b.input?.count??summaries[1].total],['สำเร็จ',...summaries.map((s)=>s.succeeded??'—')],['รอ / ทำงาน',...summaries.map((s)=>(s.queued??'—')+' / '+(s.running??'—'))],['ล้มเหลว',...summaries.map((s)=>s.failed??'—')],['ฝ่าย A ชนะ',...summaries.map((s)=>(s.winsA??'—')+' · '+percent(s.winRateA))],['ฝ่าย B ชนะ',...summaries.map((s)=>(s.winsB??'—')+' · '+percent(s.winRateB))],['เสมอ',...summaries.map((s)=>s.draws??'—')],['รอบเฉลี่ย',...summaries.map((s)=>average(s.averageRounds))]];
  const nodes=[];if(batchProvisional(a)||batchProvisional(b))nodes.push(element('p','info-box compare-warning','ผลเบื้องต้น: อย่างน้อยหนึ่งชุดยังสำเร็จไม่ครบหรือมีแมตช์ล้มเหลว อัตราชนะคำนวณจากตัวอย่างที่สำเร็จเท่านั้น'));
  nodes.push(table(['รายการ',a.name || a.id,b.name || b.id],rows));
  nodes.push(element('p','field-help','อ่าน revision, seed, จำนวนตัวอย่าง และกติกาประกอบก่อนสรุปผล การเทียบนี้เป็นผลของกติกาต้นแบบ'));
  replace('batch-comparison',...nodes);
}
function clearPasswordFields(){['current-password','new-password','confirm-new-password','revoke-password'].forEach((id)=>{$(id).value='';});}
async function changePassword(event) {
  event.preventDefault();clearError('password-error');const button=$('change-password-button');button.disabled=true;
  try{
    const currentPassword=$('current-password').value,newPassword=$('new-password').value;
    if(newPassword!==$('confirm-new-password').value)throw new Error('รหัสผ่านใหม่และช่องยืนยันไม่ตรงกัน');
    if(newPassword.length<12||newPassword.length>1024)throw new Error('รหัสผ่านใหม่ต้องมี 12–1024 ตัวอักษร');
    if(newPassword===currentPassword)throw new Error('รหัสผ่านใหม่ต้องต่างจากรหัสเดิม');
    await api('/auth/password',{method:'POST',body:{currentPassword,newPassword}});
    clearPasswordFields();endSession();notice('เปลี่ยนรหัสผ่านและยกเลิกทุกเซสชันแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
  }catch(error){showError('password-error',error);}finally{clearPasswordFields();button.disabled=false;}
}
async function revokeSessions(event) {
  event.preventDefault();clearError('revoke-error');const button=$('revoke-sessions-button');button.disabled=true;
  try{await api('/auth/revoke-sessions',{method:'POST',body:{currentPassword:$('revoke-password').value}});clearPasswordFields();endSession();notice('ยกเลิกทุกเซสชันแล้ว กรุณาเข้าสู่ระบบอีกครั้ง');}
  catch(error){showError('revoke-error',error);}finally{clearPasswordFields();button.disabled=false;}
}
function auditPath(cursor){return '/audit?limit=50'+(cursor?'&before='+encodeURIComponent(cursor):'');}
function renderAudit() {
  const filter=$('audit-filter').value.trim().toLowerCase();
  const entries=state.auditEntries.filter((entry)=>!filter||[entry.actorName,asText(entry.actor),entry.action,asText(entry.target),asText(entry.metadata)].join(' ').toLowerCase().includes(filter));
  text('audit-page-label','หน้าที่ '+state.auditPage+' · แสดง '+entries.length+' จาก '+state.auditEntries.length+' รายการในหน้านี้ · เรียงใหม่ไปเก่า');
  $('audit-next-button').disabled=!state.auditNextCursor||state.auditBusy;
  if(!entries.length){replace('audit-list',empty('ไม่พบบันทึก',filter?'ไม่มีรายการตรงกับคำค้นในหน้านี้':'API ยังไม่มีบันทึกในหน้าที่เลือก'));return;}
  replace('audit-list',table(['เวลา','ผู้กระทำ','คำสั่ง','เป้าหมาย','รายละเอียด'],entries.map((entry)=>{
    const details=element('details');details.append(element('summary','text-link','ดูข้อมูล'),element('pre','json-output',pretty(entry.metadata??{})));
    return[stamp(entry.createdAt),asText(entry.actorName || entry.actor),element('span','mono',entry.action),element('span','mono audit-target',asText(entry.target)),details];
  })));
}
async function loadAuditPage(cursor=null) {
  if(state.auditBusy)return;state.auditBusy=true;const epoch=++state.auditEpoch;$('audit-next-button').disabled=true;$('audit-latest-button').disabled=true;
  try{const data=await api(auditPath(cursor));if(epoch!==state.auditEpoch)return;state.auditEntries=list(data,'entries');state.auditCursor=cursor;state.auditNextCursor=data?.nextCursor??null;state.auditPage=cursor?state.auditPage+1:1;renderAudit();}
  catch(error){notice(errorMessage(error),true);}finally{state.auditBusy=false;$('audit-latest-button').disabled=false;$('audit-next-button').disabled=!state.auditNextCursor;}
}
function renderBackupPolicy() {
  const data=state.backupPolicy;if(!data)return;
  const schedule=data.schedule||{},retention=data.retention||{},offsite=data.offsite||{},grid=element('div','policy-grid');
  grid.append(detailItem('ตารางอัตโนมัติ',schedule.enabled===true?'เปิดใช้งาน':schedule.enabled===false?'ปิดใช้งาน':'API ไม่ระบุ'),detailItem('เวลาสำรอง',schedule.time?(schedule.time+' · '+(schedule.timeZone || 'API ไม่ระบุเขตเวลา')):'API ไม่ระบุ'),detailItem('เก็บสำเนาในเครื่อง',Number.isFinite(retention.local)?retention.local+' ชุด':'API ไม่ระบุ'),detailItem('เก็บสำเนา Google Drive',Number.isFinite(retention.remote)?retention.remote+' ชุด':'API ไม่ระบุ'),detailItem('ลบตามนโยบาย',retention.autoDelete===true?'เปิด เฉพาะ Backup ที่ระบบนี้บันทึกไว้':retention.autoDelete===false?'ปิด':'API ไม่ระบุ'),detailItem('ผู้ให้บริการสำเนา',offsite.provider || 'API ไม่ระบุ'),detailItem('การตั้งค่าสำเนานอก VPS',offsite.configured===true?'ตั้งค่าแล้ว':offsite.configured===false?'ยังไม่ตั้งค่า':'API ไม่ระบุ'),detailItem('ตรวจสำเนาล่าสุด',stamp(offsite.lastVerifiedAt)),detailItem('สถานะจาก API',typeof data.status==='string'?label(data.status):asText(data.status)));
  const nodes=[grid,element('p','info-box compare-warning','Backup ตามเวลาใน VPS ทำงานได้อิสระ ส่วนการส่งสำเนาไป Google Drive ใช้ Codex app ซึ่งต้องเปิดอยู่และเชื่อมต่อ Google Drive ได้ หากแอปปิดหรือการเชื่อมต่อขัดข้อง ให้ตรวจสำเนาค้างส่งและเวลาที่ตรวจสำเนาล่าสุด')];
  if(offsite.configured===false)nodes.push(element('p','info-box compare-warning','ยังไม่พร้อมสำรองไป Google Drive ต้องตั้งค่าการเชื่อมต่อบนเซิร์ฟเวอร์ก่อน สถานะเปิดตารางเพียงอย่างเดียวไม่ได้ยืนยันว่าสำเนานอก VPS สำเร็จ'));
  if(offsite.lastError)nodes.push(element('p','inline-error',asText(offsite.lastError)));
  const details=element('details','raw-details');details.append(element('summary','','ข้อมูลนโยบายจาก API'),element('pre','json-output',pretty(data)));nodes.push(details);replace('backup-policy',...nodes);
}
function renderBackupCopies() {
  if(!state.backupCopies.length){replace('backup-copies',empty('ยังไม่มีบันทึกสำเนานอก VPS','ตรวจการตั้งค่า Google Drive และสถานะสำรองจากเซิร์ฟเวอร์'));return;}
  replace('backup-copies',table(['Backup','ผู้ให้บริการ / รหัสไฟล์','สถานะ','ตรวจสอบเมื่อ','รายละเอียด'],state.backupCopies.map((copy)=>{
    const provider=element('div','',copy.provider || '—');provider.append(element('span','subtext mono audit-target',copy.providerFileId || copy.fileId || '—'));
    const details=element('details');details.append(element('summary','text-link','ดู hash และผล'),element('pre','json-output',pretty(copy)));
    return[element('span','mono',copy.backupId),provider,pill(copy.status),stamp(copy.verifiedAt),details];
  })));
}

$('api-url').value=publicStoredUrl() || API_BASE;
$('login-form').addEventListener('submit',login);
$('logout-button').addEventListener('click',logout);
$('topbar-logout-button').addEventListener('click',logout);
$('refresh-button').addEventListener('click',()=>refresh());
$('new-team-button').addEventListener('click',()=>newTeam());
$('sample-a-button').addEventListener('click',()=>fillSample('A'));
$('sample-b-button').addEventListener('click',()=>fillSample('B'));
$('team-form').addEventListener('submit',saveTeam);
$('team-json').addEventListener('input',()=>{state.teamDirty=true;});
$('team-a').addEventListener('change',updateTeamInfo);$('team-b').addEventListener('change',updateTeamInfo);
$('random-seed-button').addEventListener('click',randomSeed);
$('match-form').addEventListener('submit',submitMatch);
$('new-command-button').addEventListener('click',()=>{state.pendingCommand=null;$('submitted-match').hidden=true;clearError('match-error');notice('พร้อมส่งคำสั่งแมตช์ใหม่ กดเริ่มการต่อสู้เพื่อส่ง');});
$('match-filter').addEventListener('change',renderMatches);
$('detail-replay-button').addEventListener('click',()=>openSnapshot(state.selectedMatchId));
$('snapshot-form').addEventListener('submit',loadSnapshot);
$('previous-event-button').addEventListener('click',()=>{stopPlayback();selectEvent(state.eventIndex-1);});
$('next-event-button').addEventListener('click',()=>{stopPlayback();selectEvent(state.eventIndex+1);});
$('event-range').addEventListener('input',()=>{stopPlayback();selectEvent(Number($('event-range').value));});
$('play-events-button').addEventListener('click',togglePlayback);
$('replay-check-button').addEventListener('click',replayCheck);
$('download-snapshot-button').addEventListener('click',downloadSnapshot);
$('create-backup-button').addEventListener('click',createBackup);
$('cancel-restore-button').addEventListener('click',()=>{$('restore-dialog').close();state.restoreTarget=null;});
$('restore-form').addEventListener('submit',submitRestore);

$('batch-form').addEventListener('submit',submitBatch);
$('batch-team-a').addEventListener('change',updateBatchTeamInfo);$('batch-team-b').addEventListener('change',updateBatchTeamInfo);
$('batch-random-seed-button').addEventListener('click',randomBatchSeed);
$('batch-new-command-button').addEventListener('click',()=>{state.pendingBatchCommand=null;$('batch-submitted').hidden=true;clearError('batch-error');notice('พร้อมสร้างชุดทดลองใหม่ กดเริ่มชุดทดลองเพื่อส่งคำสั่ง');});
$('batch-rerun-button').addEventListener('click',rerunBatch);
$('batch-csv-button').addEventListener('click',exportBatchCsv);
$('batch-compare-form').addEventListener('submit',compareBatches);
$('password-form').addEventListener('submit',changePassword);
$('revoke-sessions-form').addEventListener('submit',revokeSessions);
$('audit-filter').addEventListener('input',renderAudit);
$('audit-latest-button').addEventListener('click',()=>loadAuditPage());
$('audit-next-button').addEventListener('click',()=>{if(state.auditNextCursor)loadAuditPage(state.auditNextCursor);});
window.addEventListener('hashchange',navigate);
window.addEventListener('beforeunload',(event)=>{if(state.teamDirty && state.token){event.preventDefault();event.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlayback();else if(state.token)refresh(true);});
setInterval(()=>{if(state.token && !document.hidden && !$('restore-dialog').open)refresh(true);},15000);
navigate();

