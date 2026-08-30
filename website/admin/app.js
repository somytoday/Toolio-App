import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7';

const SUPABASE_URL = 'https://bhbvzkogznvejhfrveqb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoYnZ6a29nem52ZWpoZnJ2ZXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNzc3NjQsImV4cCI6MjA5ODg1Mzc2NH0.uj8yYrD-50kkb3lfmSQHs5KSL2rOMLGX92s7xePq9wE';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'toolio-admin-auth',
  },
});

const $ = (id) => document.getElementById(id);
let users = [];
let codes = [];
let codeFilter = 'all';
let userFilter = 'all';
let userAudience = 'app';
let storeCustomerIds = new Set();
let visibleCodes = [];
let visibleUsers = [];
let userPage = 1;
let codePage = 1;
const PAGE_SIZE = 30;
const LIVE_REFRESH_MS = 60 * 1000;
let liveRefreshRunning = false;
let toolAvailability = [];
let adminSuggestions = [];
const TOOL_LABELS = {
  'flow-image': 'Flow Image',
  'flow-video': 'Flow Video',
  'gemini-tts': 'Gemini TTS',
  'prompt-cleaner': 'Prompt Cleaner',
  'sequence-checker': 'Sequence Checker',
  'sequence-shifter': 'Sequence Shifter',
  'capcut-automator': 'CapCut Automator',
  'capcut-unlocker': 'CapCut Unlocker',
  'glabs-unlocker': 'G-Labs Unlocker',
  'glabs-task-selector': 'G-Labs Selector',
  'whiteboard-animator': 'Whiteboard Animator',
};

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.remove('hidden');
  setTimeout(() => $('toast').classList.add('hidden'), 3500);
}

function fmt(value) {
  return value ? new Date(value).toLocaleString() : '-';
}

function dateParts(value) {
  if (!value) return { time: '-', date: 'Never' };
  const date = new Date(value);
  return {
    time: date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    date: date.toLocaleDateString(),
  };
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function expiresAfterDays(days) {
  const value = Number(days || 0);
  return value > 0 ? new Date(Date.now() + value * 86400000).toISOString() : null;
}

function usesText(c) {
  const count = c.redemption_count || 0;
  return `${count}/${c.max_redemptions ?? 'unlimited'}`;
}

async function copyText(text, label = 'Copied') {
  if (!text) return toast('Nothing to copy');
  if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
  else {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    el.remove();
  }
  toast(label);
}

function downloadText(filename, text, type = 'text/plain') {
  if (!text) return toast('Nothing to export');
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const csv = (rows) => rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');

async function rpc(name, body = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.expires_at && session.expires_at * 1000 - Date.now() < 120000) await supabase.auth.refreshSession();

  let { data, error } = await supabase.rpc(name, body);
  if (error && /jwt expired/i.test(error.message || '')) {
    await supabase.auth.refreshSession();
    ({ data, error } = await supabase.rpc(name, body));
  }
  if (error) throw error;
  if (data && data.ok === false) throw new Error(data.error || 'Request failed');
  return data;
}

async function refresh() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  $('locked').classList.toggle('hidden', Boolean(user));
  $('dashboard').classList.toggle('hidden', !user);
  $('btn-login').classList.toggle('hidden', Boolean(user));
  $('btn-logout').classList.toggle('hidden', !user);
  $('admin-email').textContent = user?.email || 'Not signed in';
  if (!user) return;

  await Promise.all([loadStats(), loadUsers(), loadCodes(), loadAppStatus(), loadToolAvailability(), loadCommerce(), loadAdminSuggestions(), loadLogs()]).catch((err) => toast(err.message));
  renderAudienceStats();
}

function option(value, current, label) {
  return `<option value="${esc(value)}"${value === current ? ' selected' : ''}>${esc(label)}</option>`;
}

