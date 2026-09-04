// 1. Inject interceptor script into main DOM context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injector.js');
(document.head || document.documentElement).appendChild(script);

let isScrolling = false;
let scrollInterval = null;
let videoCount = 0;
const processedIds = new Set();
const scrapedList = []; // Stores formatted entries for export
const rowsById = new Map(); // videoId -> { record, dateCell } for patching in the date once it resolves
let lastScrollPos = 0;
let samePosCount = 0;

// 2. Build Dashboard Overlay with Export Button (starts collapsed into a small launcher tab)
function createUI() {
  if (document.getElementById('yt-seo-panel')) return;

  const launcher = document.createElement('button');
  launcher.id = 'yt-seo-launcher';
  launcher.type = 'button';
  launcher.title = 'Open SEO Shorts Scraper';
  launcher.textContent = 'SEO';
  document.body.appendChild(launcher);

  const panel = document.createElement('div');
  panel.id = 'yt-seo-panel';
  panel.classList.add('hidden');
  panel.innerHTML = `
    <div class="panel-header">
      <span class="panel-title"><strong>SEO Shorts Scraper</strong></span>
      <div class="panel-actions">
        <button id="yt-seo-export-btn" class="export-btn">Export TXT</button>
        <button id="yt-seo-toggle-btn" class="start-btn">Start Scraping</button>
        <button id="yt-seo-minimize-btn" class="minimize-btn" title="Minimize">─</button>
      </div>
    </div>
    <div class="panel-stats">Total Scraped: <span id="yt-seo-count">0</span></div>
    <div class="panel-table-wrapper">
      <table id="yt-seo-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Views</th>
            <th>Date</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody id="yt-seo-tbody"></tbody>
      </table>
    </div>
  `;
  document.body.appendChild(panel);

  document.getElementById('yt-seo-toggle-btn').addEventListener('click', toggleScraping);
  document.getElementById('yt-seo-export-btn').addEventListener('click', exportToTxt);

  function openPanel() {
    panel.classList.remove('hidden');
    launcher.classList.add('hidden');
  }
  function minimizePanel() {
    panel.classList.add('hidden');
    launcher.classList.remove('hidden');
  }

  launcher.addEventListener('click', openPanel);
  document.getElementById('yt-seo-minimize-btn').addEventListener('click', minimizePanel);
}

// 3. Smart Auto-Scroll Function
function toggleScraping() {
  const btn = document.getElementById('yt-seo-toggle-btn');
  isScrolling = !isScrolling;

  if (isScrolling) {
    btn.textContent = 'Stop Scraping';
    btn.className = 'stop-btn';

    scrollInterval = setInterval(() => {
      window.scrollBy(0, 800);

      const currentScroll = window.scrollY;

      // Detect bottom of page
      if (currentScroll === lastScrollPos) {
        samePosCount++;
        if (samePosCount >= 3) {
          console.log("⚡ [SEO Scraper] Reached end of page. Scraping complete!");
          toggleScraping();
        }
      } else {
        samePosCount = 0;
        lastScrollPos = currentScroll;
      }
    }, 1800);
  } else {
    btn.textContent = 'Start Scraping';
    btn.className = 'start-btn';
    clearInterval(scrollInterval);
  }
}

// 4. Handle incoming scraped data from injector.js
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'YT_SEO_SCRAPED_DATA') {
    const tbody = document.getElementById('yt-seo-tbody');
    
    event.data.data.forEach(item => {
      // Prevent duplicates
      if (item.id && processedIds.has(item.id)) return;
      if (item.id) processedIds.add(item.id);

      videoCount++;

      // Save structured object for export
      const record = {
        number: videoCount,
        url: item.url,
        title: item.title,
        views: item.views,
        date: item.date || 'Loading...'
      };
      scrapedList.push(record);

      // Render row to UI table
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${videoCount}</td>
        <td title="${item.title}">${item.title}</td>
        <td>${item.views}</td>
        <td class="date-cell">${record.date}</td>
        <td><a href="${item.url}" target="_blank" rel="noopener">Open</a></td>
      `;
      tbody.appendChild(row);

      if (item.id) {
        rowsById.set(item.id, { record, dateCell: row.querySelector('.date-cell') });
      }
    });

    const countElem = document.getElementById('yt-seo-count');
    if (countElem) countElem.textContent = videoCount;
  } else if (event.data && event.data.type === 'YT_SEO_DATE_UPDATE') {
    const entry = rowsById.get(event.data.id);
    if (entry) {
      entry.record.date = event.data.date;
      if (entry.dateCell) entry.dateCell.textContent = event.data.date;
    }
  }
});

// Extracts the "@handle" segment from the current channel URL, e.g. "/@CrazyZoomXYZ/shorts" -> "@CrazyZoomXYZ"
function getChannelHandle() {
  const match = /^\/(@[^/]+)/.exec(window.location.pathname);
  return match ? match[1] : 'unknown_channel';
}

// 5. Export Functionality (.txt formatted)
function exportToTxt() {
  if (scrapedList.length === 0) {
    alert("No scraped data available to export!");
    return;
  }

  // Header line
  let txtContent = "| number | url_link | title | views_count | date |\n";
  txtContent += "--------------------------------------------------------------------------------\n";

  // Append formatted rows
  scrapedList.forEach(item => {
    // Sanitize pipeline characters in titles to preserve layout
    const safeTitle = item.title.replace(/\|/g, "-");
    txtContent += `| ${item.number} | ${item.url} | ${safeTitle} | ${item.views} | ${item.date} |\n`;
  });

  // Create downloadable blob
  const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  
  a.href = downloadUrl;
  a.download = `yt-shorts-${getChannelHandle()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}

// Initialize Panel
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createUI);
} else {
  createUI();
}