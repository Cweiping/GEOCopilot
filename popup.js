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

const tabs = [...document.querySelectorAll('.tab')];
const panels = [...document.querySelectorAll('.panel')];
const statusEl = document.getElementById('status');

function setStatus(message) {
  statusEl.textContent = message || '';
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

function renderSites() {
  const list = document.getElementById('siteList');
  list.innerHTML = '';
  if (!state.websites.length) {
    list.innerHTML = '<p class="hint">暂无网站配置，请先添加。</p>';
    return;
  }

  state.websites.forEach(site => {
    const div = document.createElement('div');
    div.className = `site-item ${site.id === state.activeWebsiteId ? 'active' : ''}`;
    div.innerHTML = `
      <div><strong>${site.name}</strong> (${site.category || '未分类'})</div>
      <div>${site.url}</div>
      <div class="hint">${site.shortDesc || site.longDesc || ''}</div>
      <div class="tags">${(site.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
      <div class="site-actions">
        <button data-action="active" data-id="${site.id}">设为当前</button>
        <button data-action="delete" data-id="${site.id}" class="secondary">删除</button>
      </div>
    `;
    list.appendChild(div);
  });
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
    setStatus(`字段读取失败：${e.message}`);
  }
}

async function detectMatch() {
  const site = activeSite();
  const status = document.getElementById('matchStatus');
  if (!site) {
    status.textContent = '暂无网站配置，请先在网站管理中添加。';
    return;
  }

  await withActiveTab(async (tabId, tabUrl) => {
    const result = await chrome.tabs.sendMessage(tabId, {
      type: 'matchSite',
      payload: { site, tabUrl },
    });
    status.textContent = result?.matched
      ? `已匹配站点：${site.name}，可执行智能填充。`
      : `未匹配站点规则（当前：${tabUrl || '未知页面'}），仍可手动填充。`;
  });
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

document.getElementById('siteList').addEventListener('click', async e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'delete') {
    state.websites = state.websites.filter(site => site.id !== id);
    if (state.activeWebsiteId === id) state.activeWebsiteId = state.websites[0]?.id || null;
  }
  if (btn.dataset.action === 'active') state.activeWebsiteId = id;
  await saveStorage();
  renderSites();
  renderValueOptions();
  await detectMatch();
});

document.getElementById('smartFillBtn').addEventListener('click', async () => {
  const site = activeSite();
  if (!site) {
    setStatus('请先添加网站配置');
    return;
  }

  const result = await withActiveTab(tabId => chrome.tabs.sendMessage(tabId, { type: 'smartFill', payload: { site } }));
  setStatus(result?.filled ? `已自动填充 ${result.filled} 个字段` : '没有匹配到可填充字段');
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
  const result = await withActiveTab(tabId => chrome.tabs.sendMessage(tabId, {
    type: 'manualFill',
    payload: { selector, value },
  }));
  setStatus(result?.ok ? '手动填充成功' : '手动填充失败');
});

document.getElementById('refreshFieldsBtn').addEventListener('click', refreshFieldList);

document.getElementById('autoFillOnLoad').addEventListener('change', async e => {
  state.settings.autoFillOnLoad = e.target.checked;
  await saveStorage();
  setStatus('设置已保存');
});

init();