function compareVersions(left, right) {
  const parts = (value) => String(value || '').split(/[+-]/, 1)[0].split('.').map((part) => Number(part) || 0);
  const a = parts(left);
  const b = parts(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

async function loadToolAvailability() {
  const data = await rpc('get_admin_tool_availability');
  toolAvailability = data.tools || [];
  renderToolAvailability();
}

function renderToolAvailability() {
  $('tool-controls').innerHTML = toolAvailability.length ? toolAvailability.map((tool) => `
    <article class="tool-control" data-tool-control="${esc(tool.tool_id)}">
      <div class="tool-control-head">
        <div><h3>${esc(TOOL_LABELS[tool.tool_id] || tool.tool_id)}</h3><code>${esc(tool.tool_id)}</code></div>
        <span class="pill ${tool.state === 'live' ? 'good' : tool.state === 'maintenance' ? 'warn' : 'bad'}">${esc(tool.state)}</span>
      </div>
      <div class="tool-control-grid">
        <label>State<select data-tool-field="state">
          ${option('live', tool.state, 'Live')}${option('maintenance', tool.state, 'Maintenance')}${option('hidden', tool.state, 'Hidden')}
        </select></label>
        <label>Audience<select data-tool-field="audience">
          ${option('everyone', tool.audience, 'Everyone')}${option('existing_users', tool.audience, 'Existing users only')}
        </select><small class="muted tool-audience-help">Existing users only requires State = Live. Use Hidden only when nobody except explicitly allowed users should see the tool.</small></label>
        <label>Minimum app version<input data-tool-field="minimum_app_version" value="${esc(tool.minimum_app_version || '')}" placeholder="Optional, e.g. 1.0.7"></label>
        <label class="wide">User message<textarea data-tool-field="message" maxlength="240" placeholder="Shown during maintenance">${esc(tool.message || '')}</textarea></label>
      </div>
      <div class="tool-control-footer">
        <span class="muted">${tool.audience_cutoff ? `Existing-user cutoff: ${esc(fmt(tool.audience_cutoff))}` : 'Available to new and existing users'}<br>Updated ${esc(fmt(tool.updated_at))}</span>
        <button class="btn primary" data-save-tool="${esc(tool.tool_id)}">Save</button>
      </div>
    </article>
  `).join('') : '<p class="muted">No tool controls are configured.</p>';
}

async function saveToolAvailability(toolId, button) {
  const card = button.closest('[data-tool-control]');
  const field = (name) => card.querySelector(`[data-tool-field="${name}"]`).value;
  const previous = toolAvailability.find((tool) => tool.tool_id === toolId);
  const nextState = field('state');
  const nextAudience = field('audience');
  if (nextState === 'hidden' && nextAudience === 'existing_users') {
    toast('Choose Live with Existing users only. Hidden removes the tool from that audience too.', 'error');
    card.querySelector('[data-tool-field="state"]').focus();
    return;
  }
  if (previous?.state === 'live' && nextState !== 'live'
      && !confirm(`${TOOL_LABELS[toolId] || toolId} will stop accepting new work immediately. Work already submitted may finish safely. Continue?`)) return;
  const minimumVersion = field('minimum_app_version');
  const publicMinimum = $('version-minimum')?.value.trim();
  if (nextState === 'live' && minimumVersion && publicMinimum && compareVersions(minimumVersion, publicMinimum) > 0
      && !confirm(`This tool requires ${minimumVersion}, newer than the public minimum ${publicMinimum}. Older supported builds will show an update notice. Continue?`)) return;
  button.disabled = true;
  button.textContent = 'Saving...';
  try {
    await rpc('set_tool_availability', {
      p_tool_id: toolId,
      p_state: nextState,
      p_message: field('message'),
      p_minimum_app_version: minimumVersion || null,
      p_audience: nextAudience,
    });
    toast(`${TOOL_LABELS[toolId] || toolId} updated`);
    await Promise.all([loadToolAvailability(), loadLogs()]);
  } finally {
    button.disabled = false;
    button.textContent = 'Save';
  }
}

async function loadUserToolOverrides(userId) {
  const host = document.getElementById('user-tool-access');
  if (!host) return;
  try {
    const data = await rpc('get_admin_user_tool_overrides', { p_user_id: userId });
    host.innerHTML = (data.tools || []).map((tool) => `
      <label class="user-tool-row">
        <span>${esc(TOOL_LABELS[tool.tool_id] || tool.tool_id)}</span>
        <select data-user-tool-override="${esc(tool.tool_id)}" data-user-id="${esc(userId)}">
          ${option('inherit', tool.access, 'Inherit global setting')}
          ${option('allow', tool.access, 'Allow for this user')}
          ${option('hide', tool.access, 'Hide from this user')}
        </select>
      </label>
    `).join('');
  } catch (error) {
    host.innerHTML = `<p class="muted">Could not load tool access: ${esc(error.message)}</p>`;
  }
}

async function saveUserToolOverride(select) {
  select.disabled = true;
  try {
    await rpc('set_user_tool_override', {
      p_user_id: select.dataset.userId,
      p_tool_id: select.dataset.userToolOverride,
      p_access: select.value,
    });
    toast('User tool access updated');
    await loadLogs();
  } finally {
    select.disabled = false;
  }
}

async function loadStats() {
  const data = await rpc('get_admin_stats');
  $('stat-total').textContent = data.users.total;
  $('stat-online').textContent = data.users.online_now;
  $('stat-trial').textContent = data.users.trial;
  $('stat-paid').textContent = data.users.paid;
  $('stat-free').textContent = data.users.free;
  $('stat-codes').textContent = data.codes.unused;
}

let currentAppEnabled = true;

async function loadAppStatus() {
  const { data, error } = await supabase
    .from('app_guard_config')
    .select('key,value')
    .in('key', ['app_enabled', 'maintenance_message', 'block_message']);
  if (error) throw error;
  const guard = Object.fromEntries((data || []).map((row) => [row.key, row.value]));
  
  currentAppEnabled = guard.app_enabled !== 'false' && guard.app_enabled !== false;
  
  $('stat-app').innerHTML = currentAppEnabled
    ? '<span class="pill good">enabled</span>'
    : '<span class="pill bad">disabled</span>';
    
  if (guard.maintenance_message !== undefined) {
      $('guard-message').value = guard.maintenance_message || '';
  }
  if (guard.block_message !== undefined && $('block-message')) {
      $('block-message').value = guard.block_message || '';
  }

  const { data: version, error: versionError } = await supabase
    .from('app_versions')
    .select('*')
    .eq('platform', 'windows')
    .single();
  if (versionError) throw versionError;
  $('version-latest').value = version.latest_version || '';
  $('version-minimum').value = version.minimum_version || '';
  $('version-url').value = version.download_url || '';
  if ($('version-sha256')) $('version-sha256').value = version.download_sha256 || '';
  $('version-message').value = version.force_message || '';
}

async function loadUsers({ resetPage = true } = {}) {
  const [data, webCustomers] = await Promise.all([
    rpc('get_admin_users', { p_limit: 500, p_offset: 0 }),
    rpc('get_admin_web_customer_ids'),
  ]);
  users = data.users || [];
  storeCustomerIds = new Set(webCustomers.user_ids || []);
  $('app-users-count').textContent = users.filter(isAppUser).length;
  $('store-users-count').textContent = users.filter((user) => storeCustomerIds.has(user.id)).length;
  $('all-users-count').textContent = users.length;
  if (resetPage) userPage = 1;
  renderUsers();
  renderOnlineUsers();
}

async function refreshLiveData() {
  if (liveRefreshRunning || document.hidden) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  liveRefreshRunning = true;
  try {
    await Promise.all([loadStats(), loadUsers({ resetPage: false })]);
    renderAudienceStats();
  } finally {
    liveRefreshRunning = false;
  }
}

function userText(u) {
  return [
    u.display_name,
    u.email,
    u.id,
    u.device_name,
    u.device_id,
    u.device_blocked ? 'device blocked' : '',
    u.device_ban_reason_code,
    u.subscription_plan,
    u.days_remaining,
    ...(u.redeemed_codes || []).flatMap((c) => [c.code, c.label, c.duration_days, c.used_at]),
    ...(u.admin_grants || []).flatMap((g) => [g.reason, g.duration_days, g.created_at]),
  ].filter(Boolean).join(' ').toLowerCase();
}

function userPlan(u) {
  if (u.disabled_at) return 'disabled';
  const endsAt = u.subscription_ends_at ? new Date(u.subscription_ends_at).getTime() : 0;
  return endsAt > Date.now() ? (u.subscription_plan || u.plan || 'paid') : 'expired';
}

function expiringSoon(u) {
  const endsAt = u.subscription_ends_at ? new Date(u.subscription_ends_at).getTime() : 0;
  return endsAt > Date.now() && endsAt - Date.now() <= 3 * 86400000;
}

function isAppUser(user) {
  return Boolean(user.device_id || user.presence_last_seen_at || user.device_last_seen_at);
}

function renderAudienceStats() {
  const appUsers = users.filter(isAppUser);
  $('stat-total').textContent = appUsers.length;
  $('stat-store-customers').textContent = users.filter((user) => storeCustomerIds.has(user.id)).length;
  $('stat-online').textContent = appUsers.filter((user) => user.online_now).length;
  $('stat-trial').textContent = appUsers.filter((user) => userPlan(user) === 'trial').length;
  $('stat-paid').textContent = appUsers.filter((user) => userPlan(user) === 'paid').length;
  $('stat-free').textContent = appUsers.filter((user) => ['free', 'expired'].includes(userPlan(user))).length;
}

function filteredUsers() {
  const query = $('user-search')?.value.trim().toLowerCase() || '';
  return users.filter((u) => {
    const matchesAudience = userAudience === 'all'
      || (userAudience === 'app' ? isAppUser(u) : storeCustomerIds.has(u.id));
    const plan = userPlan(u);
    const matchesFilter = userFilter === 'all'
      || (userFilter === 'blocked' ? plan === 'disabled' || u.device_blocked : userFilter === 'online' ? u.online_now : userFilter === 'expiring' ? expiringSoon(u) : plan === userFilter);
    return matchesAudience && matchesFilter && (!query || userText(u).includes(query));
  });
}

function renderUsers() {
  const allRows = filteredUsers();
  visibleUsers = allRows;
  const pageCount = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  userPage = Math.min(userPage, pageCount);
  const rows = allRows.slice((userPage - 1) * PAGE_SIZE, userPage * PAGE_SIZE);
  $('users-result-count').textContent = `${allRows.length} user${allRows.length === 1 ? '' : 's'}`;
  $('users-page-label').textContent = `Page ${userPage} of ${pageCount}`;
  $('btn-users-prev').disabled = userPage === 1;
  $('btn-users-next').disabled = userPage === pageCount;
  $('users-body').innerHTML = rows.length ? rows.map((u) => {
    const plan = userPlan(u);
    const initial = (u.display_name || u.email || '?').trim().charAt(0).toUpperCase();
    const lastSeen = dateParts(u.presence_last_seen_at || u.device_last_seen_at || u.last_login_at);
    return `
      <tr>
        <td data-label="User"><div class="user-cell"><span class="user-avatar">${esc(initial)}</span><span class="cell-stack"><strong>${esc(u.display_name || 'Unnamed user')}</strong><span class="cell-meta truncate">${esc(u.email || '-')}</span><span class="cell-meta truncate">${esc(u.id)}</span></span></div></td>
        <td data-label="Subscription"><div class="cell-stack"><span><span class="pill ${plan === 'expired' || plan === 'disabled' ? 'bad' : plan === 'trial' ? 'warn' : 'good'}">${esc(plan)}</span>${expiringSoon(u) ? ' <span class="pill warn">soon</span>' : ''}</span><strong>${u.days_remaining ?? 0} days left</strong><span class="cell-meta">Ends ${esc(fmt(u.subscription_ends_at))}</span></div></td>
        <td data-label="Device & Activity"><div class="cell-stack"><strong class="truncate">${esc(u.device_name || 'No known device')}</strong><span class="cell-meta">Transfers ${u.transfer_count || 0}/${u.transfer_limit || 3} · Version ${esc(u.app_version || '-')}</span><span><span class="pill ${u.device_blocked ? 'bad' : u.online_now ? 'good' : ''}">${u.device_blocked ? 'device blocked' : u.online_now ? 'online' : 'offline'}</span></span></div></td>
        <td data-label="Codes Used">${renderUserCodeSummary(u)}</td>
        <td data-label="Last Seen"><div class="cell-stack login-cell"><strong>${esc(lastSeen.time)}</strong><span class="cell-meta">${esc(lastSeen.date)}</span></div></td>
        <td data-label="Actions"><div class="row-actions"><button class="btn details-btn" data-view-user="${esc(u.id)}">Details</button><button class="btn ${u.disabled_at ? 'primary' : 'danger'}" data-toggle-user="${esc(u.id)}" data-disabled="${u.disabled_at ? '1' : '0'}">${u.disabled_at ? 'Unblock' : 'Block'}</button></div></td>
      </tr>`;
  }).join('') : '<tr class="empty-row"><td colspan="6">No users match this search or filter.</td></tr>';
}

function renderUserCodes(items = [], grants = []) {
  if (!items.length && !grants.length) return '<p class="muted">No recharge codes or admin grants yet.</p>';
  return `<div class="code-history">${items.map((c) => `
    <div class="history-row"><div><strong>${esc(c.code || c.label || 'Older hidden code')}</strong><span class="muted">${esc(c.label || 'Recharge code')} · ${esc(c.duration_days)} days</span></div><span class="muted">${esc(fmt(c.used_at))}</span></div>
  `).join('')}${grants.map((g) => `
    <div class="history-row"><div><strong>Admin grant · ${esc(g.duration_days)} days</strong><span class="muted">${esc(g.reason || 'No reason added')}</span></div><span class="muted">${esc(fmt(g.created_at))}</span></div>
  `).join('')}</div>`;
}

function renderUserCodeSummary(u) {
  const codeCount = u.redeemed_codes?.length || 0;
  const grantCount = u.admin_grants?.length || 0;
  const total = codeCount + grantCount;
  if (!total) return '<span class="muted">-</span>';
  return `<button class="btn ghost" data-view-user="${esc(u.id)}">View ${total}</button>`;
}

function renderOnlineUsers() {
  const online = users.filter((u) => u.online_now);
  $('online-users').innerHTML = online.length
    ? online.map((u) => `<span class="pill good">${esc(u.email || u.display_name || u.id)}</span>`).join('')
    : 'No online users';
}

async function loadCodes() {
  const data = await rpc('get_admin_codes', { p_limit: 500, p_offset: 0 });
  codes = data.codes || [];
  codePage = 1;
  renderCodes();
}

function renderCodes() {
  const query = $('code-search')?.value.trim().toLowerCase() || '';
  let allRows = codeFilter === 'all' ? codes : codes.filter((c) => c.status === codeFilter);
  allRows = query ? allRows.filter((c) => [c.code_text, c.status, c.label, c.used_by_email, c.used_by_name, c.duration_days, c.redemption_count, c.max_redemptions].filter(Boolean).join(' ').toLowerCase().includes(query)) : allRows;
  visibleCodes = allRows.filter((c) => c.code_text).map((c) => c.code_text);
  const pageCount = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  codePage = Math.min(codePage, pageCount);
  const rows = allRows.slice((codePage - 1) * PAGE_SIZE, codePage * PAGE_SIZE);
  $('codes-result-count').textContent = `${allRows.length} code${allRows.length === 1 ? '' : 's'}`;
  $('codes-page-label').textContent = `Page ${codePage} of ${pageCount}`;
  $('btn-codes-prev').disabled = codePage === 1;
  $('btn-codes-next').disabled = codePage === pageCount;
  $('codes-body').innerHTML = rows.length ? rows.map((c) => `
    <tr>
      <td><code>${esc(c.code_text || 'Hidden (old code)')}</code></td>
      <td><span class="pill ${c.status === 'used' || c.status === 'active' ? 'good' : c.status === 'disabled' ? 'bad' : ''}">${esc(c.status)}</span></td>
      <td>${esc(c.duration_days)}</td>
      <td>${esc(usesText(c))}</td>
      <td>${esc(c.label || '-')}</td>
      <td>${esc(fmt(c.expires_at))}</td>
      <td>${esc(c.used_by_email || '-')}</td>
      <td>${esc(fmt(c.created_at))}</td>
      <td class="row-actions">${c.code_text ? `<button class="btn ghost" data-copy-code="${esc(c.code_text)}">Copy</button>` : '-'}${c.id && ['unused', 'active'].includes(c.status) ? `<button class="btn danger" data-disable-code="${esc(c.id)}">Disable</button>` : ''}</td>
    </tr>
  `).join('') : '<tr class="empty-row"><td colspan="9">No recharge codes match this search or filter.</td></tr>';
}

function exportUsers(format) {
  const rows = visibleUsers.map((u) => [u.id, u.email, u.display_name, userPlan(u), u.subscription_ends_at, u.device_name, u.online_now ? 'online' : 'offline']);
  if (format === 'csv') return downloadText('toolio-users.csv', csv([['id', 'email', 'name', 'plan', 'ends_at', 'device', 'online'], ...rows]), 'text/csv');
  downloadText('toolio-users.txt', rows.map((r) => r.join(' | ')).join('\n'));
}

function exportCodes(format) {
  const rows = codes.filter((c) => visibleCodes.includes(c.code_text)).map((c) => [c.code_text, c.status, c.duration_days, usesText(c), c.label, c.expires_at, c.used_by_email, c.created_at]);
  if (format === 'csv') return downloadText('toolio-codes.csv', csv([['code', 'status', 'days', 'uses', 'label', 'expires_at', 'used_by', 'created_at'], ...rows]), 'text/csv');
  downloadText('toolio-codes.txt', rows.map((r) => r.join(' | ')).join('\n'));
}

function showUserDetails(id) {
  const u = users.find((item) => item.id === id);
  if (!u) return;
  const plan = userPlan(u);
  $('user-modal-body').innerHTML = `
    <div class="detail-title"><p class="section-kicker">User record</p><h2 id="user-modal-title">${esc(u.display_name || u.email || 'User')}</h2><p class="muted">${esc(u.email || '-')}</p></div>
    <div class="detail-grid">
      <div class="detail-item"><span>Plan</span><strong>${esc(plan)} ${expiringSoon(u) ? '· expires soon' : ''}</strong></div>
      <div class="detail-item"><span>Days left</span><strong>${u.days_remaining ?? 0}</strong></div>
      <div class="detail-item"><span>Ends</span><strong>${esc(fmt(u.subscription_ends_at))}</strong></div>
      <div class="detail-item"><span>Device</span><strong>${esc(u.device_name || '-')}</strong></div>
      <div class="detail-item"><span>Device access</span><strong><span class="pill ${u.device_blocked ? 'bad' : 'good'}">${u.device_blocked ? 'Blocked' : 'Allowed'}</span></strong></div>
      <div class="detail-item"><span>Device ID</span><code title="${esc(u.device_id || '-')}">${esc(u.device_id || '-')}</code></div>
      ${u.device_blocked ? `<div class="detail-item"><span>Device ban</span><strong>${esc(u.device_ban_reason_code || 'security')} · ${esc(u.device_ban_expires_at ? `until ${fmt(u.device_ban_expires_at)}` : 'permanent')}</strong><span class="cell-meta">${esc(u.device_ban_note || 'No admin note')}</span></div>` : ''}
      <div class="detail-item"><span>Transfers</span><strong>${u.transfer_count || 0}/${u.transfer_limit || 3}</strong></div>
      <div class="detail-item"><span>Activity</span><strong>${u.online_now ? 'Online now' : `Last seen ${esc(fmt(u.presence_last_seen_at || u.device_last_seen_at || u.last_login_at))}`}</strong></div>
      <div class="detail-item"><span>App version</span><strong>${esc(u.app_version || '-')}</strong></div>
      <div class="detail-item"><span>Last login</span><strong>${esc(fmt(u.last_login_at))}</strong></div>
      <div class="detail-item"><span>Joined</span><strong>${esc(fmt(u.created_at))}</strong></div>
      <div class="detail-item"><span>User ID</span><code title="${esc(u.id)}">${esc(u.id)}</code></div>
    </div>
    <section class="detail-section"><div class="detail-section-head"><h3>Codes &amp; grants</h3><span class="pill">${(u.redeemed_codes?.length || 0) + (u.admin_grants?.length || 0)} records</span></div>${renderUserCodes(u.redeemed_codes, u.admin_grants)}</section>
    <section class="detail-section"><div class="detail-section-head"><div><h3>Tool access</h3><p class="muted">Per-user exceptions. Maintenance still takes priority.</p></div></div><div id="user-tool-access" class="user-tool-access"><p class="muted">Loading tool access...</p></div></section>
    <div class="user-detail-actions">
      <button class="btn ghost" data-copy-user-id="${esc(u.id)}">Copy ID</button>
      <button class="btn ghost" data-copy-user-email="${esc(u.email || '')}">Copy Email</button>
      <button class="btn ghost" data-grant-user="${esc(u.id)}">Grant Days</button>
      <button class="btn ghost" data-adjust-user="${esc(u.id)}">Adjust Days</button>
      <button class="btn ghost" data-transfer-user="${esc(u.id)}">Device Transfer</button>
      ${u.device_id ? `<button class="btn ${u.device_blocked ? 'primary' : 'danger'}" data-toggle-device="${esc(u.device_id)}" data-device-blocked="${u.device_blocked ? '1' : '0'}">${u.device_blocked ? 'Unblock Device' : 'Block Device'}</button>` : ''}
    </div>`;
  $('user-modal').classList.remove('hidden');
  $('btn-close-user-modal').focus();
  loadUserToolOverrides(u.id);
}

async function disableCode(id) {
  if (!id || !confirm('Disable this unused code?')) return;
  await rpc('disable_recharge_code', { p_code_id: id, p_reason: 'Disabled by admin' });
  toast('Code disabled');
  await Promise.all([loadCodes(), loadLogs(), loadStats()]);
}

async function loadLogs() {
  const data = await rpc('get_admin_events', { p_limit: 100, p_offset: 0 });
  $('logs-body').innerHTML = (data.events || []).map((event) => `
    <tr>
      <td><span class="pill">${esc(event.event_type)}</span><br><span class="muted">${esc(event.admin_email || '-')}</span></td>
      <td>${esc(event.target_email || event.target_user_id || '-')}</td>
      <td><code>${esc(JSON.stringify(event.metadata || {}))}</code></td>
      <td>${esc(fmt(event.created_at))}</td>
    </tr>
  `).join('');
}

async function searchFullCode() {
  const value = $('code-search').value.trim();
  const local = codes.find((item) => item.code_text && item.code_text.toLowerCase() === value.toLowerCase());
  const looksLikeCode = /^[A-Z0-9-]{3,}$/i.test(value) && (value.includes('-') || local);
  if (!looksLikeCode) {
    $('code-search-result').classList.add('hidden');
    renderCodes();
    return;
  }

  const c = local || (await rpc('find_admin_code', { p_code: value })).code;
  $('code-search-result').classList.remove('hidden');
  $('code-search-result').innerHTML = `
    <strong>Code found:</strong>
    <span class="pill ${c.status === 'used' ? 'good' : c.status === 'disabled' ? 'bad' : 'warn'}">${esc(c.status)}</span>
    <div class="muted">Label: ${esc(c.label || '-')} · Days: ${esc(c.duration_days)} · Uses: ${esc(usesText(c))} · Expires: ${esc(fmt(c.expires_at))} · First used by: ${esc(c.used_by_email || '-')}</div>
  `;
}

async function login() {
  const currentUrl = window.location.href.split('#')[0].split('?')[0];
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: currentUrl,
      queryParams: { prompt: 'select_account' },
    },
  });
}

