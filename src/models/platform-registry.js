// Runs in the MAIN world. Each supported platform/content-type (YouTube
// Shorts, later YouTube Videos, Facebook Reels, Instagram Photos, etc.)
// registers itself here; injector-entry.js just detects which one matches
// the current page and starts it. See models/platform-model.template.js for
// the contract new platforms must implement.
window.SEOScraper = window.SEOScraper || {};

window.SEOScraper.PlatformRegistry = (() => {
  const platforms = [];

  function register(platform) {
    platforms.push(platform);
  }

  function detect(location) {
    return platforms.find(platform => platform.matches(location)) || null;
  }

  return { register, detect };
})();
