const DEFAULT_DATA = {
  websites: [],
  activeWebsiteId: null,
  editingWebsiteId: null,
  settings: {
    autoFillOnLoad: true,
    preferSidePanel: true,
    language: 'auto',
    theme: 'auto',
  },
  matchingStrategies: [],
};

const STRATEGY_FIELDS = ['name', 'category', 'url', 'email', 'shortDesc', 'longDesc', 'tags'];
const BUILTIN_MATCHING_STRATEGIES = [
  { key: 'name', label: '网站名称', aliases: ['网站名称', 'name', 'title', '站点名称', '网站名'] },
  { key: 'category', label: '分类', aliases: ['分类', 'category', 'type'] },
  { key: 'url', label: '网站地址', aliases: ['网址', 'url', 'link', 'site', 'homepage', 'domain', '网站地址'] },
  { key: 'email', label: '联系邮箱', aliases: ['邮箱', 'email', 'mail', '联系'] },
  { key: 'shortDesc', label: '简短描述', aliases: ['简短描述', 'short', 'slogan', 'summary', '一句话'] },
  { key: 'longDesc', label: '详细描述', aliases: ['详细描述', 'long', 'detail', 'description', '内容介绍', '简介', '描述'] },
  { key: 'tags', label: '关键词标签', aliases: ['关键词', 'tags', 'keyword'] },
];

