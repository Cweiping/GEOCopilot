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

function findValueByHint(hint, site) {
  const map = [
    { keys: ['网站名称', 'name', 'title', '站点名称', '网站名'], value: site.name },
    { keys: ['分类', 'category', 'type'], value: site.category },
    { keys: ['网址', 'url', 'link', 'site', 'homepage', 'domain', '网站地址'], value: site.url },
    { keys: ['邮箱', 'email', 'mail', '联系'], value: site.email },
    { keys: ['简短描述', 'short', 'slogan', 'summary', '一句话'], value: site.shortDesc },
    { keys: ['详细描述', 'long', 'detail', 'description', '内容介绍', '简介', '描述'], value: site.longDesc || site.shortDesc },
    { keys: ['关键词', 'tags', 'keyword'], value: (site.tags || []).join(', ') },
  ];
  for (const item of map) {
    if (item.keys.some(k => hint.includes(k.toLowerCase())) && item.value) return item.value;
  }
  return '';
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
  let trigger = null;
  let panel = null;
  let activeField = null;
  let activeSite = null;

  function remove() {
    trigger?.remove();
    panel?.remove();
    trigger = null;
    panel = null;
  }

  function hidePanel() {
    if (panel) panel.style.display = 'none';
  }

  function positionNearField(element, node, offsetX = 0, offsetY = 0) {
    if (!element || !node) return;
    const rect = element.getBoundingClientRect();
    node.style.position = 'fixed';
    node.style.left = `${Math.max(8, rect.right - node.offsetWidth - 8 + offsetX)}px`;
    node.style.top = `${Math.max(8, rect.top + (rect.height - node.offsetHeight) / 2 + offsetY)}px`;
    node.style.zIndex = '2147483647';
  }

  function availableSiteFields(site) {
    if (!site) return [];
    const rows = [
      ['name', '网站名称', site.name],
      ['category', '分类', site.category],
      ['url', '网站地址', site.url],
      ['email', '联系邮箱', site.email],
      ['shortDesc', '简短描述', site.shortDesc],
      ['longDesc', '详细描述', site.longDesc || site.shortDesc],
      ['tags', '关键词标签', (site.tags || []).join(', ')],
    ];
    return rows.filter(([, , value]) => !!value);
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
    header.style.marginBottom = '6px';
    panel.appendChild(header);

    const fillAllBtn = document.createElement('button');
    fillAllBtn.type = 'button';
    fillAllBtn.textContent = '智能填充整页';
    fillAllBtn.className = 'geo-quick-fill-btn';
    fillAllBtn.addEventListener('click', e => {
      e.preventDefault();
      if (!site) return;
      fillBySite(site);
      hidePanel();
    });
    panel.appendChild(fillAllBtn);

    for (const [key, label, value] of availableSiteFields(site)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'geo-quick-fill-btn';
      btn.textContent = `填写${label}`;
      btn.dataset.key = key;
      btn.addEventListener('click', e => {
        e.preventDefault();
        if (!activeField) return;
        setNativeValue(activeField, value);
        hidePanel();
      });
      panel.appendChild(btn);
    }
  }

  function ensureNodes() {
    if (trigger && panel) return;

    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.title = '选择内容填充';
    trigger.textContent = '✦';
    trigger.style.display = 'none';
    trigger.style.width = '28px';
    trigger.style.height = '28px';
    trigger.style.border = '1px solid #dbe0eb';
    trigger.style.borderRadius = '6px';
    trigger.style.cursor = 'pointer';
    trigger.style.background = '#2962ff';
    trigger.style.color = '#fff';
    trigger.style.boxShadow = '0 2px 8px rgba(0, 0, 0, .15)';
    trigger.style.fontSize = '14px';
    document.body.appendChild(trigger);

    panel = document.createElement('div');
    panel.style.display = 'none';
    panel.style.minWidth = '140px';
    panel.style.maxWidth = '220px';
    panel.style.background = '#fff';
    panel.style.border = '1px solid #dbe0eb';
    panel.style.borderRadius = '8px';
    panel.style.padding = '8px';
    panel.style.boxShadow = '0 6px 16px rgba(0, 0, 0, .18)';
    panel.style.fontSize = '12px';
    panel.style.lineHeight = '1.4';
    panel.style.gap = '6px';
    panel.style.flexDirection = 'column';
    panel.style.display = 'none';
    document.body.appendChild(panel);

    const style = document.createElement('style');
    style.textContent = `
      .geo-quick-fill-btn {
        width: 100%;
        margin: 0 0 6px;
        border: 1px solid #dbe0eb;
        border-radius: 6px;
        background: #f6f8ff;
        color: #1f3f9f;
        font-size: 12px;
        padding: 6px;
        cursor: pointer;
      }
      .geo-quick-fill-btn:last-child {
        margin-bottom: 0;
      }
    `;
    document.head.appendChild(style);

    trigger.addEventListener('mousedown', e => e.preventDefault());
    trigger.addEventListener('click', async e => {
      e.preventDefault();
      e.stopPropagation();
      if (!activeField) return;
      activeSite = await getActiveSiteFromStorage();
      buildPanelItems(activeSite);
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      if (panel.style.display !== 'none') positionNearField(activeField, panel, 0, 36);
    });

    document.addEventListener('scroll', () => {
      if (trigger?.style.display !== 'none' && activeField) positionNearField(activeField, trigger);
      if (panel?.style.display !== 'none' && activeField) positionNearField(activeField, panel, 0, 36);
    }, true);
    window.addEventListener('resize', () => {
      if (trigger?.style.display !== 'none' && activeField) positionNearField(activeField, trigger);
      if (panel?.style.display !== 'none' && activeField) positionNearField(activeField, panel, 0, 36);
    });
    document.addEventListener('mousedown', e => {
      const target = e.target;
      if (!panel || !trigger) return;
      if (panel.contains(target) || trigger.contains(target)) return;
      hidePanel();
    });
  }

  async function onFieldFocus(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (target.disabled || target.type === 'hidden') return;

    ensureNodes();
    activeField = target;
    trigger.style.display = 'block';
    positionNearField(target, trigger);
    hidePanel();
  }

  function onFieldBlur(event) {
    if (event.target !== activeField) return;
    setTimeout(() => {
      const focusInsideQuickFill = trigger?.contains(document.activeElement) || panel?.contains(document.activeElement);
      if (focusInsideQuickFill) return;
      trigger.style.display = 'none';
      hidePanel();
    }, 120);
  }

  return { onFieldFocus, onFieldBlur, remove };
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

document.addEventListener('focusin', quickFill.onFieldFocus);
document.addEventListener('focusout', quickFill.onFieldBlur);
