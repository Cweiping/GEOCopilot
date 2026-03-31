function textOf(el) {
  const id = el.id;
  const name = el.name || '';
  const placeholder = el.placeholder || '';
  const aria = el.getAttribute('aria-label') || '';
  const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.innerText || '' : '';
  return `${name} ${placeholder} ${aria} ${label}`.toLowerCase();
}

async function safeGetGeoData() {
  if (!chrome?.runtime?.id) return null;
  try {
    const store = await chrome.storage.local.get('geoData');
    return store?.geoData || null;
  } catch (error) {
    console.warn('GEOCopilot: failed to read storage', error);
    return null;
  }
}

function setNativeValue(el, value) {
  el.focus();
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

const NON_FILLABLE_INPUT_TYPES = new Set([
  'hidden',
  'submit',
  'button',
  'radio',
  'checkbox',
  'file',
  'image',
  'reset',
  'range',
  'color',
]);

function isFillableField(el) {
  if (!el || el.disabled) return false;
  if (!document.body.contains(el)) return false;
  if (el.tagName.toLowerCase() === 'textarea') return true;
  if (el.tagName.toLowerCase() !== 'input') return false;
  return !NON_FILLABLE_INPUT_TYPES.has((el.type || '').toLowerCase());
}

const BUILTIN_MATCHING_STRATEGIES = [
  { key: 'name', label: '网站名称', aliases: ['网站名称', 'name', 'title', '站点名称', '网站名'] },
  { key: 'category', label: '分类', aliases: ['分类', 'category', 'type'] },
  { key: 'url', label: '网站地址', aliases: ['网址', 'url', 'link', 'site', 'homepage', 'domain', '网站地址'] },
  { key: 'email', label: '联系邮箱', aliases: ['邮箱', 'email', 'mail', '联系'] },
  { key: 'shortDesc', label: '简短描述', aliases: ['简短描述', 'short', 'slogan', 'summary', '一句话'] },
  { key: 'longDesc', label: '详细描述', aliases: ['详细描述', 'long', 'detail', 'description', '内容介绍', '简介', '描述'] },
  { key: 'tags', label: '关键词标签', aliases: ['关键词', 'tags', 'keyword'] },
];

function normalizeMatchingStrategies(strategies) {
  if (!Array.isArray(strategies) || !strategies.length) return BUILTIN_MATCHING_STRATEGIES;
  const normalized = strategies
    .map(item => ({
      key: item?.key,
      label: item?.label || item?.key || '',
      aliases: Array.isArray(item?.aliases) ? item.aliases.map(alias => String(alias || '').trim()).filter(Boolean) : [],
    }))
    .filter(item => item.key && item.aliases.length);
  return normalized.length ? normalized : BUILTIN_MATCHING_STRATEGIES;
}

function valueByKey(site, key) {
  if (key === 'tags') return (site.tags || []).join(', ');
  if (key === 'longDesc') return site.longDesc || site.shortDesc || '';
  return site[key] || '';
}

function getFieldMappings(site, strategies = BUILTIN_MATCHING_STRATEGIES) {
  return normalizeMatchingStrategies(strategies).map(item => ({
    key: item.key,
    label: item.label,
    keys: item.aliases,
    value: valueByKey(site, item.key),
  }));
}

function matchFieldByHint(hint, site, strategies = BUILTIN_MATCHING_STRATEGIES) {
  for (const item of getFieldMappings(site, strategies)) {
    if (item.value && item.keys.some(k => hint.includes(k.toLowerCase()))) return item;
  }
  return null;
}

function findValueByHint(hint, site, strategies = BUILTIN_MATCHING_STRATEGIES) {
  return matchFieldByHint(hint, site, strategies)?.value || '';
}

function fillBySite(site, strategies = BUILTIN_MATCHING_STRATEGIES) {
  const candidates = [...document.querySelectorAll('input, textarea')].filter(isFillableField);
  let filled = 0;
  for (const el of candidates) {
    const hint = textOf(el);
    const value = findValueByHint(hint, site, strategies);
    if (value && !el.value) {
      setNativeValue(el, value);
      filled += 1;
    }
  }
  return filled;
}

function siteMatchesPage(site, tabUrl = location.href) {
  try {
    if (!site?.url) return false;
    const siteHost = new URL(site.url).hostname.replace(/^www\./, '');
    const pageHost = new URL(tabUrl).hostname.replace(/^www\./, '');
    return siteHost === pageHost || pageHost.includes(siteHost) || siteHost.includes(pageHost);
  } catch {
    return false;
  }
}

function fieldSelector(el, index) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  if (el.name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`;
  return `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
}

const quickFill = (() => {
  let panel = null;
  let activeField = null;
  let activeSite = null;
  const markers = [];
  let observer = null;
  let renderTimer = null;
  let lang = 'zh-CN';

  const I18N = {
    'zh-CN': {
      header: '快速填写',
      fillPage: '智能填充整页',
    },
    en: {
      header: 'Quick Fill',
      fillPage: 'Smart fill whole page',
    },
  };

  function t(key) {
    const value = I18N[lang]?.[key] ?? I18N['zh-CN'][key];
    return typeof value === 'function' ? value : value;
  }

  async function resolveLanguage() {
    const geoData = await safeGetGeoData();
    const setting = geoData?.settings?.language || 'auto';
    if (setting !== 'auto') {
      lang = setting;
      return;
    }
    const browserLang = (navigator.languages?.[0] || navigator.language || '').toLowerCase();
    lang = browserLang.startsWith('zh') ? 'zh-CN' : 'en';
  }

  function remove() {
    markers.forEach(({ btn }) => btn.remove());
    markers.length = 0;
    panel?.remove();
    panel = null;
    observer?.disconnect();
    observer = null;
    activeField = null;
  }

  function hidePanel() { if (panel) panel.style.display = 'none'; }

  function positionNearField(element, node, offsetX = 0, offsetY = 0) {
    if (!element || !node || !document.body.contains(element)) return;
    const rect = element.getBoundingClientRect();
    node.style.position = 'fixed';
    node.style.left = `${Math.max(8, rect.right - node.offsetWidth - 6 + offsetX)}px`;
    node.style.top = `${Math.max(8, rect.top + 6 + offsetY)}px`;
    node.style.zIndex = '2147483647';
  }

  function positionPanel() { if (panel?.style.display !== 'none' && activeField) positionNearField(activeField, panel, 0, 24); }

  function positionAllMarkers() {
    markers.forEach(({ field, btn }) => positionNearField(field, btn));
    positionPanel();
  }

  function availableSiteFields(site, strategies = BUILTIN_MATCHING_STRATEGIES) {
    if (!site) return [];
    return getFieldMappings(site, strategies).filter(item => !!item.value);
  }

  async function getActiveSiteFromStorage() {
    const data = await safeGetGeoData();
    if (!data?.websites?.length) return null;
    return data.websites.find(item => item.id === data.activeWebsiteId) || data.websites[0];
  }

  function isQuickFillEnabled(data) {
    return !(data?.settings?.enableAllFeatures === false || data?.settings?.enableWebFill === false);
  }

  function fieldSignature(field) {
    const hint = textOf(field).trim();
    if (hint) return hint;
    return `${field.tagName.toLowerCase()}::${field.name || field.id || field.placeholder || ''}`;
  }

  function pageKey() {
    try {
      return new URL(location.href).hostname.replace(/^www\./, '');
    } catch {
      return 'unknown';
    }
  }

  async function recordLearnedStrategy(siteId, signature, fieldKey) {
    if (!siteId || !signature || !fieldKey) return;
    const data = await safeGetGeoData() || {};
    const learnedMappings = data.learnedMappings || {};
    if (!learnedMappings[siteId]) learnedMappings[siteId] = {};
    const host = pageKey();
    if (!learnedMappings[siteId][host]) learnedMappings[siteId][host] = {};
    learnedMappings[siteId][host][signature] = fieldKey;
    await chrome.storage.local.set({ geoData: { ...data, learnedMappings } });
  }

  function learnedFieldKey(data, siteId, signature) {
    const host = pageKey();
    return data?.learnedMappings?.[siteId]?.[host]?.[signature] || null;
  }

  async function tryAutoFillByStrategy(field, site, data) {
    if (!field || !site || field.value) return { filled: false };
    const signature = fieldSignature(field);
    const strategies = normalizeMatchingStrategies(data?.matchingStrategies);
    const fields = availableSiteFields(site, strategies);
    const learnedKey = learnedFieldKey(data, site.id, signature);
    const learned = learnedKey ? fields.find(item => item.key === learnedKey && item.value) : null;
    if (learned) {
      setNativeValue(field, learned.value);
      return { filled: true, signature };
    }
    const mapped = matchFieldByHint(signature, site, strategies);
    if (mapped?.value) {
      setNativeValue(field, mapped.value);
      return { filled: true, signature };
    }
    return { filled: false, signature };
  }

  function buildPanelItems(site, signature, strategies = BUILTIN_MATCHING_STRATEGIES) {
    if (!panel) return;
    panel.innerHTML = '';

    const header = document.createElement('div');
    header.textContent = t('header');
    header.style.fontWeight = '600';
    header.style.fontSize = '12px';
    header.style.marginBottom = '4px';
    panel.appendChild(header);

    const fillAllBtn = document.createElement('button');
    fillAllBtn.type = 'button';
    fillAllBtn.textContent = t('fillPage');
    fillAllBtn.className = 'geo-quick-fill-btn geo-quick-fill-primary';
    fillAllBtn.addEventListener('click', e => {
      e.preventDefault();
      if (!site) return;
      fillBySite(site);
      hidePanel();
    });
    panel.appendChild(fillAllBtn);

    for (const item of availableSiteFields(site, strategies)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'geo-quick-fill-btn';
      btn.innerHTML = `<strong>${item.label}:</strong> <span>${item.value}</span>`;
      btn.dataset.key = item.key;
      btn.addEventListener('click', e => {
        e.preventDefault();
        if (!activeField) return;
        setNativeValue(activeField, item.value);
        recordLearnedStrategy(site.id, signature, item.key).catch(error => {
          console.warn('GEOCopilot: record learned mapping failed', error);
        });
        hidePanel();
      });
      panel.appendChild(btn);
    }
  }

  function ensureNodes() {
    if (panel) return;
    panel = document.createElement('div');
    panel.style.display = 'none';
    panel.style.minWidth = '160px';
    panel.style.maxWidth = '260px';
    panel.style.background = '#fff';
    panel.style.border = '1px solid #dbe0eb';
    panel.style.borderRadius = '8px';
    panel.style.padding = '6px';
    panel.style.boxShadow = '0 6px 16px rgba(0, 0, 0, .16)';
    panel.style.fontSize = '12px';
    panel.style.lineHeight = '1.35';
    panel.style.gap = '4px';
    panel.style.flexDirection = 'column';
    document.body.appendChild(panel);

    const style = document.createElement('style');
    style.textContent = `
      .geo-quick-fill-trigger {
        position: fixed;
        width: 18px;
        height: 18px;
        border: 1px solid #cdd8f5;
        border-radius: 999px;
        background: #2962ff;
        color: #fff;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, .18);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        line-height: 1;
        padding: 0;
      }

      .geo-quick-fill-btn {
        width: 100%;
        margin: 0;
        border: 1px solid #dbe0eb;
        border-radius: 6px;
        background: #fff;
        color: #2c3342;
        font-size: 11px;
        padding: 4px 6px;
        cursor: pointer;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .geo-quick-fill-btn strong { font-weight: 600; }
      .geo-quick-fill-btn span { color: #5d6475; }
      .geo-quick-fill-primary { text-align: center; background: #f4f7ff; color: #1f3f9f; font-weight: 600; }
    `;
    document.head.appendChild(style);

    document.addEventListener('mousedown', e => {
      const target = e.target;
      const clickedMarker = markers.some(({ btn }) => btn.contains(target));
      if (clickedMarker || panel?.contains(target)) return;
      hidePanel();
    });
    document.addEventListener('scroll', positionAllMarkers, true);
    window.addEventListener('resize', positionAllMarkers);
  }

  function clearMarkers() {
    markers.forEach(({ btn }) => btn.remove());
    markers.length = 0;
  }

  async function handleMarkerClick(field) {
    activeField = field;
    try {
      const data = await safeGetGeoData();
      activeSite = await getActiveSiteFromStorage();
      if (!activeSite) {
        hidePanel();
        return;
      }
      const attempt = await tryAutoFillByStrategy(activeField, activeSite, data);
      if (attempt.filled) {
        hidePanel();
        return;
      }
      buildPanelItems(activeSite, attempt.signature, normalizeMatchingStrategies(data?.matchingStrategies));
      panel.style.display = 'flex';
      positionPanel();
    } catch (error) {
      console.warn('GEOCopilot: marker click fill failed', error);
    }
  }

  function addMarkerForField(field) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'geo-quick-fill-trigger';
    btn.title = t('header');
    btn.textContent = '✦';
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      handleMarkerClick(field);
    });
    document.body.appendChild(btn);
    markers.push({ field, btn });
    positionNearField(field, btn);
  }

  function renderMarkers(site) {
    if (!site) {
      clearMarkers();
      hidePanel();
      return;
    }
    const candidates = [...document.querySelectorAll('input, textarea')].filter(isFillableField);
    clearMarkers();
    for (const field of candidates) addMarkerForField(field);
  }

  function debounceRender(site) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => renderMarkers(site), 120);
  }

  async function init() {
    await resolveLanguage();
    const data = await safeGetGeoData();
    if (!isQuickFillEnabled(data)) {
      remove();
      return;
    }
    ensureNodes();
    activeSite = await getActiveSiteFromStorage();
    renderMarkers(activeSite);
    observer?.disconnect();
    observer = new MutationObserver(() => debounceRender(activeSite));
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: false });
  }

  return { init, remove };
})();

