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
    ensureNodes();
    activeSite = await getActiveSiteFromStorage();
    renderMarkers(activeSite);
    observer = new MutationObserver(() => debounceRender(activeSite));
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: false });
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
