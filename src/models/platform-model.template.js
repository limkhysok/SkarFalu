// TEMPLATE - not loaded by the extension. Copy this file into
// src/models/<platform>/<platform>-<content-type>.model.js when adding a new
// platform (e.g. tiktok/tiktok-videos.model.js), then:
//   1. make sure its entry in src/platforms/platforms.config.js points at it
//      (`modelFile`) and uses the same `id` as the register() call below,
//   2. add the file to manifest.json's web_accessible_resources,
//   3. set `enabled: true` in platforms.config.js.
//
// A Model runs in the page's MAIN world and owns everything specific to one
// platform's page: reading its initial data payload, intercepting its
// pagination requests, and normalizing each item into
// { id, title, url, views, date }. It knows nothing about the panel or app
// state - it only ever posts messages, same as youtube-shorts.model.js.
//
// Notes:
// - The panel is injected on toolbar click, i.e. usually AFTER the page has
//   loaded: don't wait for window 'load' without checking
//   document.readyState first.
// - If an item's date (or any field) has to be fetched later, send
//   'Loading...' and post MSG.DATE_UPDATE { id, date } when it resolves.
(() => {
  const MSG = window.SEOScraper.MSG;

  function sendData(items) {
    if (items && items.length > 0) {
      window.postMessage({ type: MSG.SCRAPED_DATA, data: items }, '*');
    }
  }

  function parseItems(rawItems) {
    // TODO: map this platform's raw item shape to { id, title, url, views, date }
    return [];
  }

  function start() {
    // TODO: scrape the initial payload already on the page (embedded JSON
    // state / script tag) and call sendData(parseItems(...)).
    // TODO: intercept window.fetch / XMLHttpRequest for this platform's
    // pagination endpoint and call sendData(...) for each new batch.
  }

  window.SEOScraper.PlatformRegistry.register({
    id: 'platform-content-type', // must match the id in platforms.config.js
    start
  });
})();