const I18N = {
  'zh-CN': {
    subtitle: 'SEO / GEO 自动化助手',
    tabSites: '网站管理',
    tabSmart: '智能填充',
    tabManual: '手动填充',
    tabSettings: '设置',
    addSiteSection: '添加 / 更新网站信息',
    nameLabel: '网站名称 *',
    categoryLabel: '分类',
    urlLabel: '网站地址 *',
    emailLabel: '联系邮箱',
    shortDescLabel: '简短描述',
    longDescLabel: '详细描述',
    tagsLabel: '关键词标签',
    namePlaceholder: '输入网站名称',
    categoryPlaceholder: '如：技术博客、新闻网站等',
    urlPlaceholder: 'https://example.com',
    emailPlaceholder: 'contact@example.com (可选)',
    shortDescPlaceholder: '一句话描述网站特色 (可选)',
    longDescPlaceholder: '详细描述网站内容、特色、服务等 (可选)',
    tagPlaceholder: '输入关键词后按回车添加',
    saveSite: '保存网站',
    updateSite: '更新网站',
    cancelEdit: '取消编辑',
    noSites: '暂无网站配置，请先添加。',
    defaultTag: '默认',
    notDefaultTag: '未默认',
    matchChecking: '正在检测当前网页匹配状态...',
    noSiteForMatch: '暂无网站配置，请先在网站管理中添加。',
    matched: site => `已匹配站点：${site}，可执行智能填充。`,
    notMatched: url => `未匹配站点规则（当前：${url || '未知页面'}），仍可手动填充。`,
    smartFillBtn: '智能匹配并填充当前网页',
    fieldSelectLabel: '选择网页字段',
    valueSelectLabel: '选择填充值',
    manualFillBtn: '填充选中字段',
    refreshFieldsBtn: '刷新字段列表',
    autoFillSetting: '打开网页时自动匹配并填充（仅匹配成功时）',
    sidePanelSetting: '启用侧边栏模式（右侧 Tab）',
    languageLabel: '界面语言',
    themeLabel: '主题外观',
    themeAuto: '跟随系统',
    themeLight: '浅色',
    themeDark: '深色',
    languageAuto: '跟随浏览器',
    languageZh: '中文',
    languageEn: 'English',
    sidePanelHint: '已支持通过浏览器右侧侧边栏使用插件。',
    fillRequired: '请填写必填项：网站名称、网站地址',
    siteSaved: '网站信息已保存',
    siteUpdated: '网站信息已更新',
    siteDeleted: '网站已删除',
    defaultUpdated: '默认网站已更新',
    settingsSaved: '设置已保存',
    chooseFieldValue: '请选择字段和可用填充值',
    manualFillSuccess: '手动填充成功',
    manualFillFail: '手动填充失败',
    addSiteFirst: '请先添加网站配置',
    smartFillDone: n => `已自动填充 ${n} 个字段`,
    smartFillNoMatch: '没有匹配到可填充字段',
    noAvailableField: '未发现可填充字段',
    addSiteFirstOption: '请先添加网站',
    fieldReadFail: m => `字段读取失败：${m}`,
    matchFail: m => `匹配失败：${m}`,
    smartFillFail: m => `智能填充失败：${m}`,
    manualFillError: m => `手动填充失败：${m}`,
    noActiveTab: '未找到活动标签页',
    noInjected: '当前页面未注入内容脚本（常见于 chrome:// 页面、扩展页，或页面刚加载）。请切换到普通网页后重试。',
    valueLabels: {
      name: '网站名称', category: '分类', url: '网站地址', email: '联系邮箱', shortDesc: '简短描述', longDesc: '详细描述', tags: '关键词标签（逗号拼接）',
    },
    menuSetDefault: '设为默认',
    menuEdit: '编辑',
    menuDelete: '删除',
    strategyTitle: '智能匹配策略（可维护）',
    addStrategyBtn: '新增策略',
    saveStrategiesBtn: '保存策略',
    strategyField: '字段',
    strategyAlias: '匹配关键词（逗号分隔）',
    strategyDelete: '删除',
    strategiesSaved: '匹配策略已保存',
    quickExportTip: '导出配置',
    quickImportTip: '导入配置',
    quickExportLabel: '导出',
    quickImportLabel: '导入',
    configExported: '配置与策略已导出',
    configImported: '配置与策略已导入',
    configImportFail: m => `配置导入失败：${m}`,
  },
  en: {
    subtitle: 'SEO / GEO Automation Assistant',
    tabSites: 'Sites', tabSmart: 'Smart Fill', tabManual: 'Manual Fill', tabSettings: 'Settings',
    addSiteSection: 'Add / Update Site', nameLabel: 'Site Name *', categoryLabel: 'Category', urlLabel: 'Site URL *', emailLabel: 'Contact Email', shortDescLabel: 'Short Description', longDescLabel: 'Long Description', tagsLabel: 'Keyword Tags',
    namePlaceholder: 'Enter site name', categoryPlaceholder: 'e.g. tech blog, news portal', urlPlaceholder: 'https://example.com', emailPlaceholder: 'contact@example.com (optional)', shortDescPlaceholder: 'One-line site summary (optional)', longDescPlaceholder: 'Detailed site description (optional)', tagPlaceholder: 'Press Enter after each keyword',
    saveSite: 'Save Site', updateSite: 'Update Site', cancelEdit: 'Cancel Edit', noSites: 'No site saved yet. Please add one.',
    defaultTag: 'Default', notDefaultTag: 'Not Default', matchChecking: 'Checking page match status...', noSiteForMatch: 'No site config yet. Please add one in Site Management.',
    matched: site => `Matched site: ${site}. Smart fill is ready.`, notMatched: url => `No matching rule for current page (${url || 'unknown page'}). You can still use manual fill.`,
    smartFillBtn: 'Smart match and fill current page', fieldSelectLabel: 'Select page field', valueSelectLabel: 'Select value', manualFillBtn: 'Fill selected field', refreshFieldsBtn: 'Refresh field list',
    autoFillSetting: 'Auto match and fill on page load (only when matched)', sidePanelSetting: 'Enable side panel mode (right-side tab)', languageLabel: 'Language', themeLabel: 'Theme', themeAuto: 'Follow system', themeLight: 'Light', themeDark: 'Dark', languageAuto: 'Follow browser', languageZh: 'Chinese', languageEn: 'English', sidePanelHint: 'Side panel mode is supported from the browser right panel.',
    fillRequired: 'Required: Site Name and Site URL', siteSaved: 'Site saved', siteUpdated: 'Site updated', siteDeleted: 'Site deleted', defaultUpdated: 'Default site updated', settingsSaved: 'Settings saved',
    chooseFieldValue: 'Please choose a field and a value', manualFillSuccess: 'Manual fill succeeded', manualFillFail: 'Manual fill failed', addSiteFirst: 'Please add a site config first',
    smartFillDone: n => `Auto-filled ${n} field(s)`, smartFillNoMatch: 'No fillable field matched', noAvailableField: 'No fillable field found', addSiteFirstOption: 'Add a site first',
    fieldReadFail: m => `Failed to read fields: ${m}`, matchFail: m => `Match failed: ${m}`, smartFillFail: m => `Smart fill failed: ${m}`, manualFillError: m => `Manual fill failed: ${m}`,
    noActiveTab: 'No active tab found', noInjected: 'Content script not injected on this page (common on chrome:// pages or extension pages). Switch to a normal web page and retry.',
    valueLabels: {
      name: 'Site Name', category: 'Category', url: 'Site URL', email: 'Contact Email', shortDesc: 'Short Description', longDesc: 'Long Description', tags: 'Keyword Tags (comma-joined)',
    },
    menuSetDefault: 'Set as default', menuEdit: 'Edit', menuDelete: 'Delete',
    strategyTitle: 'Matching Strategies (Editable)',
    addStrategyBtn: 'Add strategy',
    saveStrategiesBtn: 'Save strategies',
    strategyField: 'Field',
    strategyAlias: 'Keywords (comma-separated)',
    strategyDelete: 'Delete',
    strategiesSaved: 'Matching strategies saved',
    quickExportTip: 'Export config',
    quickImportTip: 'Import config',
    quickExportLabel: 'Export',
    quickImportLabel: 'Import',
    configExported: 'Config and strategies exported',
    configImported: 'Config and strategies imported',
    configImportFail: m => `Config import failed: ${m}`,
  },
};

