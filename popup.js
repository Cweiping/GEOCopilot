const DEFAULT_DATA = {
  websites: [],
  activeWebsiteId: null,
  settings: {
    autoFillOnLoad: true,
    preferSidePanel: true,
  },
};

let state = structuredClone(DEFAULT_DATA);
let pendingTags = [];
let contextMenuEl = null;
let contextTargetId = null;

const tabs = [...document.querySelectorAll('.tab')];
const panels = [...document.querySelectorAll('.panel')];
const statusEl = document.getElementById('status');

function setStatus(message) {
  statusEl.textContent = message || '';
}

function normalizeMessageError(error) {
  const message = error?.message || String(error || '');
  if (message.includes('Could not establish connection. Receiving end does not exist.')) {
    return '当前页面未注入内容脚本（常见于 chrome:// 页面、扩展页，或页面刚加载）。请切换到普通网页后重试。';
  }
  return message;
}

function getStorage() {
  return chrome.storage.local.get('geoData');
}

async function saveStorage() {
  await chrome.storage.local.set({ geoData: state });
}

function uuid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderTags() {
  const wrap = document.getElementById('siteTags');
  wrap.innerHTML = pendingTags.map(tag => `<span class="tag">${tag}</span>`).join('');
}

function clearForm() {
  ['siteName', 'siteCategory', 'siteUrl', 'siteEmail', 'siteShortDesc', 'siteLongDesc', 'siteTagInput'].forEach(id => {
    document.getElementById(id).value = '';
  });
  pendingTags = [];
  renderTags();
}

function activeSite() {
  return state.websites.find(w => w.id === state.activeWebsiteId) || state.websites[0] || null;
}

function hideContextMenu() {
  if (!contextMenuEl) return;
  contextMenuEl.remove();
  contextMenuEl = null;
  contextTargetId = null;
}

function renderSites() {
  const list = document.getElementById('siteList');
  list.innerHTML = '';
  hideContextMenu();

  if (!state.websites.length) {
    list.innerHTML = '<p class="hint">暂无网站配置，请先添加。</p>';
    return;
  }

  state.websites.forEach(site => {
    const div = document.createElement('div');
    const isActive = site.id === state.activeWebsiteId;
    div.className = `site-item ${isActive ? 'active' : ''}`;
    div.dataset.siteId = site.id;
    div.innerHTML = `
      <span class="site-name" title="${site.name}">${site.name}</span>
      <span class="site-state ${isActive ? 'default' : ''}">${isActive ? '默认' : '未默认'}</span>
    `;
    list.appendChild(div);
  });

  const hint = document.createElement('p');
  hint.className = 'hint context-hint';
  hint.textContent = '右键网站条目可设置默认或删除。';
  list.appendChild(hint);
}

function renderValueOptions() {
  const site = activeSite();
  const select = document.getElementById('valueSelect');
  select.innerHTML = '';
  if (!site) {
    select.innerHTML = '<option value="">请先添加网站</option>';
    return;
  }

  const options = [
    ['name', '网站名称'],
    ['category', '分类'],
    ['url', '网站地址'],
    ['email', '联系邮箱'],
    ['shortDesc', '简短描述'],
    ['longDesc', '详细描述'],
    ['tags', '关键词标签（逗号拼接）'],
  ];

  options.forEach(([key, label]) => {
    if (site[key] || (key === 'tags' && site.tags?.length)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = label;
      select.appendChild(opt);
    }
  });
}

async function withActiveTab(fn) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('未找到活动标签页');
  return fn(tab.id, tab.url || '');
}

async function refreshFieldList() {
  try {
    const fields = await withActiveTab(tabId => chrome.tabs.sendMessage(tabId, { type: 'getFields' }));
    const select = document.getElementById('fieldSelect');
    select.innerHTML = '';
    if (!fields?.length) {
      select.innerHTML = '<option value="">未发现可填充字段</option>';
      return;
    }

    fields.forEach(field => {
      const opt = document.createElement('option');
      opt.value = field.selector;
      opt.textContent = field.label;
      select.appendChild(opt);
    });
  } catch (e) {
    setStatus(`字段读取失败：${normalizeMessageError(e)}`);
  }
}

async function detectMatch() {
  const site = activeSite();
  const status = document.getElementById('matchStatus');
  if (!site) {
    status.textContent = '暂无网站配置，请先在网站管理中添加。';
    return;
  }

  try {
    await withActiveTab(async (tabId, tabUrl) => {
      const result = await chrome.tabs.sendMessage(tabId, {
        type: 'matchSite',
        payload: { site, tabUrl },
      });
      status.textContent = result?.matched
        ? `已匹配站点：${site.name}，可执行智能填充。`
        : `未匹配站点规则（当前：${tabUrl || '未知页面'}），仍可手动填充。`;
    });
  } catch (e) {
    status.textContent = `匹配失败：${normalizeMessageError(e)}`;
  }
}

