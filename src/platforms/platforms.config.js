// SINGLE SOURCE OF TRUTH for every supported (or planned) platform.
//
// Loaded in two places:
//   - the service worker (background.js, via importScripts) to decide whether
//     a toolbar click should inject the panel, and
//   - the isolated content-script world (content-entry.js) to pick which
//     MAIN-world model file to load and to name exports.
// So it must stay plain data + pure functions: no DOM, no chrome.* APIs.
//
// To add a platform: add an entry here (enabled: false while in progress),
// write its model file (copy src/models/platform-model.template.js), list
// that file in manifest.json's web_accessible_resources, then flip
// enabled: true. Nothing else needs to change.
(() => {
  const root = globalThis;
  root.SEOScraper = root.SEOScraper || {};

  // Pulls the first capture group of `pattern` out of `url`, or a fallback.
  const captureHandle = (pattern, prefix = '') => (url) => {
    const match = pattern.exec(url);
    return match ? `${prefix}${match[1]}` : 'unknown';
  };

  const PLATFORMS = [
    {
      id: 'youtube-shorts',
      label: 'YouTube Shorts',
      enabled: true,
      // youtube.com/@handle/shorts
      urlPattern: /^https:\/\/www\.youtube\.com\/@[^/?#]+\/shorts/,
      modelFile: 'src/models/youtube/youtube-shorts.model.js',
      filePrefix: 'yt-shorts',
      getHandle: captureHandle(/^https:\/\/www\.youtube\.com\/(@[^/?#]+)/)
    },
    {
      id: 'tiktok-videos',
      label: 'TikTok Videos',
      enabled: false, // TODO: implement src/models/tiktok/tiktok-videos.model.js
      // tiktok.com/@handle (profile grid)
      urlPattern: /^https:\/\/www\.tiktok\.com\/@[^/?#]+\/?(?:[?#]|$)/,
      modelFile: 'src/models/tiktok/tiktok-videos.model.js',
      filePrefix: 'tiktok',
      getHandle: captureHandle(/^https:\/\/www\.tiktok\.com\/(@[^/?#]+)/)
    },
    {
      id: 'instagram-reels',
      label: 'Instagram Reels',
      enabled: false, // TODO: implement src/models/instagram/instagram-reels.model.js
      // instagram.com/handle/reels
      urlPattern: /^https:\/\/www\.instagram\.com\/[^/?#]+\/reels/,
      modelFile: 'src/models/instagram/instagram-reels.model.js',
      filePrefix: 'ig-reels',
      getHandle: captureHandle(/^https:\/\/www\.instagram\.com\/([^/?#]+)/, '@')
    },
    {
      id: 'facebook-reels',
      label: 'Facebook Reels',
      enabled: false, // TODO: implement src/models/facebook/facebook-reels.model.js
      // facebook.com/handle/reels
      urlPattern: /^https:\/\/www\.facebook\.com\/[^/?#]+\/reels/,
      modelFile: 'src/models/facebook/facebook-reels.model.js',
      filePrefix: 'fb-reels',
      getHandle: captureHandle(/^https:\/\/www\.facebook\.com\/([^/?#]+)/)
    }
  ];

  // Whole websites (any page on them, not just scrapable ones), used to swap
  // the toolbar icon. Icons live in icons/platforms/<id>/icon{16,32,48,128}.png
  // (generate with tools/generate-platform-icons.py, or drop in your own).
  // A new site also needs its host in manifest.json's host_permissions,
  // otherwise Chrome hides the tab URL and the default icon is shown.
  const SITES = [
    { id: 'youtube', label: 'YouTube', hostPattern: /^https:\/\/(www\.|m\.)?youtube\.com\// },
    { id: 'tiktok', label: 'TikTok', hostPattern: /^https:\/\/(www\.)?tiktok\.com\// },
    { id: 'instagram', label: 'Instagram', hostPattern: /^https:\/\/(www\.)?instagram\.com\// },
    { id: 'facebook', label: 'Facebook', hostPattern: /^https:\/\/(www\.|web\.|m\.)?facebook\.com\// }
  ];

  const ICON_SIZES = [16, 32, 48, 128];
  const iconSet = (dir) => Object.fromEntries(ICON_SIZES.map(size => [size, `${dir}/icon${size}.png`]));

  root.SEOScraper.Platforms = Object.freeze({
    all: PLATFORMS,
    sites: SITES,
    defaultIcon: iconSet('icons'),

    // Website `url` belongs to (e.g. youtube.com home), or null.
    detectSite(url) {
      return (url && SITES.find(s => s.hostPattern.test(url))) || null;
    },

    iconFor(site) {
      return site ? iconSet(`icons/platforms/${site.id}`) : this.defaultIcon;
    },

    // Platform whose page `url` is, enabled or not; null if none.
    detect(url) {
      return PLATFORMS.find(p => p.urlPattern.test(url)) || null;
    },

    byId(id) {
      return PLATFORMS.find(p => p.id === id) || null;
    }
  });
})();