let state = structuredClone(DEFAULT_DATA);
let pendingTags = [];
let contextMenuEl = null;
let contextTargetId = null;
let lang = 'zh-CN';

const tabs = [...document.querySelectorAll('.tab')];
const panels = [...document.querySelectorAll('.panel')];
const statusEl = document.getElementById('status');

const t = key => I18N[lang][key];
const preferredLang = () => ((navigator.languages?.[0] || navigator.language || '').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en');
function effectiveLang() { return state.settings.language === 'auto' ? preferredLang() : state.settings.language; }

function applyI18n() {
  lang = effectiveLang();
  document.getElementById('subtitle').textContent = t('subtitle');
  document.getElementById('tabSitesBtn').textContent = t('tabSites');
  document.getElementById('tabSmartBtn').textContent = t('tabSmart');
  document.getElementById('tabManualBtn').textContent = t('tabManual');
  document.getElementById('tabSettingsBtn').textContent = t('tabSettings');
  document.getElementById('addSiteToggle').textContent = t('addSiteSection');
  document.getElementById('siteNameLabel').textContent = t('nameLabel');
  document.getElementById('siteCategoryLabel').textContent = t('categoryLabel');
  document.getElementById('siteUrlLabel').textContent = t('urlLabel');
  document.getElementById('siteEmailLabel').textContent = t('emailLabel');
  document.getElementById('siteShortDescLabel').textContent = t('shortDescLabel');
  document.getElementById('siteLongDescLabel').textContent = t('longDescLabel');
  document.getElementById('siteTagsLabel').textContent = t('tagsLabel');
  document.getElementById('fieldSelectLabel').textContent = t('fieldSelectLabel');
  document.getElementById('valueSelectLabel').textContent = t('valueSelectLabel');
  document.getElementById('smartFillBtn').textContent = t('smartFillBtn');
  document.getElementById('strategyTitle').textContent = t('strategyTitle');
  document.getElementById('addStrategyBtn').textContent = t('addStrategyBtn');
  document.getElementById('saveStrategiesBtn').textContent = t('saveStrategiesBtn');
  document.getElementById('quickExportBtn').title = t('quickExportTip');
  document.getElementById('quickExportBtn').setAttribute('aria-label', t('quickExportTip'));
  document.getElementById('quickExportLabel').textContent = t('quickExportLabel');
  document.getElementById('quickImportBtn').title = t('quickImportTip');
  document.getElementById('quickImportBtn').setAttribute('aria-label', t('quickImportTip'));
  document.getElementById('quickImportLabel').textContent = t('quickImportLabel');
  document.getElementById('manualFillBtn').textContent = t('manualFillBtn');
  document.getElementById('refreshFieldsBtn').textContent = t('refreshFieldsBtn');
  document.getElementById('autoFillOnLoadLabel').textContent = t('autoFillSetting');
  document.getElementById('preferSidePanelLabel').textContent = t('sidePanelSetting');
  document.getElementById('languageLabel').textContent = t('languageLabel');
  document.getElementById('themeLabel').textContent = t('themeLabel');
  document.getElementById('sidePanelHint').textContent = t('sidePanelHint');
  document.getElementById('languageSelect').options[0].textContent = t('languageAuto');
  document.getElementById('languageSelect').options[1].textContent = t('languageZh');
  document.getElementById('languageSelect').options[2].textContent = t('languageEn');
  document.getElementById('themeSelect').options[0].textContent = t('themeAuto');
  document.getElementById('themeSelect').options[1].textContent = t('themeLight');
  document.getElementById('themeSelect').options[2].textContent = t('themeDark');

  document.getElementById('siteName').placeholder = t('namePlaceholder');
  document.getElementById('siteCategory').placeholder = t('categoryPlaceholder');
  document.getElementById('siteUrl').placeholder = t('urlPlaceholder');
  document.getElementById('siteEmail').placeholder = t('emailPlaceholder');
  document.getElementById('siteShortDesc').placeholder = t('shortDescPlaceholder');
  document.getElementById('siteLongDesc').placeholder = t('longDescPlaceholder');
  document.getElementById('siteTagInput').placeholder = t('tagPlaceholder');
  document.getElementById('addSiteBtn').textContent = state.editingWebsiteId ? t('updateSite') : t('saveSite');
  document.getElementById('matchStatus').textContent = t('matchChecking');
  renderStrategies();
}

function setStatus(message) { statusEl.textContent = message || ''; }
function normalizeMessageError(error) {
  const message = error?.message || String(error || '');
  if (message.includes('Could not establish connection. Receiving end does not exist.')) return t('noInjected');
  return message;
}
const getStorage = () => chrome.storage.local.get('geoData');
const saveStorage = async () => chrome.storage.local.set({ geoData: state });
const uuid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function normalizeImportedState(input) {
  const payload = input?.geoData || input;
  const websites = Array.isArray(payload?.websites)
    ? payload.websites.map(site => ({
      id: String(site?.id || uuid()),
      name: String(site?.name || '').trim(),
      category: String(site?.category || '').trim(),
      url: String(site?.url || '').trim(),
      email: String(site?.email || '').trim(),
      shortDesc: String(site?.shortDesc || '').trim(),
      longDesc: String(site?.longDesc || '').trim(),
      tags: Array.isArray(site?.tags) ? site.tags.map(tag => String(tag || '').trim()).filter(Boolean) : [],
    })).filter(site => site.name && site.url)
    : [];
  const activeWebsiteId = websites.some(site => site.id === payload?.activeWebsiteId)
    ? payload.activeWebsiteId
    : (websites[0]?.id || null);
  return {
    ...DEFAULT_DATA,
    websites,
    activeWebsiteId,
    editingWebsiteId: null,
    settings: {
      ...DEFAULT_DATA.settings,
      ...(payload?.settings || {}),
    },
    matchingStrategies: normalizeMatchingStrategies(payload?.matchingStrategies),
  };
}

function fullExportPayload() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    geoData: {
      websites: state.websites,
      activeWebsiteId: state.activeWebsiteId,
      settings: state.settings,
      matchingStrategies: normalizeMatchingStrategies(state.matchingStrategies),
    },
  };
}

