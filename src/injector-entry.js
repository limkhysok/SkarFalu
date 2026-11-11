// Entry point injected into the MAIN world by content-entry.js. Starts the
// Model that content-entry.js selected (passed via a data attribute on <html>).
(() => {
  const id = document.documentElement.dataset.skarfaluPlatform;
  const platform = window.SEOScraper.PlatformRegistry.get(id);
  if (platform) {
    platform.start();
  } else {
    console.warn(`[SkarFalu] No model registered for platform "${id}"`);
  }
})();
