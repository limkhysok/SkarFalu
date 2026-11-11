# SkarFalu

A Chrome extension (Manifest V3) for scraping SEO-relevant data from social short-video platforms, starting with YouTube Shorts.

## Step 1: YouTube Shorts Scraping ✅

Runs on any channel's Shorts tab (`youtube.com/@handle/shorts`). Adds a floating panel that:

- Auto-scrolls the page to load all Shorts on the channel
- Scrapes each Short's **#**, **Title**, **Views**, **Date**, and **Link**
- Fetches the upload date per video (not present in the Shorts tab payload itself) via YouTube's player endpoint
- Exports the scraped table to a `.txt` file named `yt-shorts-@channel_handle.txt`

### Installation

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this folder
4. Pin SkarFalu to the toolbar (puzzle-piece icon → pin)
5. Visit a channel's Shorts tab (`youtube.com/@handle/shorts`) and click the **SkarFalu toolbar icon**. The floating launcher appears; click it to open the panel. Clicking the icon on any other page shows a red **!** badge.

After editing the code, click the reload ↻ button on `chrome://extensions` **and** refresh the YouTube tab.

## Architecture (MVVM)

```
src/
  background.js                 service worker: toolbar click -> detect platform -> inject
  platforms/platforms.config.js SINGLE SOURCE OF TRUTH: every platform's URL pattern, model file, export prefix, handle extractor
  content-entry.js              isolated-world bootstrap: injects the platform's MAIN-world scripts, wires ViewModel <-> View
  injector-entry.js             MAIN-world bootstrap: starts the selected Model
  core/messaging.js             postMessage types shared by both worlds
  models/                       one Model per platform + content type (MAIN world)
    platform-registry.js
    platform-model.template.js  copy this to start a new platform
    youtube/youtube-shorts.model.js
  viewmodels/scraper.viewmodel.js   platform-agnostic state: records, dedup, auto-scroll, export
  views/panel.view.{js,css}         platform-agnostic floating panel
  utils/                        export + formatting helpers
```

- **Model** (`src/models/`) runs in the page's own **MAIN world** so it can read the page's JS state (e.g. `window.ytInitialData`) and intercept `window.fetch`. It normalizes each item into `{ id, title, url, views, date }` and posts it to the isolated world.
- **ViewModel** and **View** run in the content script's **isolated world** and know nothing platform-specific. They get the platform's config entry (export prefix, handle extractor) from `content-entry.js`.
- **Flow:** toolbar click → `background.js` matches the tab URL against `platforms.config.js` (unsupported page → red `!` badge; disabled platform → `SOON` badge) → injects the isolated-world scripts → `content-entry.js` injects `messaging`, `format`, `platform-registry`, **that platform's model file**, and `injector-entry` into the MAIN world → the Model starts posting records.

### Adding a new platform/content type

TikTok Videos, Instagram Reels and Facebook Reels already have entries in `src/platforms/platforms.config.js` with `enabled: false`. Clicking the icon on those pages currently shows a `SOON` badge.

1. Copy `src/models/platform-model.template.js` to the `modelFile` path from the platform's config entry (e.g. `src/models/tiktok/tiktok-videos.model.js`) and implement `start()`. Register it with the **same `id`** as in the config.
2. Add the file to `manifest.json` → `web_accessible_resources[0].resources`. If it's a new site, also add its host to that entry's `matches`.
3. Set `enabled: true` in `platforms.config.js`.

For a platform that has no entry yet, add one to `platforms.config.js` first (`id`, `label`, `urlPattern`, `modelFile`, `filePrefix`, `getHandle`).

### Per-site toolbar icon

The toolbar icon switches to the site's icon on YouTube, TikTok, Instagram and Facebook (any page on them), and shows the SkarFalu icon everywhere else. For a **new website**:

1. Add it to `SITES` in `platforms.config.js`.
2. Add its host to `host_permissions` in `manifest.json` (Chrome hides tab URLs for other hosts).
3. Put `icon16/32/48/128.png` in `icons/platforms/<site-id>/`, either your own artwork or drawn by adding a function to `tools/generate-platform-icons.py` (`python tools/generate-platform-icons.py`, needs `pip install pillow`).

Note: the panel is injected **after** the page has loaded, so a Model must not wait for `window`'s `load` event without checking `document.readyState`.

## TODO — Next Platforms

- [ ] YouTube Videos
- [ ] TikTok Videos / Photos
- [ ] Facebook Reels / Videos
- [ ] Instagram Reels / Photos
- [ ] More platforms as needed
