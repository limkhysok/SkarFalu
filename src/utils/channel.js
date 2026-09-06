// Derives the current channel/account handle from the page URL, for naming
// exported files. YouTube's "@handle" convention today; platforms with a
// different URL shape (e.g. Facebook, TikTok) can add their own extractor
// here once implemented.
window.SEOScraper = window.SEOScraper || {};

window.SEOScraper.Channel = {
  // "/@CrazyZoomXYZ/shorts" -> "@CrazyZoomXYZ"
  getHandle() {
    const match = /^\/(@[^/]+)/.exec(window.location.pathname);
    return match ? match[1] : 'unknown_channel';
  }
};
