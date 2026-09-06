# ScraperSEO

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
4. Visit a channel's Shorts tab and click the **SEO** launcher button

## Architecture (MVVM)

The extension is split across two JS worlds, each with its own MVVM-ish layering:

- **Model** (`src/models/`) — runs in the page's own **MAIN world** so it can read the page's JS state (e.g. `window.ytInitialData`) and intercept `window.fetch`. Each platform + content type (YouTube Shorts, later YouTube Videos, Facebook Reels, etc.) is its own file that normalizes that site's data into `{ id, title, url, views, date }` and registers itself with `PlatformRegistry` (`src/models/platform-registry.js`). `src/injector-entry.js` detects which registered Model matches the current page and starts it.
- **ViewModel** (`src/viewmodels/scraper.viewmodel.js`) — runs in the content script's **isolated world**. Owns all state (scraped records, dedup, scroll/export logic), independent of both the DOM and the platform-specific scraping. Talks to the Model only via `window.postMessage` (message types in `src/core/messaging.js`).
- **View** (`src/views/panel.view.js` + `panel.view.css`) — the floating panel's DOM, bound to the ViewModel through callbacks; never touches scraping logic or app state directly.
- `src/content-entry.js` is the isolated-world bootstrap: it injects the MAIN-world Model scripts and wires the ViewModel to the View.

### Adding a new platform/content type

1. Copy `src/models/platform-model.template.js` to `src/models/<platform>/<platform>-<content-type>.model.js` (e.g. `src/models/facebook/facebook-reels.model.js`) and implement `matches()` + `start()`.
2. List the new file in `src/content-entry.js`'s `MAIN_WORLD_SCRIPTS` array (order matters: after `platform-registry.js`, before `injector-entry.js`).
3. Add the new file to `manifest.json`'s `web_accessible_resources`, and add the site's URL pattern to `content_scripts[0].matches` and to the same `web_accessible_resources` entry's `matches`.

The ViewModel and View are already platform-agnostic and need no changes.

## TODO — Next Platforms

- [ ] YouTube Videos
- [ ] TikTok Videos / Photos
- [ ] Facebook Reels / Videos
- [ ] Instagram Reels / Photos
- [ ] More platforms as needed