// Check for login errors in URL hash
if (window.location.hash.includes('error=')) {
  const params = new URLSearchParams(window.location.hash.substring(1));
  setTimeout(() => toast('Login error: ' + (params.get('error_description') || params.get('error'))), 1000);
}

async function generateCodes() {
  const customCode = $('code-custom').value.trim();
  const expiresAt = expiresAfterDays($('code-valid-days').value);
  const maxUses = $('code-max-uses').value.trim() ? Number($('code-max-uses').value) : null;
  const data = customCode
    ? await rpc('create_custom_recharge_code', {
      p_code: customCode,
      p_duration_days: Number($('code-days').value || 30),
      p_label: $('code-label').value || null,
      p_expires_at: expiresAt,
      p_max_redemptions: maxUses,
    })
    : await rpc('generate_recharge_codes', {
      p_count: Number($('code-count').value || 1),
      p_duration_days: Number($('code-days').value || 30),
      p_label: $('code-label').value || null,
      p_expires_at: expiresAt,
    });
  $('generated-codes').value = customCode ? data.code : (data.codes || []).join('\n');
  codeFilter = 'all';
  $('code-search').value = '';
  $('code-search-result').classList.add('hidden');
  toast(customCode ? 'Custom code created' : `Generated ${data.count} code(s)`);
  await Promise.all([loadStats(), loadCodes()]);
}

