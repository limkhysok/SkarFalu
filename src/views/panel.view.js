// Runs in the isolated world. Owns all DOM rendering for the floating panel;
// never touches app state directly, only through the ViewModel it's bound to.
window.SEOScraper = window.SEOScraper || {};

(() => {
  // "Node Mesh" mark: a network glyph, reused at launcher, panel-header, and toolbar-icon scale
  const NODE_MESH_SVG = `
    <svg viewBox="0 0 100 100">
      <line x1="50" y1="50" x2="50" y2="14" stroke="#00F0FF" stroke-width="9" stroke-linecap="square"/>
      <line x1="50" y1="50" x2="86" y2="50" stroke="#00F0FF" stroke-width="9" stroke-linecap="square"/>
      <line x1="50" y1="50" x2="50" y2="86" stroke="#00F0FF" stroke-width="9" stroke-linecap="square"/>
      <line x1="50" y1="50" x2="14" y2="50" stroke="#00F0FF" stroke-width="9" stroke-linecap="square"/>
      <rect x="41" y="5" width="18" height="18" fill="#00F0FF"/>
      <rect x="77" y="41" width="18" height="18" fill="#00F0FF"/>
      <rect x="41" y="77" width="18" height="18" fill="#00F0FF"/>
      <rect x="5" y="41" width="18" height="18" fill="#00F0FF"/>
      <path d="M50,35 L65,50 L50,65 L35,50 Z" fill="#FF0055"/>
    </svg>
  `;

  window.SEOScraper.PanelView = class PanelView {
    constructor(viewModel) {
      this.viewModel = viewModel;
      this.dateCellsById = new Map(); // videoId -> date <td>, for patching in the date once it resolves
    }

    mount() {
      if (document.getElementById('yt-seo-panel')) return;

      const launcher = document.createElement('button');
      launcher.id = 'yt-seo-launcher';
      launcher.type = 'button';
      launcher.title = 'Open SkarFalu';
      launcher.innerHTML = NODE_MESH_SVG;
      document.body.appendChild(launcher);

      const panel = document.createElement('div');
      panel.id = 'yt-seo-panel';
      panel.classList.add('hidden');
      panel.innerHTML = `
        <div class="panel-header">
          <span class="panel-brand">
            <span class="panel-mark">${NODE_MESH_SVG}</span>
            <span class="panel-title">SkarFalu</span>
          </span>
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

      this.tbody = document.getElementById('yt-seo-tbody');
      this.countEl = document.getElementById('yt-seo-count');
      this.toggleBtn = document.getElementById('yt-seo-toggle-btn');

      this.toggleBtn.addEventListener('click', () => this.viewModel.toggleScraping());
      document.getElementById('yt-seo-export-btn').addEventListener('click', () => this.viewModel.exportData());

      launcher.addEventListener('click', () => {
        panel.classList.remove('hidden');
        launcher.classList.add('hidden');
      });
      document.getElementById('yt-seo-minimize-btn').addEventListener('click', () => {
        panel.classList.add('hidden');
        launcher.classList.remove('hidden');
      });
    }

    renderRow(record, id) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.number}</td>
        <td title="${record.title}">${record.title}</td>
        <td>${record.views}</td>
        <td class="date-cell">${record.date}</td>
        <td><a href="${record.url}" target="_blank" rel="noopener">Open</a></td>
      `;
      this.tbody.appendChild(row);

      if (id) this.dateCellsById.set(id, row.querySelector('.date-cell'));
    }

    updateDate(id, date) {
      const cell = this.dateCellsById.get(id);
      if (cell) cell.textContent = date;
    }

    updateCount(count) {
      this.countEl.textContent = count;
    }

    setScrapingState(isScrolling) {
      this.toggleBtn.textContent = isScrolling ? 'Stop Scraping' : 'Start Scraping';
      this.toggleBtn.className = isScrolling ? 'stop-btn' : 'start-btn';
    }
  };
})();