function normalizeMatchingStrategies(strategies) {
  const input = Array.isArray(strategies) && strategies.length ? strategies : BUILTIN_MATCHING_STRATEGIES;
  const normalized = input
    .map(item => ({
      key: STRATEGY_FIELDS.includes(item?.key) ? item.key : null,
      label: String(item?.label || '').trim() || item?.key || '',
      aliases: Array.isArray(item?.aliases)
        ? item.aliases.map(alias => String(alias || '').trim()).filter(Boolean)
        : String(item?.aliases || '').split(',').map(alias => alias.trim()).filter(Boolean),
    }))
    .filter(item => item.key && item.aliases.length);
  return normalized.length ? normalized : structuredClone(BUILTIN_MATCHING_STRATEGIES);
}

function strategyFieldLabel(key) {
  return t('valueLabels')[key] || key;
}

function effectiveTheme() {
  if (state.settings.theme === 'dark') return 'dark';
  if (state.settings.theme === 'light') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme() {
  document.documentElement.dataset.theme = effectiveTheme();
}

function renderStrategies() {
  const list = document.getElementById('strategyList');
  list.innerHTML = '';
  state.matchingStrategies = normalizeMatchingStrategies(state.matchingStrategies);
  state.matchingStrategies.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'strategy-item';
    row.innerHTML = `
      <select data-role="key" data-index="${idx}">
        ${STRATEGY_FIELDS.map(key => `<option value="${key}" ${item.key === key ? 'selected' : ''}>${strategyFieldLabel(key)}</option>`).join('')}
      </select>
      <input data-role="aliases" data-index="${idx}" placeholder="${t('strategyAlias')}" value="${item.aliases.join(', ')}">
      <button data-role="delete" data-index="${idx}" type="button">${t('strategyDelete')}</button>
    `;
    list.appendChild(row);
  });
}