async function adjustUserDays(userId = $('adjust-user-id').value.trim()) {
  if (!userId) return toast('User ID is required');
  const days = Number($('adjust-days').value || 0);
  if (!days) return toast('Days must not be zero');
  if (days < 0 && !confirm(`Remove ${Math.abs(days)} day(s) from this user?`)) return;
  await rpc('adjust_user_days', {
    p_user_id: userId,
    p_delta_days: days,
    p_reason: $('adjust-reason').value || null,
  });
  toast('User days adjusted');
  await Promise.all([loadStats(), loadUsers(), loadLogs()]);
}

async function grantUser(userId = $('grant-user-id').value.trim()) {
  const email = $('grant-email').value.trim();
  if (email) await rpc('grant_days_to_email', {
    p_email: email,
    p_duration_days: Number($('grant-days').value || 30),
    p_reason: $('grant-reason').value || null,
  });
  else {
    if (!userId) return toast('User ID or email is required');
    await rpc('grant_days_to_user', {
      p_user_id: userId,
      p_duration_days: Number($('grant-days').value || 30),
      p_reason: $('grant-reason').value || null,
    });
  }
  toast('Days granted');
  await Promise.all([loadStats(), loadUsers(), loadLogs()]);
}

async function grantAll() {
  if (!confirm('Grant days to all users?')) return;
  const data = await rpc('grant_days_to_all', {
    p_duration_days: Number($('grant-days').value || 30),
    p_reason: $('grant-reason').value || null,
  });
  toast(`Granted ${data.applied_count} users`);
  await Promise.all([loadStats(), loadUsers(), loadLogs()]);
}

