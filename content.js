function textOf(el) {
  const id = el.id;
  const name = el.name || '';
  const placeholder = el.placeholder || '';
  const aria = el.getAttribute('aria-label') || '';
  const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.innerText || '' : '';
  return `${name} ${placeholder} ${aria} ${label}`.toLowerCase();
}

function setNativeValue(el, value) {
  el.focus();
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function getFieldMappings(site) {
  return [
    { key: 'name', label: '网站名称', keys: ['网站名称', 'name', 'title', '站点名称', '网站名'], value: site.name },
    { key: 'category', label: '分类', keys: ['分类', 'category', 'type'], value: site.category },
    { key: 'url', label: '网站地址', keys: ['网址', 'url', 'link', 'site', 'homepage', 'domain', '网站地址'], value: site.url },
    { key: 'email', label: '联系邮箱', keys: ['邮箱', 'email', 'mail', '联系'], value: site.email },
    { key: 'shortDesc', label: '简短描述', keys: ['简短描述', 'short', 'slogan', 'summary', '一句话'], value: site.shortDesc },
    { key: 'longDesc', label: '详细描述', keys: ['详细描述', 'long', 'detail', 'description', '内容介绍', '简介', '描述'], value: site.longDesc || site.shortDesc },
    { key: 'tags', label: '关键词标签', keys: ['关键词', 'tags', 'keyword'], value: (site.tags || []).join(', ') },
  ];
}

function matchFieldByHint(hint, site) {
  for (const item of getFieldMappings(site)) {
    if (item.value && item.keys.some(k => hint.includes(k.toLowerCase()))) {
      return item;
    }
  }
  return null;
}

function findValueByHint(hint, site) {
  return matchFieldByHint(hint, site)?.value || '';
}

function fillBySite(site) {
  const candidates = [...document.querySelectorAll('input, textarea')].filter(el => !el.disabled && el.type !== 'hidden');
  let filled = 0;

  for (const el of candidates) {
    const hint = textOf(el);
    const value = findValueByHint(hint, site);
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

  function remove() {
    markers.forEach(({ btn }) => btn.remove());
    markers.length = 0;
    panel?.remove();
    panel = null;
    observer?.disconnect();
    observer = null;
    activeField = null;
  }

  function hidePanel() {
    if (panel) panel.style.display = 'none';
  }

  function positionNearField(element, node, offsetX = 0, offsetY = 0) {
    if (!element || !node || !document.body.contains(element)) return;
    const rect = element.getBoundingClientRect();
    node.style.position = 'fixed';
    node.style.left = `${Math.max(8, rect.right - node.offsetWidth - 6 + offsetX)}px`;
    node.style.top = `${Math.max(8, rect.top + 6 + offsetY)}px`;
    node.style.zIndex = '2147483647';
  }

  function positionAllMarkers() {
    markers.forEach(({ field, btn }) => positionNearField(field, btn));
    if (panel?.style.display !== 'none' && activeField) {
      positionNearField(activeField, panel, 0, 24);
    }
  }

  function availableSiteFields(site) {
    if (!site) return [];
    return getFieldMappings(site).filter(item => !!item.value);
  }

  async function getActiveSiteFromStorage() {
    const store = await chrome.storage.local.get('geoData');
    const data = store.geoData;
    if (!data?.websites?.length) return null;
    return data.websites.find(item => item.id === data.activeWebsiteId) || data.websites[0];
  }

  function buildPanelItems(site) {
    if (!panel) return;
    panel.innerHTML = '';

    const header = document.createElement('div');
    header.textContent = '快速填写';
    header.style.fontWeight = '600';
    header.style.fontSize = '12px';
    header.style.marginBottom = '4px';
    panel.appendChild(header);

    const fillAllBtn = document.createElement('button');
    fillAllBtn.type = 'button';
    fillAllBtn.textContent = '智能填充整页';
    fillAllBtn.className = 'geo-quick-fill-btn geo-quick-fill-primary';
    fillAllBtn.addEventListener('click', e => {
      e.preventDefault();
      if (!site) return;
      fillBySite(site);
      hidePanel();
    });
    panel.appendChild(fillAllBtn);

    for (const item of availableSiteFields(site)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'geo-quick-fill-btn';
      btn.innerHTML = `<strong>${item.label}:</strong> <span>${item.value}</span>`;
      btn.dataset.key = item.key;
      btn.addEventListener('click', e => {
        e.preventDefault();
        if (!activeField) return;
        setNativeValue(activeField, item.value);
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

      .geo-quick-fill-btn strong {
        font-weight: 600;
      }

      .geo-quick-fill-btn span {
        color: #5d6475;
      }

      .geo-quick-fill-primary {
        text-align: center;
        background: #f4f7ff;
        color: #1f3f9f;
        font-weight: 600;
      }
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

  function addMarkerForField(field, mapped) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'geo-quick-fill-trigger';
    btn.title = `快速填写：${mapped.label}`;
    btn.textContent = '✦';

    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', async e => {
      e.preventDefault();
      e.stopPropagation();
      activeField = field;
      activeSite = await getActiveSiteFromStorage();
      if (!activeSite) return;
      buildPanelItems(activeSite);
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      if (panel.style.display !== 'none') positionNearField(activeField, panel, 0, 24);
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

    const candidates = [...document.querySelectorAll('input, textarea')]
      .filter(el => !el.disabled && el.type !== 'hidden' && document.body.contains(el));

    clearMarkers();
    for (const field of candidates) {
      const mapped = matchFieldByHint(textOf(field), site);
      if (!mapped?.value) continue;
      addMarkerForField(field, mapped);
    }
  }

  function debounceRender(site) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => renderMarkers(site), 120);
  }

  async function init() {
    ensureNodes();
    activeSite = await getActiveSiteFromStorage();
    renderMarkers(activeSite);

    observer = new MutationObserver(() => debounceRender(activeSite));
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: false });
  }

  return { init, remove };
})();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'getFields') {
    const fields = [...document.querySelectorAll('input, textarea')]
      .filter(el => !el.disabled && el.type !== 'hidden')
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
    const filled = fillBySite(msg.payload.site);
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

(async function autoFillOnLoad() {
  const store = await chrome.storage.local.get('geoData');
  const data = store.geoData;
  if (!data?.settings?.autoFillOnLoad) return;
  const site = data.websites?.find(item => item.id === data.activeWebsiteId) || data.websites?.[0];
  if (!site) return;
  if (!siteMatchesPage(site)) return;
  fillBySite(site);
})();

quickFill.init();
