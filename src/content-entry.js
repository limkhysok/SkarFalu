// Entry point for the isolated world. Injects the MAIN-world Model scripts
// (in execution order) so they can read the page's own JS state, then wires
// the ViewModel to the View.
(() => {
  const MAIN_WORLD_SCRIPTS = [
    'src/core/messaging.js',
    'src/utils/format.js',
    'src/models/platform-registry.js',
    'src/models/youtube/youtube-shorts.model.js',
    // TODO: register each new platform's model file here as it's implemented
    // (and add it to manifest.json's web_accessible_resources), e.g.:
    // 'src/models/facebook/facebook-reels.model.js',
    'src/injector-entry.js'
  ];

  MAIN_WORLD_SCRIPTS.forEach(path => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(path);
    script.async = false; // preserve execution order across the injected scripts
    (document.head || document.documentElement).appendChild(script);
  });

  function boot() {
    const view = new window.SEOScraper.PanelView();
    const viewModel = new window.SEOScraper.ScraperViewModel({
      onRowAdded: (record, id) => view.renderRow(record, id),
      onCountChanged: (count) => view.updateCount(count),
      onDateUpdated: (id, date) => view.updateDate(id, date),
      onScrapingStateChanged: (isScrolling) => view.setScrapingState(isScrolling)
    });
    view.viewModel = viewModel;

    viewModel.init();
    view.mount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