async function toggleUser(id, disabled) {
  if (disabled) await rpc('enable_user', { p_user_id: id });
  else await rpc('disable_user', { p_user_id: id, p_reason: $('block-message').value || 'This account has been suspended due to a violation of our Terms of Service and Fair Use policies.' });
  toast(disabled ? 'User unblocked' : 'User blocked');
  await Promise.all([loadUsers(), loadLogs()]);
}

async function toggleDeviceBan(deviceId, blocked) {
  if (!deviceId) return toast('No device is registered for this user');
  if (blocked) {
    if (!confirm('Unblock this device? The user must sign in again before it becomes active.')) return;
    const note = prompt('Optional admin note for unblocking:', '') ?? '';
    await rpc('admin_unban_device', { p_device_id: deviceId, p_admin_note: note || null });
    toast('Device unblocked');
  } else {
    if (!confirm('Block this device across every Toolio account and end its active sessions?')) return;
    const note = prompt('Reason or internal note:', 'Security violation');
    if (note === null) return;
    const daysText = prompt('Optional duration in days. Leave empty for a permanent block:', '');
    if (daysText === null) return;
    const days = daysText.trim() ? Number(daysText) : 0;
    if (!Number.isFinite(days) || days < 0) return toast('Duration must be a positive number of days');
    await rpc('admin_ban_device', {
      p_device_id: deviceId,
      p_reason_code: 'security',
      p_admin_note: note.trim() || null,
      p_expires_at: days ? new Date(Date.now() + days * 86400000).toISOString() : null,
    });
    toast('Device blocked across all accounts');
  }
  $('user-modal').classList.add('hidden');
  await Promise.all([loadUsers(), loadLogs()]);
}