function renderTags() {
  const wrap = document.getElementById('siteTags');
  wrap.innerHTML = pendingTags.map(tag => `<span class="tag">${tag}</span>`).join('');
}

function clearForm() {
  ['siteName', 'siteCategory', 'siteUrl', 'siteEmail', 'siteShortDesc', 'siteLongDesc', 'siteTagInput'].forEach(id => { document.getElementById(id).value = ''; });
  pendingTags = [];
  state.editingWebsiteId = null;
  renderTags();
  applyI18n();
}

function startEdit(siteId) {
  const site = state.websites.find(item => item.id === siteId);
  if (!site) return;
  state.editingWebsiteId = site.id;
  document.getElementById('siteName').value = site.name || '';
  document.getElementById('siteCategory').value = site.category || '';
  document.getElementById('siteUrl').value = site.url || '';
  document.getElementById('siteEmail').value = site.email || '';
  document.getElementById('siteShortDesc').value = site.shortDesc || '';
  document.getElementById('siteLongDesc').value = site.longDesc || '';
  pendingTags = [...(site.tags || [])];
  document.getElementById('addSiteSection').classList.add('open');
  renderTags();
  applyI18n();
}

function activeSite() { return state.websites.find(w => w.id === state.activeWebsiteId) || state.websites[0] || null; }
function hideContextMenu() { if (!contextMenuEl) return; contextMenuEl.remove(); contextMenuEl = null; contextTargetId = null; }

function renderSites() {
  const list = document.getElementById('siteList');
  list.innerHTML = '';
  hideContextMenu();
  if (!state.websites.length) {
    list.innerHTML = `<p class="hint">${t('noSites')}</p>`;
    return;
  }
  state.websites.forEach(site => {
    const div = document.createElement('div');
    const isActive = site.id === state.activeWebsiteId;
    div.className = `site-item ${isActive ? 'active' : ''}`;
    div.dataset.siteId = site.id;
    div.innerHTML = `<span class="site-name" title="${site.name}">${site.name}</span><span class="site-state ${isActive ? 'default' : ''}">${isActive ? t('defaultTag') : t('notDefaultTag')}</span>`;
    list.appendChild(div);
  });
}

