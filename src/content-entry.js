// Entry point for the isolated world. Picks the platform for this page from
// platforms.config.js, injects the MAIN-world scripts for it (in execution
// order) so its Model can read the page's own JS state, then wires the
// ViewModel to the View.
(() => {
  const platform = window.SEOScraper.Platforms.detect(window.location.href);
  if (!platform || !platform.enabled) return; // background.js already filters; just a guard

  window.__skarfaluInjected = true; // lets background.js detect an already-running instance

  // The DOM is shared between worlds, so this is how injector-entry.js (MAIN
  // world) learns which registered Model to start.
  document.documentElement.dataset.skarfaluPlatform = platform.id;

  const MAIN_WORLD_SCRIPTS = [
    'src/core/messaging.js',
    'src/utils/format.js',
    'src/models/platform-registry.js',
    platform.modelFile,
    'src/injector-entry.js'
  ];

  MAIN_WORLD_SCRIPTS.forEach(path => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(path);
    script.async = false; // preserve execution order across the injected scripts
    (document.head || document.documentElement).appendChild(script);
  });

  function boot() {
    // Site icon shown after the "SkarFalu" title in the panel header. Must be
    // listed in manifest.json's web_accessible_resources for the page to load it.
    const site = window.SEOScraper.Platforms.detectSite(window.location.href);
    const view = new window.SEOScraper.PanelView({
      platformLabel: platform.label,
      platformIconUrl: site ? chrome.runtime.getURL(window.SEOScraper.Platforms.iconFor(site)[48]) : null
    });
    const viewModel = new window.SEOScraper.ScraperViewModel({
      platform,
      onRowAdded: (record) => view.renderRow(record),
      onCountChanged: (count) => view.updateCount(count),
      onDateUpdated: (id, date) => view.updateDate(id, date),
      onScrapingStateChanged: (isScrolling) => view.setScrapingState(isScrolling),
      onToast: (message) => view.showToast(message)
    });
    view.viewModel = viewModel;

    // mount() first: init() may synchronously replay a restored scrape via
    // onRowAdded, which needs the table already in the DOM.
    view.mount();
    viewModel.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
