// TEMPLATE - not loaded by the extension. Copy this file into
// src/models/<platform>/<platform>-<content-type>.model.js when adding a new
// platform (e.g. facebook/facebook-reels.model.js, tiktok/tiktok-videos.model.js),
// then wire it up in manifest.json (see the comments there) alongside
// youtube/youtube-shorts.model.js.
//
// A Model owns everything that's specific to one platform's page: reading its
// initial data payload, intercepting its pagination/continuation requests,
// and normalizing each item into { id, title, url, views, date }. It knows
// nothing about the DOM panel or app state - it only ever calls sendData()
// and window.postMessage, same as youtube-shorts.model.js.
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
    // TODO: scrape the initial payload (e.g. window.__INITIAL_STATE__) and
    // call sendData(parseItems(...)).
    // TODO: intercept window.fetch/XHR for this platform's pagination
    // endpoint and call sendData(...) for each new batch.
  }

  window.SEOScraper.PlatformRegistry.register({
    id: 'platform-content-type', // e.g. 'facebook-reels'
    matches(location) {
      // TODO: return true when this model should handle the current page
      return false;
    },
    start
  });
})();