function renderValueOptions() {
  const site = activeSite();
  const select = document.getElementById('valueSelect');
  select.innerHTML = '';
  if (!site) { select.innerHTML = `<option value="">${t('addSiteFirstOption')}</option>`; return; }
  const options = [['name', t('valueLabels').name], ['category', t('valueLabels').category], ['url', t('valueLabels').url], ['email', t('valueLabels').email], ['shortDesc', t('valueLabels').shortDesc], ['longDesc', t('valueLabels').longDesc], ['tags', t('valueLabels').tags]];
  options.forEach(([key, label]) => {
    if (site[key] || (key === 'tags' && site.tags?.length)) {
      const opt = document.createElement('option'); opt.value = key; opt.textContent = label; select.appendChild(opt);
    }
  });
}

async function withActiveTab(fn) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error(t('noActiveTab'));
  return fn(tab.id, tab.url || '');
}

async function refreshFieldList() {
  try {
    const fields = await withActiveTab(tabId => chrome.tabs.sendMessage(tabId, { type: 'getFields' }));
    const select = document.getElementById('fieldSelect');
    select.innerHTML = '';
    if (!fields?.length) { select.innerHTML = `<option value="">${t('noAvailableField')}</option>`; return; }
    fields.forEach(field => {
      const opt = document.createElement('option'); opt.value = field.selector; opt.textContent = field.label; select.appendChild(opt);
    });
  } catch (e) { setStatus(t('fieldReadFail')(normalizeMessageError(e))); }
}

async function detectMatch() {
  const site = activeSite();
  const status = document.getElementById('matchStatus');
  if (!site) { status.textContent = t('noSiteForMatch'); return; }
  try {
    await withActiveTab(async (tabId, tabUrl) => {
      const result = await chrome.tabs.sendMessage(tabId, { type: 'matchSite', payload: { site, tabUrl } });
      status.textContent = result?.matched ? t('matched')(site.name) : t('notMatched')(tabUrl);
    });
  } catch (e) { status.textContent = t('matchFail')(normalizeMessageError(e)); }
}

function bindSectionToggle() {
  document.querySelectorAll('.section-toggle').forEach(btn => {
    btn.addEventListener('click', () => { document.getElementById(btn.dataset.target)?.classList.toggle('open'); });
  });
}

function showSiteContextMenu(x, y, siteId) {
  hideContextMenu();
  contextTargetId = siteId;
  const menu = document.createElement('div');
  menu.className = 'site-context-menu';
  menu.innerHTML = `<button data-action="active">${t('menuSetDefault')}</button><button data-action="edit">${t('menuEdit')}</button><button data-action="delete">${t('menuDelete')}</button>`;
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  document.body.appendChild(menu);
  contextMenuEl = menu;
}

async function init() {
  const saved = (await getStorage()).geoData;
  state = saved ? { ...DEFAULT_DATA, ...saved, settings: { ...DEFAULT_DATA.settings, ...(saved.settings || {}) } } : structuredClone(DEFAULT_DATA);
  state.matchingStrategies = normalizeMatchingStrategies(state.matchingStrategies);
  if (!state.activeWebsiteId && state.websites[0]) { state.activeWebsiteId = state.websites[0].id; await saveStorage(); }
  applyI18n();
  document.getElementById('languageSelect').value = state.settings.language || 'auto';
  document.getElementById('themeSelect').value = state.settings.theme || 'auto';
  document.getElementById('autoFillOnLoad').checked = !!state.settings.autoFillOnLoad;
  applyTheme();
  renderSites();
  renderTags();
  renderValueOptions();
  await refreshFieldList();
  await detectMatch();
}