async function grantTransfers(userId = $('transfer-user-id').value.trim()) {
  if (!userId) return toast('User ID is required');
  await rpc('grant_device_transfers', {
    p_user_id: userId,
    p_extra_transfers: Number($('transfer-extra').value || 1),
    p_reason: $('transfer-reason').value || null,
  });
  toast('Transfer allowance granted');
  await Promise.all([loadUsers(), loadLogs()]);
}

async function setAppEnabled(enabled) {
  try {
      // Pass p_message exactly as is (even if empty string). This avoids null coalesce ignoring it.
      const { error: rpcError } = await supabase.rpc('set_app_enabled', { 
          p_enabled: enabled, 
          p_message: $('guard-message').value 
      });
      if (rpcError) throw rpcError;
      
      if ($('block-message')) {
          const { error: blockError } = await supabase.from('app_guard_config').update({ value: $('block-message').value }).eq('key', 'block_message');
          if (blockError) console.error('Block message update error:', blockError);
      }
      toast(enabled === currentAppEnabled ? 'Messages saved' : enabled ? 'App enabled & messages saved' : 'App disabled & messages saved');
      await loadAppStatus();
  } catch (err) {
      toast(err.message);
  }
}

async function saveVersion() {
  const downloadUrl = $('version-url').value.trim();
  const sha256 = $('version-sha256')?.value.trim() || '';
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/(?:download\/[^/]+|latest\/download)\/[^?#]+$/.test(downloadUrl)) {
    throw new Error('Use a direct HTTPS GitHub release asset URL');
  }
  if (!/^[0-9a-f]{64}$/i.test(sha256)) throw new Error('A 64-character SHA-256 hash is required');
  await rpc('set_app_version', {
    p_platform: 'windows',
    p_latest_version: $('version-latest').value,
    p_minimum_version: $('version-minimum').value,
    p_download_url: downloadUrl,
    p_download_sha256: sha256,
    p_release_notes: null,
    p_force_message: $('version-message').value || null,
  });
  toast('Version saved');
}

async function loadCommerce() {
  const data = await rpc('get_admin_commerce');
  $('commerce-offer-name').value = data.offer?.draft_name || data.offer?.name || 'Toolio Premium';
  $('commerce-price-usd').value = data.offer ? (Number(data.offer.draft_price_usd_cents ?? data.offer.price_usd_cents) / 100).toFixed(2) : '2.50';
  $('commerce-duration-days').value = data.offer?.draft_duration_days || data.offer?.duration_days || 30;
  $('commerce-rates').innerHTML = data.rates.map((rate) => `<div class="commerce-row" data-rate="${esc(rate.currency_code)}"><label>Currency<input data-field="code" value="${esc(rate.currency_code)}" maxlength="3" readonly></label><label>Symbol<input data-field="symbol" value="${esc(rate.symbol)}" maxlength="12"></label><label>Units / USD<input data-field="units" type="number" min="0.000001" step="0.000001" value="${esc(rate.units_per_usd)}"></label><label><input data-field="enabled" type="checkbox"${rate.enabled ? ' checked' : ''}> Enabled</label><button class="btn secondary" data-save-rate="${esc(rate.currency_code)}">Save</button></div>`).join('');
  $('commerce-methods').innerHTML = data.payment_methods.map((method) => `<div class="commerce-row commerce-method-row" data-method="${esc(method.id)}" data-display-name="${esc(method.display_name)}" data-settlement-currency="${esc(method.settlement_currency)}" data-sort-order="${Number(method.sort_order) || 0}"><label>${esc(method.display_name)}<small class="muted">${esc(method.settlement_currency)} · manual review</small></label><label>Destination<input data-field="destination" value="${esc(method.public_destination)}" maxlength="300"></label><label>Customer instructions<textarea data-field="instructions" maxlength="1200">${esc(method.public_instructions)}</textarea></label><label><input data-field="enabled" type="checkbox"${method.enabled ? ' checked' : ''}> Enabled</label><button class="btn secondary" data-save-method="${esc(method.id)}">Save</button></div>`).join('');
  $('commerce-pending').innerHTML = data.pending.length ? data.pending.map((item) => `<article class="commerce-review" data-order="${esc(item.order_id)}"><dl><dt>Order</dt><dd>${esc(item.order_id)}</dd><dt>User</dt><dd>${esc(item.user_id)}</dd><dt>Method</dt><dd>${esc(item.payment_method_id)}</dd><dt>Amount</dt><dd>$${(Number(item.price_usd_cents) / 100).toFixed(2)}</dd><dt>Sender</dt><dd>${esc(item.sender_name)} · ${esc(item.sender_account)}</dd><dt>Reference</dt><dd>${esc(item.transaction_reference)}</dd><dt>Note</dt><dd>${esc(item.customer_note || '-')}</dd></dl><div class="commerce-review-actions"><button class="btn primary" data-review="approve">Approve &amp; issue code</button><button class="btn danger" data-review="reject">Reject</button></div></article>`).join('') : '<p class="muted">No pending payments.</p>';
}

async function saveCommerceOffer() {
  const usd = Number($('commerce-price-usd').value);
  const days = Number($('commerce-duration-days').value);
  if (!Number.isFinite(usd) || !Number.isInteger(days)) throw new Error('Enter a valid USD price and whole number of days');
  await rpc('set_admin_commerce_offer', { p_price_usd_cents:Math.round(usd * 100), p_duration_days:days, p_name:$('commerce-offer-name').value.trim() });
  toast('Offer draft saved; customers still see the published offer');
  await loadCommerce();
}

async function publishCommerceOffer() {
  if (!confirm('Publish this draft to the website, store, and desktop app? Existing orders keep their original terms.')) return;
  await rpc('publish_admin_commerce_offer');
  toast('Offer published to the store and app');
  await loadCommerce();
}

