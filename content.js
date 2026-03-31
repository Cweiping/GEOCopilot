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