const pageQuickRail = (() => {
  let rail = null;
  let resolvedLang = 'zh-CN';

  const ISSUES_URL = 'https://github.com/Cweiping/GEOCopilot/issues';
  const I18N = {
    'zh-CN': {
      sidePanel: '侧边栏开关',
      smartFill: '智能填充',
      settings: '打开设置',
      feedback: '问题反馈（GitHub Issue）',
      smartFillDone: n => `已自动填充 ${n} 个字段`,
      smartFillNoMatch: '没有匹配到可填充字段',
      smartFillDisabled: '网页填充功能已关闭',
    },
    en: {
      sidePanel: 'Toggle side panel',
      smartFill: 'Smart fill',
      settings: 'Open settings',
      feedback: 'Feedback (GitHub Issues)',
      smartFillDone: n => `Auto-filled ${n} field(s)`,
      smartFillNoMatch: 'No fillable field matched',
      smartFillDisabled: 'Web filling is disabled',
    },
  };

  function t(key, ...args) {
    const value = I18N[resolvedLang]?.[key] ?? I18N['zh-CN'][key];
    return typeof value === 'function' ? value(...args) : value;
  }

  async function resolveUiSettings() {
    const data = await safeGetGeoData();
    const languageSetting = data?.settings?.language || 'auto';
    if (languageSetting === 'auto') {
      const browserLang = (navigator.languages?.[0] || navigator.language || '').toLowerCase();
      resolvedLang = browserLang.startsWith('zh') ? 'zh-CN' : 'en';
    } else {
      resolvedLang = languageSetting;
    }
    return data;
  }

  async function isEnabled(data) {
    const source = data || await safeGetGeoData();
    if (source?.settings?.enableAllFeatures === false) return false;
    return source?.settings?.preferSidePanel !== false;
  }

  function showToast(text) {
    if (!rail || !text) return;
    const toast = document.createElement('div');
    toast.className = 'geo-page-rail-toast';
    toast.textContent = text;
    rail.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 180);
    }, 1400);
  }

  async function openPanelTab(tab) {
    const data = await safeGetGeoData() || {};
    await chrome.storage.local.set({ geoData: { ...data, pendingPanelTab: tab } });
    await chrome.runtime.sendMessage({ type: 'openSidePanel' });
  }

  async function smartFillCurrentPage() {
    const data = await safeGetGeoData();
    if (data?.settings?.enableWebFill === false) {
      showToast(t('smartFillDisabled'));
      return;
    }
    const site = data?.websites?.find(item => item.id === data.activeWebsiteId) || data?.websites?.[0];
    if (!site) {
      showToast(t('smartFillNoMatch'));
      return;
    }
    const filled = fillBySite(site, normalizeMatchingStrategies(data?.matchingStrategies));
    showToast(filled > 0 ? t('smartFillDone', filled) : t('smartFillNoMatch'));
  }

  function railButton(title, iconPath, onClick, className = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `geo-page-rail-btn ${className}`.trim();
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${iconPath}"></path></svg>`;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function ensureRail() {
    if (rail) return rail;
    rail = document.createElement('div');
    rail.className = 'geo-page-quick-rail';

    const sidePanelBtn = railButton(
      t('sidePanel'),
      'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v12h5V6H4Zm7 0v12h9V6h-9Z',
      async event => {
        event.preventDefault();
        await chrome.runtime.sendMessage({ type: 'openSidePanel' });
      }
    );
    const smartFillBtn = railButton(
      t('smartFill'),
      'M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2Zm0 4.44 1.2 3.6 3.6 1.2-3.6 1.2-1.2 3.6-1.2-3.6-3.6-1.2 3.6-1.2L12 6.44Z',
      async event => {
        event.preventDefault();
        await smartFillCurrentPage();
      },
      'is-primary'
    );
    const settingsBtn = railButton(
      t('settings'),
      'M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.18 7.18 0 0 0-1.63-.94L14.4 2.7a.5.5 0 0 0-.5-.4h-3.8a.5.5 0 0 0-.5.4L9.25 5.32c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.39 1.05.71 1.63.94l.35 2.62c.04.24.25.4.5.4h3.8c.25 0 .46-.16.5-.4l.35-2.62c.58-.23 1.12-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z',
      async event => {
        event.preventDefault();
        await openPanelTab('settings');
      }
    );
    const feedbackBtn = document.createElement('a');
    feedbackBtn.className = 'geo-page-rail-btn';
    feedbackBtn.href = ISSUES_URL;
    feedbackBtn.target = '_blank';
    feedbackBtn.rel = 'noopener noreferrer';
    feedbackBtn.title = t('feedback');
    feedbackBtn.setAttribute('aria-label', t('feedback'));
    feedbackBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2Zm0 2v10.17L7.17 13H20V6H4Z"></path></svg>';

    rail.append(sidePanelBtn, smartFillBtn, settingsBtn, feedbackBtn);

    const style = document.createElement('style');
    style.id = 'geo-page-quick-rail-style';
    style.textContent = `
      .geo-page-quick-rail {
        position: fixed;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .geo-page-rail-btn {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        border: 1px solid var(--geo-rail-border);
        background: var(--geo-rail-bg);
        color: var(--geo-rail-color);
        box-shadow: 0 6px 12px var(--geo-rail-shadow);
        display: inline-grid;
        place-items: center;
        text-decoration: none;
      }
      .geo-page-rail-btn svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
      }
      .geo-page-rail-btn.is-primary {
        background: linear-gradient(160deg, var(--geo-rail-brand), var(--geo-rail-brand-pressed));
        color: #fff;
        border-color: transparent;
      }
      .geo-page-rail-toast {
        position: absolute;
        right: calc(100% + 8px);
        top: 50%;
        transform: translateY(-50%) translateX(4px);
        background: var(--geo-rail-toast-bg);
        color: var(--geo-rail-toast-text);
        border-radius: 7px;
        padding: 4px 7px;
        font-size: 11px;
        white-space: nowrap;
        opacity: 0;
        transition: all 140ms ease;
        pointer-events: none;
      }
      .geo-page-rail-toast.is-visible {
        opacity: 1;
        transform: translateY(-50%) translateX(0);
      }
    `;
    if (!document.getElementById(style.id)) {
      document.head.appendChild(style);
    }
    document.body.appendChild(rail);
    return rail;
  }

  function applyTheme(data) {
    if (!rail) return;
    const setting = data?.settings?.theme || 'auto';
    const theme = setting === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : setting;
    const isDark = theme === 'dark';
    rail.style.setProperty('--geo-rail-bg', isDark ? '#1a1f2b' : '#ffffff');
    rail.style.setProperty('--geo-rail-border', isDark ? 'rgba(244, 246, 251, 0.16)' : 'rgba(17, 19, 23, 0.12)');
    rail.style.setProperty('--geo-rail-color', '#0a84ff');
    rail.style.setProperty('--geo-rail-shadow', isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(17, 19, 23, 0.12)');
    rail.style.setProperty('--geo-rail-brand', '#0a84ff');
    rail.style.setProperty('--geo-rail-brand-pressed', isDark ? '#369dff' : '#0071e3');
    rail.style.setProperty('--geo-rail-toast-bg', isDark ? 'rgba(15, 18, 25, 0.94)' : 'rgba(17, 19, 23, 0.92)');
    rail.style.setProperty('--geo-rail-toast-text', '#fff');
  }

  function remove() {
    rail?.remove();
    rail = null;
  }

  async function init() {
    if (!chrome?.runtime?.id) return;
    const data = await resolveUiSettings();
    if (!(await isEnabled(data))) {
      remove();
      return;
    }
    ensureRail();
    applyTheme(data);
  }

  return { init, remove };
})();

