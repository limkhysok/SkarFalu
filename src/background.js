// Service worker. Injects the panel only when the user clicks the toolbar
// icon, and only on pages a platform in platforms.config.js supports.
importScripts('/src/platforms/platforms.config.js');

const { Platforms } = self.SEOScraper;

const ISOLATED_WORLD_SCRIPTS = [
  'src/platforms/platforms.config.js',
  'src/core/messaging.js',
  'src/utils/export.js',
  'src/viewmodels/scraper.viewmodel.js',
  'src/views/panel.view.js',
  'src/content-entry.js'
];

async function isAlreadyInjected(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => !!window.__skarfaluInjected
    });
    return !!result;
  } catch (e) {
    return false; // no access to the tab (chrome:// pages, etc.)
  }
}

// ---- Per-site toolbar icon -------------------------------------------------
// Shows the YouTube / TikTok / Instagram / Facebook icon while the tab is on
// that site, and the SkarFalu icon everywhere else. Tab URLs are only
// visible for hosts listed in manifest.json's host_permissions; for any
// other site tab.url is undefined, which correctly falls back to the default.

function defaultTitle(site) {
  return site ? `SkarFalu - ${site.label}` : 'SkarFalu';
}

async function updateIcon(tabId, url) {
  const site = Platforms.detectSite(url);
  try {
    await chrome.action.setIcon({ tabId, path: Platforms.iconFor(site) });
    await chrome.action.setTitle({ tabId, title: defaultTitle(site) });
  } catch (e) {
    // tab closed mid-update, or a page Chrome won't let extensions touch
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // url: SPA / normal navigation; status 'loading': navigating to a host we
  // can't see (no url in changeInfo), which must reset the icon too.
  if (changeInfo.url || changeInfo.status === 'loading') void updateIcon(tabId, tab.url);
});

async function refreshAllTabs() {
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => updateIcon(tab.id, tab.url));
}
chrome.runtime.onInstalled.addListener(refreshAllTabs);
chrome.runtime.onStartup.addListener(refreshAllTabs);

// Briefly badges the toolbar icon so a click on an unsupported page isn't a
// silent no-op. Hovering the icon shows the reason.
async function flag(tab, text, title) {
  const tabId = tab.id;
  await chrome.action.setBadgeBackgroundColor({ tabId, color: '#FF0055' });
  await chrome.action.setBadgeText({ tabId, text });
  await chrome.action.setTitle({ tabId, title: `SkarFalu: ${title}` });
  setTimeout(() => {
    chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
    chrome.action.setTitle({ tabId, title: defaultTitle(Platforms.detectSite(tab.url)) }).catch(() => {});
  }, 4000);
}

function supportedList() {
  return Platforms.all.filter(p => p.enabled).map(p => p.label).join(', ');
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  const platform = tab.url ? Platforms.detect(tab.url) : null;
  if (!platform) {
    await flag(tab, '!', `this page isn't supported. Supported: ${supportedList()}`);
    return;
  }
  if (!platform.enabled) {
    await flag(tab, 'SOON', `${platform.label} support is coming soon`);
    return;
  }
  if (await isAlreadyInjected(tab.id)) return;

  await chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ['src/views/panel.view.css']
  });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ISOLATED_WORLD_SCRIPTS
  });
});
