// Runs in the MAIN world. Each platform Model file registers its start()
// here under the same id it has in src/platforms/platforms.config.js;
// injector-entry.js then starts the one content-entry.js selected. See
// models/platform-model.template.js for the contract.
window.SEOScraper = window.SEOScraper || {};

window.SEOScraper.PlatformRegistry = (() => {
  const platforms = new Map();

  function register(platform) {
    platforms.set(platform.id, platform);
  }

  function get(id) {
    return platforms.get(id) || null;
  }

  return { register, get };
})();
