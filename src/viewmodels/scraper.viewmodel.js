// Runs in the isolated world. Owns all app state (scraped records, scrolling
// state, dedup) and behavior (start/stop scrolling, export), independent of
// both the DOM (View) and the platform-specific scraping (Model). Notifies
// the View of state changes via callbacks instead of touching the DOM itself.
window.SEOScraper = window.SEOScraper || {};

window.SEOScraper.ScraperViewModel = class ScraperViewModel {
  constructor({ onRowAdded, onCountChanged, onDateUpdated, onScrapingStateChanged } = {}) {
    this.onRowAdded = onRowAdded;
    this.onCountChanged = onCountChanged;
    this.onDateUpdated = onDateUpdated;
    this.onScrapingStateChanged = onScrapingStateChanged;

    this.isScrolling = false;
    this.scrollInterval = null;
    this.videoCount = 0;
    this.processedIds = new Set();
    this.scrapedList = []; // Stores formatted entries for export
    this.recordsById = new Map(); // videoId -> record, for patching in the date once it resolves
    this.lastScrollPos = 0;
    this.samePosCount = 0;
  }

  // Listens for scraped data / date updates posted by the Model (MAIN world).
  init() {
    window.addEventListener('message', (event) => {
      const MSG = window.SEOScraper.MSG;
      if (event.data?.type === MSG.SCRAPED_DATA) {
        this.handleScrapedData(event.data.data);
      } else if (event.data?.type === MSG.DATE_UPDATE) {
        this.handleDateUpdate(event.data.id, event.data.date);
      }
    });
  }

  handleScrapedData(items) {
    items.forEach(item => {
      // Prevent duplicates
      if (item.id && this.processedIds.has(item.id)) return;
      if (item.id) this.processedIds.add(item.id);

      this.videoCount++;

      const record = {
        number: this.videoCount,
        url: item.url,
        title: item.title,
        views: item.views,
        date: item.date || 'Loading...'
      };
      this.scrapedList.push(record);
      if (item.id) this.recordsById.set(item.id, record);

      this.onRowAdded?.(record, item.id);
    });

    this.onCountChanged?.(this.videoCount);
  }

  handleDateUpdate(id, date) {
    const record = this.recordsById.get(id);
    if (!record) return;
    record.date = date;
    this.onDateUpdated?.(id, date);
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
    const filename = `yt-shorts-${window.SEOScraper.Channel.getHandle()}.txt`;
    window.SEOScraper.Export.toTxt(this.scrapedList, filename);
  }
};
