chrome.runtime.onInstalled.addListener(async () => {
  if (chrome.sidePanel?.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

chrome.action.onClicked?.addListener(async (tab) => {
  if (chrome.sidePanel?.open && tab?.windowId !== undefined) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'toggleSidePanel') return;
  const { enabled, tabId, windowId } = message.payload || {};
  (async () => {
    if (!chrome.sidePanel?.setOptions) {
      sendResponse({ ok: false, error: 'sidePanel API not available' });
      return;
    }
    const targetTabId = tabId ?? sender?.tab?.id;
    if (targetTabId === undefined) {
      sendResponse({ ok: false, error: 'tabId missing' });
      return;
    }
    await chrome.sidePanel.setOptions({ tabId: targetTabId, path: 'popup.html', enabled: !!enabled });
    if (enabled && chrome.sidePanel?.open && windowId !== undefined) {
      await chrome.sidePanel.open({ windowId });
    }
    sendResponse({ ok: true });
  })().catch(error => {
    sendResponse({ ok: false, error: error?.message || String(error) });
  });
  return true;
});