function bindSectionToggle() {
  document.querySelectorAll('.section-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = document.getElementById(btn.dataset.target);
      section?.classList.toggle('open');
    });
  });
}

function showSiteContextMenu(x, y, siteId) {
  hideContextMenu();
  contextTargetId = siteId;

  const menu = document.createElement('div');
  menu.className = 'site-context-menu';
  menu.innerHTML = `
    <button data-action="active">设为默认</button>
    <button data-action="delete">删除</button>
  `;
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  document.body.appendChild(menu);
  contextMenuEl = menu;
}

async function init() {
  const saved = (await getStorage()).geoData;
  state = saved ? { ...DEFAULT_DATA, ...saved, settings: { ...DEFAULT_DATA.settings, ...(saved.settings || {}) } } : structuredClone(DEFAULT_DATA);

  if (!state.activeWebsiteId && state.websites[0]) {
    state.activeWebsiteId = state.websites[0].id;
    await saveStorage();
  }

  document.getElementById('autoFillOnLoad').checked = !!state.settings.autoFillOnLoad;

  renderSites();
  renderTags();
  renderValueOptions();
  await refreshFieldList();
  await detectMatch();
}

tabs.forEach(btn => {
  btn.addEventListener('click', async () => {
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'manual') await refreshFieldList();
    if (btn.dataset.tab === 'smart') await detectMatch();
  });
});

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
    id: uuid(),
    name: document.getElementById('siteName').value.trim(),
    category: document.getElementById('siteCategory').value.trim(),
    url: document.getElementById('siteUrl').value.trim(),
    email: document.getElementById('siteEmail').value.trim(),
    shortDesc: document.getElementById('siteShortDesc').value.trim(),
    longDesc: document.getElementById('siteLongDesc').value.trim(),
    tags: [...pendingTags],
  };

  if (!site.name || !site.url) {
    setStatus('请填写必填项：网站名称、网站地址');
    return;
  }

  state.websites.push(site);
  state.activeWebsiteId = site.id;
  await saveStorage();
  renderSites();
  renderValueOptions();
  await detectMatch();
  clearForm();
  setStatus('网站信息已保存');
});

const siteList = document.getElementById('siteList');

siteList.addEventListener('contextmenu', e => {
  const item = e.target.closest('.site-item');
  if (!item) return;
  e.preventDefault();
  showSiteContextMenu(e.clientX, e.clientY, item.dataset.siteId);
});

document.addEventListener('click', async e => {
  const actionBtn = e.target.closest('.site-context-menu button[data-action]');
  if (actionBtn && contextTargetId) {
    const id = contextTargetId;
    if (actionBtn.dataset.action === 'delete') {
      state.websites = state.websites.filter(site => site.id !== id);
      if (state.activeWebsiteId === id) state.activeWebsiteId = state.websites[0]?.id || null;
    }
    if (actionBtn.dataset.action === 'active') {
      state.activeWebsiteId = id;
    }
    await saveStorage();
    renderSites();
    renderValueOptions();
    await detectMatch();
    setStatus(actionBtn.dataset.action === 'delete' ? '网站已删除' : '默认网站已更新');
    return;
  }

  if (!e.target.closest('.site-context-menu')) {
    hideContextMenu();
  }
});

document.getElementById('smartFillBtn').addEventListener('click', async () => {
  const site = activeSite();
  if (!site) {
    setStatus('请先添加网站配置');
    return;
  }

  try {
    const result = await withActiveTab(tabId => chrome.tabs.sendMessage(tabId, { type: 'smartFill', payload: { site } }));
    setStatus(result?.filled ? `已自动填充 ${result.filled} 个字段` : '没有匹配到可填充字段');
  } catch (e) {
    setStatus(`智能填充失败：${normalizeMessageError(e)}`);
  }
});

document.getElementById('manualFillBtn').addEventListener('click', async () => {
  const site = activeSite();
  if (!site) {
    setStatus('请先添加网站配置');
    return;
  }
  const selector = document.getElementById('fieldSelect').value;
  const valueKey = document.getElementById('valueSelect').value;
  const value = valueKey === 'tags' ? (site.tags || []).join(', ') : (site[valueKey] || '');
  if (!selector || !value) {
    setStatus('请选择字段和可用填充值');
    return;
  }
  try {
    const result = await withActiveTab(tabId => chrome.tabs.sendMessage(tabId, {
      type: 'manualFill',
      payload: { selector, value },
    }));
    setStatus(result?.ok ? '手动填充成功' : '手动填充失败');
  } catch (e) {
    setStatus(`手动填充失败：${normalizeMessageError(e)}`);
  }
});

document.getElementById('refreshFieldsBtn').addEventListener('click', refreshFieldList);

document.getElementById('autoFillOnLoad').addEventListener('change', async e => {
  state.settings.autoFillOnLoad = e.target.checked;
  await saveStorage();
  setStatus('设置已保存');
});

init();
