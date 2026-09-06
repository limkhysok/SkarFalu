// Service worker. Injects the panel only when the user clicks the toolbar
// icon, instead of it auto-loading on every matching page.
const SHORTS_URL = /^https:\/\/www\.youtube\.com\/@[^/]+\/shorts/;

const ISOLATED_WORLD_SCRIPTS = [
  'src/core/messaging.js',
  'src/utils/export.js',
  'src/utils/channel.js',
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

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || !SHORTS_URL.test(tab.url)) return;
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