tabs.forEach(btn => btn.addEventListener('click', async () => {
  tabs.forEach(ti => ti.classList.remove('active')); panels.forEach(p => p.classList.remove('active'));
  btn.classList.add('active'); document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  if (btn.dataset.tab === 'manual') await refreshFieldList();
  if (btn.dataset.tab === 'smart') await detectMatch();
}));

bindSectionToggle();

document.getElementById('siteTagInput').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const value = e.target.value.trim();
  if (!value || pendingTags.includes(value)) return;
  pendingTags.push(value);
  e.target.value = '';
  renderTags();
});

document.getElementById('addSiteBtn').addEventListener('click', async () => {
  const site = {
    id: state.editingWebsiteId || uuid(),
    name: document.getElementById('siteName').value.trim(),
    category: document.getElementById('siteCategory').value.trim(),
    url: document.getElementById('siteUrl').value.trim(),
    email: document.getElementById('siteEmail').value.trim(),
    shortDesc: document.getElementById('siteShortDesc').value.trim(),
    longDesc: document.getElementById('siteLongDesc').value.trim(),
    tags: [...pendingTags],
  };
  if (!site.name || !site.url) { setStatus(t('fillRequired')); return; }

  if (state.editingWebsiteId) {
    state.websites = state.websites.map(item => item.id === state.editingWebsiteId ? site : item);
  } else {
    state.websites.push(site);
  }
  state.activeWebsiteId = site.id;
  await saveStorage();
  renderSites();
  renderValueOptions();
  await detectMatch();
  const isUpdating = !!state.editingWebsiteId;
  clearForm();
  setStatus(isUpdating ? t('siteUpdated') : t('siteSaved'));
});

const siteList = document.getElementById('siteList');
siteList.addEventListener('contextmenu', e => {
  const item = e.target.closest('.site-item');
  if (!item) return;
  e.preventDefault();
  showSiteContextMenu(e.clientX, e.clientY, item.dataset.siteId);
});

siteList.addEventListener('dblclick', e => {
  const item = e.target.closest('.site-item');
  if (!item) return;
  startEdit(item.dataset.siteId);
});

document.addEventListener('click', async e => {
  const actionBtn = e.target.closest('.site-context-menu button[data-action]');
  if (actionBtn && contextTargetId) {
    const id = contextTargetId;
    if (actionBtn.dataset.action === 'delete') {
      state.websites = state.websites.filter(site => site.id !== id);
      if (state.activeWebsiteId === id) state.activeWebsiteId = state.websites[0]?.id || null;
      if (state.editingWebsiteId === id) state.editingWebsiteId = null;
    }
    if (actionBtn.dataset.action === 'active') state.activeWebsiteId = id;
    if (actionBtn.dataset.action === 'edit') startEdit(id);
    await saveStorage();
    renderSites();
    renderValueOptions();
    await detectMatch();
    if (actionBtn.dataset.action === 'delete') setStatus(t('siteDeleted'));
    if (actionBtn.dataset.action === 'active') setStatus(t('defaultUpdated'));
    return;
  }
  if (!e.target.closest('.site-context-menu')) hideContextMenu();
});

document.getElementById('smartFillBtn').addEventListener('click', async () => {
  const site = activeSite();
  if (!site) { setStatus(t('addSiteFirst')); return; }
  try {
    const result = await withActiveTab(tabId => chrome.tabs.sendMessage(tabId, {
      type: 'smartFill',
      payload: { site, strategies: normalizeMatchingStrategies(state.matchingStrategies) },
    }));
    setStatus(result?.filled ? t('smartFillDone')(result.filled) : t('smartFillNoMatch'));
  } catch (e) { setStatus(t('smartFillFail')(normalizeMessageError(e))); }
});

document.getElementById('manualFillBtn').addEventListener('click', async () => {
  const site = activeSite();
  if (!site) { setStatus(t('addSiteFirst')); return; }
  const selector = document.getElementById('fieldSelect').value;
  const valueKey = document.getElementById('valueSelect').value;
  const value = valueKey === 'tags' ? (site.tags || []).join(', ') : (site[valueKey] || '');
  if (!selector || !value) { setStatus(t('chooseFieldValue')); return; }
  try {
    const result = await withActiveTab(tabId => chrome.tabs.sendMessage(tabId, { type: 'manualFill', payload: { selector, value } }));
    setStatus(result?.ok ? t('manualFillSuccess') : t('manualFillFail'));
  } catch (e) { setStatus(t('manualFillError')(normalizeMessageError(e))); }
});