async function handleCommerceClick(event) {
  const rateButton = event.target.closest('[data-save-rate]');
  const methodButton = event.target.closest('[data-save-method]');
  const reviewButton = event.target.closest('[data-review]');
  if (rateButton) {
    const row = rateButton.closest('[data-rate]');
    await rpc('set_admin_currency_rate', { p_currency_code:row.dataset.rate, p_symbol:row.querySelector('[data-field="symbol"]').value, p_units_per_usd:Number(row.querySelector('[data-field="units"]').value), p_enabled:row.querySelector('[data-field="enabled"]').checked });
    toast(`${row.dataset.rate} rate saved`); await loadCommerce();
  }
  if (methodButton) {
    const row = methodButton.closest('[data-method]');
    const method = row.dataset.method;
    await rpc('set_admin_payment_method', { p_id:method, p_display_name:row.dataset.displayName, p_settlement_currency:row.dataset.settlementCurrency, p_enabled:row.querySelector('[data-field="enabled"]').checked, p_public_destination:row.querySelector('[data-field="destination"]').value, p_public_instructions:row.querySelector('[data-field="instructions"]').value, p_sort_order:Number(row.dataset.sortOrder) || 0 });
    toast('Payment method saved'); await loadCommerce();
  }
  if (reviewButton) {
    const orderId = reviewButton.closest('[data-order]').dataset.order;
    const approve = reviewButton.dataset.review === 'approve';
    if (!confirm(approve ? 'Confirm that this payment is genuine and issue one activation code?' : 'Reject this payment without issuing a code?')) return;
    const reason = approve ? null : prompt('Rejection reason:', 'Payment could not be verified');
    if (!approve && reason === null) return;
    const result = await rpc('review_commerce_payment', { p_order_id:orderId, p_approve:approve, p_reason:reason });
    toast(approve ? `Code issued: ${result.activation_code}` : 'Payment rejected'); await Promise.all([loadCommerce(), loadCodes(), loadStats()]);
  }
}

async function loadAdminSuggestions() {
  const filter = $('admin-suggestions-filter').value;
  $('admin-suggestions-status').textContent = 'Loading suggestions…';
  const data = await rpc('get_admin_website_suggestions', { p_status:filter });
  adminSuggestions = data.suggestions || [];
  $('admin-suggestions-status').textContent = `${adminSuggestions.length} suggestion${adminSuggestions.length === 1 ? '' : 's'}`;
  $('admin-suggestions-list').innerHTML = adminSuggestions.length ? adminSuggestions.map((item) => `
    <article class="suggestions-admin-card" data-admin-suggestion="${esc(item.id)}">
      <div class="suggestions-admin-copy">
        <div class="suggestions-admin-meta"><span class="pill ${item.moderation_status === 'approved' ? 'good' : item.moderation_status === 'pending' ? 'warn' : 'bad'}">${esc(item.moderation_status)}</span><span>${esc(item.category.replaceAll('_', ' '))}</span><span>${Number(item.vote_count) || 0} votes</span><span>${esc(fmt(item.created_at))}</span></div>
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.description)}</p>
        <small class="muted">${esc(item.author_email || 'Deleted user')}</small>
      </div>
      <div class="suggestions-admin-controls">
        <label>Roadmap status<select data-suggestion-roadmap>
          ${option('under_review', item.roadmap_status, 'Under Review')}
          ${option('planned', item.roadmap_status, 'Planned')}
          ${option('in_progress', item.roadmap_status, 'In Progress')}
          ${option('completed', item.roadmap_status, 'Completed')}
          ${option('declined', item.roadmap_status, 'Declined')}
        </select></label>
        <div class="suggestions-admin-actions">
          <button class="btn primary" type="button" data-suggestion-review="approved">${item.moderation_status === 'approved' ? 'Update public status' : 'Approve & publish'}</button>
          <button class="btn danger" type="button" data-suggestion-review="rejected">Reject</button>
          <button class="btn ghost" type="button" data-suggestion-review="hidden">Hide</button>
        </div>
      </div>
    </article>`).join('') : '<p class="muted">No suggestions in this queue.</p>';
}

async function handleSuggestionReview(event) {
  const button = event.target.closest('[data-suggestion-review]');
  if (!button) return;
  const card = button.closest('[data-admin-suggestion]');
  const moderationStatus = button.dataset.suggestionReview;
  const action = moderationStatus === 'approved' ? 'publish this suggestion' : `${moderationStatus} this suggestion`;
  if (!confirm(`Confirm that you want to ${action}?`)) return;
  button.disabled = true;
  try {
    await rpc('review_website_suggestion', {
      p_suggestion_id:card.dataset.adminSuggestion,
      p_moderation_status:moderationStatus,
      p_roadmap_status:card.querySelector('[data-suggestion-roadmap]').value,
    });
    toast('Suggestion review saved');
    await Promise.all([loadAdminSuggestions(), loadLogs()]);
  } finally {
    button.disabled = false;
  }
}

function setAdminTab(name) {
  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    const active = button.dataset.adminTab === name;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-admin-panel]').forEach((panel) => panel.classList.toggle('hidden', panel.dataset.adminPanel !== name));
}

