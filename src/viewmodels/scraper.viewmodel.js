// Runs in the isolated world. Owns all app state (scraped records, scrolling
// state, dedup) and behavior (start/stop scrolling, export), independent of
// both the DOM (View) and the platform-specific scraping (Model). Notifies
// the View of state changes via callbacks instead of touching the DOM itself.
window.SEOScraper = window.SEOScraper || {};

window.SEOScraper.ScraperViewModel = class ScraperViewModel {
  constructor({ onRowAdded, onCountChanged, onDateUpdated, onScrapingStateChanged, onToast } = {}) {
    this.onRowAdded = onRowAdded;
    this.onCountChanged = onCountChanged;
    this.onDateUpdated = onDateUpdated;
    this.onScrapingStateChanged = onScrapingStateChanged;
    this.onToast = onToast;

    this.isScrolling = false;
    this.scrollInterval = null;
    this.videoCount = 0;
    this.processedIds = new Set();
    this.scrapedList = []; // Stores formatted entries for export
    this.recordsById = new Map(); // videoId -> record, for patching in the date once it resolves
    this.lastScrollPos = 0;
    this.samePosCount = 0;
    this.storageKey = null;
  }

  // Listens for scraped data / date updates posted by the Model (MAIN world).
  // Also restores any in-progress scrape for this channel from a previous
  // load, in case the tab was reloaded or navigated away mid-scrape.
  init() {
    this.storageKey = `skarfalu:scrape:${window.SEOScraper.Channel.getHandle()}`;
    this._restore();

    window.addEventListener('message', (event) => {
      const MSG = window.SEOScraper.MSG;
      if (event.data?.type === MSG.SCRAPED_DATA) {
        this.handleScrapedData(event.data.data);
      } else if (event.data?.type === MSG.DATE_UPDATE) {
        this.handleDateUpdate(event.data.id, event.data.date);
      }
    });
  }

  _restore() {
    let saved = null;
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      saved = raw ? JSON.parse(raw) : null;
    } catch (e) {
      // sessionStorage unavailable (private mode, quota, etc.) - just skip restore
    }
    if (!saved || !Array.isArray(saved.records) || saved.records.length === 0) return;

    this.videoCount = saved.videoCount || saved.records.length;
    this.scrapedList = saved.records;
    this.recordsById = new Map(this.scrapedList.filter(r => r.id).map(r => [r.id, r]));
    this.processedIds = new Set(this.recordsById.keys());

    this.scrapedList.forEach(record => this.onRowAdded?.(record));
    this.onCountChanged?.(this.videoCount);
    this.onToast?.(`Restored ${this.scrapedList.length} previously scraped item(s)`);
  }

  _persist() {
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify({
        videoCount: this.videoCount,
        records: this.scrapedList
      }));
    } catch (e) {
      // ignore quota/availability errors - persistence is a nice-to-have
    }
  }

  handleScrapedData(items) {
    items.forEach(item => {
      // Prevent duplicates
      if (item.id && this.processedIds.has(item.id)) return;
      if (item.id) this.processedIds.add(item.id);

      this.videoCount++;

      const record = {
        id: item.id,
        number: this.videoCount,
        url: item.url,
        title: item.title,
        views: item.views,
        date: item.date || 'Loading...'
      };
      this.scrapedList.push(record);
      if (item.id) this.recordsById.set(item.id, record);

      this.onRowAdded?.(record);
    });

    this.onCountChanged?.(this.videoCount);
    this._persist();
  }

  handleDateUpdate(id, date) {
    const record = this.recordsById.get(id);
    if (!record) return;
    record.date = date;
    this.onDateUpdated?.(id, date);
    this._persist();
  }

  toggleScraping() {
    this.isScrolling = !this.isScrolling;

    if (this.isScrolling) {
      this.scrollInterval = setInterval(() => {
        window.scrollBy(0, 800);

        const currentScroll = window.scrollY;

        // Detect bottom of page
        if (currentScroll === this.lastScrollPos) {
          this.samePosCount++;
          if (this.samePosCount >= 3) {
            console.log('⚡ [SEO Scraper] Reached end of page. Scraping complete!');
            this.toggleScraping();
          }
        } else {
          this.samePosCount = 0;
          this.lastScrollPos = currentScroll;
        }
      }, 1800);
    } else {
      clearInterval(this.scrollInterval);
    }

    this.onScrapingStateChanged?.(this.isScrolling);
  }

  exportData() {
    if (this.scrapedList.length === 0) {
      this.onToast?.('No scraped data available to export!');
      return;
    }

    const filename = `yt-shorts-${window.SEOScraper.Channel.getHandle()}.txt`;
    window.SEOScraper.Export.toTxt(this.scrapedList, filename);
    this.onToast?.(`Exported ${filename}`);
  }
};