document.getElementById('refreshFieldsBtn').addEventListener('click', refreshFieldList);
document.getElementById('addStrategyBtn').addEventListener('click', () => {
  state.matchingStrategies = normalizeMatchingStrategies(state.matchingStrategies);
  state.matchingStrategies.push({ key: 'name', label: strategyFieldLabel('name'), aliases: ['name'] });
  renderStrategies();
});
document.getElementById('strategyList').addEventListener('input', e => {
  const idx = Number(e.target.dataset.index);
  if (!Number.isInteger(idx) || !state.matchingStrategies[idx]) return;
  if (e.target.dataset.role === 'aliases') {
    state.matchingStrategies[idx].aliases = e.target.value.split(',').map(item => item.trim()).filter(Boolean);
  }
});
document.getElementById('strategyList').addEventListener('change', e => {
  const idx = Number(e.target.dataset.index);
  if (!Number.isInteger(idx) || !state.matchingStrategies[idx]) return;
  if (e.target.dataset.role === 'key') {
    state.matchingStrategies[idx].key = e.target.value;
    state.matchingStrategies[idx].label = strategyFieldLabel(e.target.value);
  }
});
document.getElementById('strategyList').addEventListener('click', e => {
  if (e.target.dataset.role !== 'delete') return;
  const idx = Number(e.target.dataset.index);
  if (!Number.isInteger(idx)) return;
  state.matchingStrategies.splice(idx, 1);
  renderStrategies();
});
document.getElementById('saveStrategiesBtn').addEventListener('click', async () => {
  state.matchingStrategies = normalizeMatchingStrategies(state.matchingStrategies);
  await saveStorage();
  renderStrategies();
  setStatus(t('strategiesSaved'));
});
document.getElementById('quickExportBtn').addEventListener('click', () => {
  state.matchingStrategies = normalizeMatchingStrategies(state.matchingStrategies);
  const blob = new Blob([JSON.stringify(fullExportPayload(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `geocopilot-config-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus(t('configExported'));
});
document.getElementById('quickImportBtn').addEventListener('click', () => {
  document.getElementById('quickImportInput').click();
});
document.getElementById('quickImportInput').addEventListener('change', async e => {
  const [file] = e.target.files || [];
  try {
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    state = normalizeImportedState(parsed);
    await saveStorage();
    clearForm();
    applyI18n();
    document.getElementById('languageSelect').value = state.settings.language || 'auto';
    document.getElementById('themeSelect').value = state.settings.theme || 'auto';
    document.getElementById('autoFillOnLoad').checked = !!state.settings.autoFillOnLoad;
    applyTheme();
    renderSites();
    renderValueOptions();
    await detectMatch();
    setStatus(t('configImported'));
  } catch (error) {
    setStatus(t('configImportFail')(error?.message || String(error)));
  } finally {
    e.target.value = '';
  }
});
document.getElementById('autoFillOnLoad').addEventListener('change', async e => {
  state.settings.autoFillOnLoad = e.target.checked; await saveStorage(); setStatus(t('settingsSaved'));
});
document.getElementById('languageSelect').addEventListener('change', async e => {
  state.settings.language = e.target.value;
  applyI18n();
  renderSites();
  renderValueOptions();
  await saveStorage();
  await detectMatch();
  setStatus(t('settingsSaved'));
});
document.getElementById('themeSelect').addEventListener('change', async e => {
  state.settings.theme = e.target.value;
  applyTheme();
  await saveStorage();
  setStatus(t('settingsSaved'));
});
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if ((state.settings.theme || 'auto') === 'auto') applyTheme();
});

init();
