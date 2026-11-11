// Model for youtube.com/@handle/shorts. Runs in the MAIN world so it can read
// window.ytInitialData and intercept window.fetch directly on the page.
// Normalizes YouTube's payload shapes into { id, title, url, views, date }
// and reports them back to the isolated world via window.postMessage.
(() => {
  const MSG = window.SEOScraper.MSG;
  const { stripViewsSuffix, formatDate } = window.SEOScraper.Format;

  function sendData(items) {
    if (items && items.length > 0) {
      window.postMessage({ type: MSG.SCRAPED_DATA, data: items }, '*');
    }
  }

  // The Shorts tab payload (shortsLockupViewModel / reelItemRenderer) never includes an
  // upload date, so it has to be fetched separately per video via the player endpoint.
  const dateCache = new Map();
  const dateQueue = [];
  let activeDateFetches = 0;
  const MAX_CONCURRENT_DATE_FETCHES = 4;

  function getInnertubeAuth() {
    try {
      return {
        apiKey: window.ytcfg?.get?.('INNERTUBE_API_KEY'),
        context: window.ytcfg?.get?.('INNERTUBE_CONTEXT')
      };
    } catch (e) {
      return { apiKey: null, context: null };
    }
  }

  async function fetchPublishDate(videoId) {
    const { apiKey, context } = getInnertubeAuth();
    if (!apiKey || !context) return 'N/A';
    try {
      const res = await window.fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, videoId })
      });
      const data = await res.json();
      const micro = data?.microformat?.playerMicroformatRenderer;
      const raw = micro?.publishDate || micro?.uploadDate || null;
      return raw ? formatDate(raw) : 'N/A';
    } catch (e) {
      return 'N/A';
    }
  }

  function processDateQueue() {
    while (activeDateFetches < MAX_CONCURRENT_DATE_FETCHES && dateQueue.length > 0) {
      const videoId = dateQueue.shift();
      activeDateFetches++;
      fetchPublishDate(videoId).then(date => {
        dateCache.set(videoId, date);
        window.postMessage({ type: MSG.DATE_UPDATE, id: videoId, date }, '*');
      }).finally(() => {
        activeDateFetches--;
        processDateQueue();
      });
    }
  }

  function queueDateFetch(videoId) {
    if (!videoId || dateCache.has(videoId)) return;
    dateCache.set(videoId, null); // reserve so it isn't queued twice
    dateQueue.push(videoId);
    processDateQueue();
  }

  // Parses Shorts Lockup Models
  function parseItems(itemsArray) {
    const extractedList = [];
    itemsArray.forEach(item => {
      const lockup = item.richItemRenderer?.content?.shortsLockupViewModel
                  || item.shortsLockupViewModel;
      const legacy = item.richItemRenderer?.content?.reelItemRenderer
                  || item.gridVideoRenderer;

      if (lockup) {
        const videoId = lockup.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId
                     || lockup.entityId?.replace('shorts-shelf-item-', '')
                     || '';
        const title = lockup.overlayMetadata?.primaryText?.content || 'N/A';
        const views = stripViewsSuffix(lockup.overlayMetadata?.secondaryText?.content);

        extractedList.push({
          id: videoId,
          title: title,
          url: videoId ? `https://www.youtube.com/shorts/${videoId}` : 'N/A',
          views: views,
          date: 'Loading...'
        });
      } else if (legacy) {
        const videoId = legacy.videoId;
        extractedList.push({
          id: videoId,
          title: legacy.headline?.simpleText || legacy.title?.runs?.[0]?.text || 'N/A',
          url: videoId ? `https://www.youtube.com/shorts/${videoId}` : 'N/A',
          views: stripViewsSuffix(legacy.viewsCountText?.simpleText),
          date: 'Loading...'
        });
      }
    });
    extractedList.forEach(item => queueDateFetch(item.id));
    return extractedList;
  }

  function getSelectedTabItems(browseData) {
    const tabs = browseData?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const shortsTab = tabs.find(tab => tab.tabRenderer?.selected);
    return shortsTab?.tabRenderer?.content?.richGridRenderer?.contents || [];
  }

  function scrapeInitialPayload() {
    try {
      // After in-app (SPA) navigation, window.ytInitialData still holds the
      // FIRST page loaded in the tab, so prefer the live data on the visible
      // <ytd-browse> element and fall back to ytInitialData.
      const browseEl = document.querySelector('ytd-browse:not([hidden])');
      let items = getSelectedTabItems(browseEl?.data);
      if (items.length === 0) items = getSelectedTabItems(window.ytInitialData);

      sendData(parseItems(items));
    } catch (e) {
      console.log('Error parsing initial data:', e);
    }
  }

  function start() {
    // 1. Scrape Initial Page Payload (First 30 Videos).
    // The panel is injected on toolbar click, usually long after 'load' has
    // fired, so only wait for it if the page is genuinely still loading.
    if (document.readyState === 'complete') {
      setTimeout(scrapeInitialPayload, 300);
    } else {
      window.addEventListener('load', () => setTimeout(scrapeInitialPayload, 1500), { once: true });
    }

    // 2. Intercept Fetch API for Continuations (Videos 31 to End)
    const origFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await origFetch.apply(this, args);
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

      if (url.includes('/youtubei/v1/browse')) {
        const clone = response.clone();
        clone.json().then(data => {
          const actions = data?.onResponseReceivedActions || [];
          actions.forEach(action => {
            const items = action?.appendContinuationItemsAction?.continuationItems || [];
            const scrapedBatch = parseItems(items);
            sendData(scrapedBatch);
          });
        }).catch(() => {});
      }

      return response;
    };
  }

  window.SEOScraper.PlatformRegistry.register({
    id: 'youtube-shorts', // must match the id in platforms.config.js
    start
  });
})();
