// Shared message-type constants for the window.postMessage bridge between the
// isolated-world content script (ViewModel/View) and the MAIN-world page script
// (Model). This exact file is loaded into BOTH worlds, so each world gets its
// own independent copy of window.SEOScraper - that's expected, not a bug.
window.SEOScraper = window.SEOScraper || {};

window.SEOScraper.MSG = Object.freeze({
  SCRAPED_DATA: 'YT_SEO_SCRAPED_DATA',
  DATE_UPDATE: 'YT_SEO_DATE_UPDATE'
});