function handleUserAction(event) {
  const target = event.target;
  const grantBtn = target.closest('[data-grant-user]');
  const toggleBtn = target.closest('[data-toggle-user]');
  const adjustBtn = target.closest('[data-adjust-user]');
  const transferBtn = target.closest('[data-transfer-user]');
  const deviceBtn = target.closest('[data-toggle-device]');
  const viewBtn = target.closest('[data-view-user]');
  const copyIdBtn = target.closest('[data-copy-user-id]');
  const copyEmailBtn = target.closest('[data-copy-user-email]');

  if (viewBtn) showUserDetails(viewBtn.dataset.viewUser);
  if (toggleBtn) toggleUser(toggleBtn.dataset.toggleUser, toggleBtn.dataset.disabled === '1').catch((err) => toast(err.message));
  if (deviceBtn) toggleDeviceBan(deviceBtn.dataset.toggleDevice, deviceBtn.dataset.deviceBlocked === '1').catch((err) => toast(err.message));
  if (copyIdBtn) copyText(copyIdBtn.dataset.copyUserId, 'User ID copied').catch((err) => toast(err.message));
  if (copyEmailBtn) copyText(copyEmailBtn.dataset.copyUserEmail, 'Email copied').catch((err) => toast(err.message));

  if (grantBtn) {
    $('grant-user-id').value = grantBtn.dataset.grantUser;
    $('grant-email').value = '';
    $('user-modal').classList.add('hidden');
    setAdminTab('access');
    $('grant-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('grant-days').focus();
    toast('User selected. Review the days, then click Grant User.');
  }
  if (adjustBtn) {
    $('adjust-user-id').value = adjustBtn.dataset.adjustUser;
    $('user-modal').classList.add('hidden');
    setAdminTab('access');
    $('grant-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('adjust-days').focus();
    toast('User selected. Enter positive or negative days.');
  }
  if (transferBtn) {
    $('transfer-user-id').value = transferBtn.dataset.transferUser;
    $('user-modal').classList.add('hidden');
    setAdminTab('access');
    $('transfer-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('transfer-extra').focus();
    toast('User selected. Review the transfer allowance.');
  }
}

$('btn-login').addEventListener('click', login);
$('btn-logout').addEventListener('click', async () => { await supabase.auth.signOut(); await refresh(); });
$('btn-refresh').addEventListener('click', refresh);
$('btn-generate').addEventListener('click', () => generateCodes().catch((err) => toast(err.message)));
$('btn-copy-generated').addEventListener('click', () => copyText($('generated-codes').value.trim(), 'Generated codes copied').catch((err) => toast(err.message)));
$('btn-copy-visible-codes').addEventListener('click', () => copyText(visibleCodes.join('\n'), `${visibleCodes.length} visible code(s) copied`).catch((err) => toast(err.message)));
$('btn-export-users-csv').addEventListener('click', () => exportUsers('csv'));
$('btn-export-users-txt').addEventListener('click', () => exportUsers('txt'));
$('btn-export-codes-csv').addEventListener('click', () => exportCodes('csv'));
$('btn-export-codes-txt').addEventListener('click', () => exportCodes('txt'));
$('btn-grant-user').addEventListener('click', () => grantUser().catch((err) => toast(err.message)));
$('btn-grant-all').addEventListener('click', () => grantAll().catch((err) => toast(err.message)));
$('btn-adjust-user').addEventListener('click', () => adjustUserDays().catch((err) => toast(err.message)));
$('btn-app-on').addEventListener('click', () => setAppEnabled(true).catch((err) => toast(err.message)));
$('btn-app-off').addEventListener('click', () => setAppEnabled(false).catch((err) => toast(err.message)));
$('btn-app-save').addEventListener('click', () => setAppEnabled(currentAppEnabled).catch((err) => toast(err.message)));
$('btn-version-save').addEventListener('click', () => saveVersion().catch((err) => toast(err.message)));
$('btn-commerce-save-offer').addEventListener('click', () => saveCommerceOffer().catch((err) => toast(err.message)));
$('btn-commerce-publish-offer').addEventListener('click', () => publishCommerceOffer().catch((err) => toast(err.message)));
$('btn-commerce-refresh').addEventListener('click', () => loadCommerce().catch((err) => toast(err.message)));
$('commerce-rates').addEventListener('click', (event) => handleCommerceClick(event).catch((err) => toast(err.message)));
$('commerce-methods').addEventListener('click', (event) => handleCommerceClick(event).catch((err) => toast(err.message)));
$('commerce-pending').addEventListener('click', (event) => handleCommerceClick(event).catch((err) => toast(err.message)));
$('btn-refresh-suggestions').addEventListener('click', () => loadAdminSuggestions().catch((err) => toast(err.message)));
$('admin-suggestions-filter').addEventListener('change', () => loadAdminSuggestions().catch((err) => toast(err.message)));
$('admin-suggestions-list').addEventListener('click', (event) => handleSuggestionReview(event).catch((err) => toast(err.message)));
$('btn-refresh-tools').addEventListener('click', () => loadToolAvailability().catch((err) => toast(err.message)));
$('tool-controls').addEventListener('click', (event) => {
  const button = event.target.closest('[data-save-tool]');
  if (button) saveToolAvailability(button.dataset.saveTool, button).catch((err) => toast(err.message));
});
$('btn-transfer-grant').addEventListener('click', () => grantTransfers().catch((err) => toast(err.message)));
$('user-search').addEventListener('input', () => { userPage = 1; renderUsers(); });
$('btn-close-user-modal').addEventListener('click', () => $('user-modal').classList.add('hidden'));
$('user-modal').addEventListener('click', (event) => {
  if (event.target === $('user-modal')) $('user-modal').classList.add('hidden');
  else handleUserAction(event);
});
$('user-modal').addEventListener('change', (event) => {
  const select = event.target.closest('[data-user-tool-override]');
  if (select) saveUserToolOverride(select).catch((err) => toast(err.message));
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') $('user-modal').classList.add('hidden');
});
document.querySelectorAll('[data-admin-tab]').forEach((button) => button.addEventListener('click', () => setAdminTab(button.dataset.adminTab)));
document.querySelectorAll('.user-filter').forEach((button) => button.addEventListener('click', () => {
  userFilter = button.dataset.userFilter;
  userPage = 1;
  document.querySelectorAll('.user-filter').forEach((item) => item.classList.toggle('active', item === button));
  renderUsers();
}));
document.querySelectorAll('.user-audience').forEach((button) => button.addEventListener('click', () => {
  userAudience = button.dataset.userAudience;
  userPage = 1;
  document.querySelectorAll('.user-audience').forEach((item) => item.classList.toggle('active', item === button));
  renderUsers();
}));
$('btn-users-prev').addEventListener('click', () => { userPage = Math.max(1, userPage - 1); renderUsers(); document.querySelector('.users-table-wrap').scrollTop = 0; });
$('btn-users-next').addEventListener('click', () => { userPage += 1; renderUsers(); document.querySelector('.users-table-wrap').scrollTop = 0; });
$('code-search').addEventListener('input', () => {
  codePage = 1;
  searchFullCode().catch((err) => {
    $('code-search-result').classList.add('hidden');
    renderCodes();
    if ($('code-search').value.trim().startsWith('TOOLIO-')) toast(err.message);
  });
});
$('users-body').addEventListener('click', handleUserAction);

$('codes-body').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-copy-code]');
  if (btn) copyText(btn.dataset.copyCode, 'Code copied').catch((err) => toast(err.message));
  const disableBtn = event.target.closest('[data-disable-code]');
  if (disableBtn) disableCode(disableBtn.dataset.disableCode).catch((err) => toast(err.message));
});

document.querySelectorAll('.code-filter').forEach((button) => {
  button.addEventListener('click', () => {
    codeFilter = button.dataset.codeFilter;
    codePage = 1;
    document.querySelectorAll('.code-filter').forEach((item) => item.classList.toggle('active', item === button));
    renderCodes();
  });
});
$('btn-codes-prev').addEventListener('click', () => { codePage = Math.max(1, codePage - 1); renderCodes(); });
$('btn-codes-next').addEventListener('click', () => { codePage += 1; renderCodes(); });

$('block-message').value = localStorage.getItem('toolio_admin_block_msg') || '';
$('block-message').addEventListener('input', (e) => localStorage.setItem('toolio_admin_block_msg', e.target.value));

supabase.auth.onAuthStateChange(() => refresh());
refresh();
setInterval(() => refreshLiveData().catch((err) => console.error('Live dashboard refresh failed:', err)), LIVE_REFRESH_MS);
