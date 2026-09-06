// Entry point injected into the MAIN world by content-entry.js. Detects
// which registered platform Model matches the current page and starts it.
(() => {
  const platform = window.SEOScraper.PlatformRegistry.detect(window.location);
  if (platform) platform.start();
})();