if (chrome?.runtime?.id) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'getFields') {
      const fields = [...document.querySelectorAll('input, textarea')]
        .filter(isFillableField)
        .map((el, idx) => ({ selector: fieldSelector(el, idx), label: textOf(el) || `字段 ${idx + 1}` }));
      sendResponse(fields);
      return;
    }

    if (msg.type === 'matchSite') {
      const matched = siteMatchesPage(msg.payload.site, msg.payload.tabUrl);
      sendResponse({ matched });
      return;
    }

    if (msg.type === 'smartFill') {
      const filled = fillBySite(msg.payload.site, normalizeMatchingStrategies(msg.payload?.strategies));
      sendResponse({ filled });
      return;
    }

    if (msg.type === 'manualFill') {
      const el = document.querySelector(msg.payload.selector);
      if (!el) {
        sendResponse({ ok: false });
        return;
      }
      setNativeValue(el, msg.payload.value);
      sendResponse({ ok: true });
      return;
    }
  });
}

(async function autoFillOnLoad() {
  try {
    const data = await safeGetGeoData();
    if (data?.settings?.enableAllFeatures === false) return;
    if (data?.settings?.enableWebFill === false) return;
    if (!data?.settings?.autoFillOnLoad) return;
    const site = data.websites?.find(item => item.id === data.activeWebsiteId) || data.websites?.[0];
    if (!site) return;
    if (!siteMatchesPage(site)) return;
    fillBySite(site);
  } catch (error) {
    console.warn('GEOCopilot: auto fill on load failed', error);
  }
})();

quickFill.init().catch(error => console.warn('GEOCopilot: quick fill init failed', error));
pageQuickRail.init().catch(error => console.warn('GEOCopilot: page quick rail init failed', error));

if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.geoData) return;
    quickFill.init().catch(error => console.warn('GEOCopilot: quick fill refresh failed', error));
    pageQuickRail.init().catch(error => console.warn('GEOCopilot: page quick rail refresh failed', error));
  });
}
