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

  // Lets the user drag `handleEl` to reposition `el` (switching it from its
  // default bottom/right-anchored CSS position to an explicit left/top one),
  // persisting the chosen position in localStorage. A short movement
  // threshold distinguishes a drag from a plain click, so `onClick` still
  // fires normally when the user just clicks the handle.
  function makeDraggable(el, handleEl, storageKey, onClick) {
    const saved = loadPosition(storageKey);
    if (saved) {
      el.style.left = `${saved.left}px`;
      el.style.top = `${saved.top}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    }

    handleEl.addEventListener('pointerdown', (e) => {
      const interactive = e.target.closest('button, input');
      if (interactive && interactive !== handleEl) return;

      let dragging = false;
      const startX = e.clientX;
      const startY = e.clientY;
      const startRect = el.getBoundingClientRect();
      const startLeft = startRect.left;
      const startTop = startRect.top;
      handleEl.setPointerCapture(e.pointerId);

      function onMove(ev) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!dragging) {
          if (Math.hypot(dx, dy) < 4) return;
          dragging = true;
          el.style.right = 'auto';
          el.style.bottom = 'auto';
        }
        const rect = el.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width;
        const maxTop = window.innerHeight - rect.height;
        el.style.left = `${Math.min(Math.max(0, startLeft + dx), Math.max(0, maxLeft))}px`;
        el.style.top = `${Math.min(Math.max(0, startTop + dy), Math.max(0, maxTop))}px`;
      }

      function onUp() {
        handleEl.removeEventListener('pointermove', onMove);
        handleEl.removeEventListener('pointerup', onUp);
        if (dragging) {
          savePosition(storageKey, { left: Number.parseFloat(el.style.left), top: Number.parseFloat(el.style.top) });
        } else if (onClick) {
          onClick();
        }
      }

      handleEl.addEventListener('pointermove', onMove);
      handleEl.addEventListener('pointerup', onUp);
    });
  }

  function loadPosition(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null; // localStorage unavailable or value corrupt - fall back to the CSS default position
    }
  }

  function savePosition(key, pos) {
    try {
      localStorage.setItem(key, JSON.stringify(pos));
    } catch (e) {
      // ignore quota/availability errors - position memory is a nice-to-have
    }
  }

  // "26K" / "1.2M" / "1" -> a comparable number ("N/A" sorts last)
  function parseViews(raw) {
    if (!raw || raw === 'N/A') return -1;
    const s = raw.trim().toUpperCase();
    let mult = 1;
    if (s.endsWith('M')) mult = 1e6;
    else if (s.endsWith('K')) mult = 1e3;
    return (Number.parseFloat(s) || 0) * mult;
  }

  // "DD/MM/YYYY" -> a comparable timestamp ("N/A" / "Loading..." sort last)
  function parseDate(raw) {
    if (!raw || raw === 'N/A' || raw === 'Loading...') return -1;
    const [day, month, year] = raw.split('/').map(Number);
    return new Date(year, month - 1, day).getTime();
  }

  const SORT_COMPARATORS = {
    number: (a, b) => a.number - b.number,
    title: (a, b) => a.title.localeCompare(b.title),
    views: (a, b) => parseViews(a.views) - parseViews(b.views),
    date: (a, b) => parseDate(a.date) - parseDate(b.date)
  };

  window.SEOScraper.PanelView = class PanelView {
    constructor(viewModel) {
      this.viewModel = viewModel;
      this.rows = []; // { id, record, el }, in insertion order
      this.dateCellsById = new Map(); // videoId -> date <td>, for patching in the date once it resolves
      this.sortKey = null;
      this.sortDir = 1;
      this.filterText = '';
      this._toastTimer = null;
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
        <div class="panel-toolbar">
          <div class="panel-stats">Total Scraped: <span id="yt-seo-count">0</span></div>
          <input type="text" id="yt-seo-filter" class="filter-input" placeholder="Filter by title...">
        </div>
        <div class="panel-table-wrapper">
          <table id="yt-seo-table">
            <thead>
              <tr>
                <th data-sort="number">#<span class="sort-indicator"></span></th>
                <th data-sort="title">Title<span class="sort-indicator"></span></th>
                <th data-sort="views">Views<span class="sort-indicator"></span></th>
                <th data-sort="date">Date<span class="sort-indicator"></span></th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody id="yt-seo-tbody"></tbody>
          </table>
        </div>
      `;
      document.body.appendChild(panel);

      const toast = document.createElement('div');
      toast.id = 'yt-seo-toast';
      toast.classList.add('toast-hidden');
      document.body.appendChild(toast);
      this.toastEl = toast;

      this.tbody = document.getElementById('yt-seo-tbody');
      this.countEl = document.getElementById('yt-seo-count');
      this.toggleBtn = document.getElementById('yt-seo-toggle-btn');
      this.launcherEl = launcher;
      this.filterInput = document.getElementById('yt-seo-filter');

      this.toggleBtn.addEventListener('click', () => this.viewModel.toggleScraping());
      document.getElementById('yt-seo-export-btn').addEventListener('click', () => this.viewModel.exportData());

      const openPanel = () => {
        panel.classList.remove('hidden');
        launcher.classList.add('hidden');
      };
      const minimizePanel = () => {
        panel.classList.add('hidden');
        launcher.classList.remove('hidden');
      };

      document.getElementById('yt-seo-minimize-btn').addEventListener('click', minimizePanel);

      this.filterInput.addEventListener('input', (e) => {
        this.filterText = e.target.value;
        this._applyView();
      });

      panel.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          const key = th.dataset.sort;
          this.sortDir = this.sortKey === key ? this.sortDir * -1 : 1;
          this.sortKey = key;
          this._updateSortIndicators(panel);
          this._applyView();
        });
      });

      makeDraggable(launcher, launcher, 'skarfalu:launcher-pos', openPanel);
      makeDraggable(panel, panel.querySelector('.panel-header'), 'skarfalu:panel-pos', null);
    }

    renderRow(record) {
      const el = document.createElement('tr');
      el.innerHTML = `
        <td>${record.number}</td>
        <td title="${record.title}">${record.title}</td>
        <td>${record.views}</td>
        <td class="date-cell">${record.date}</td>
        <td><a href="${record.url}" target="_blank" rel="noopener">Open</a></td>
      `;

      this.rows.push({ id: record.id, record, el });
      if (record.id) this.dateCellsById.set(record.id, el.querySelector('.date-cell'));

      if (this.sortKey || this.filterText) {
        this._applyView();
      } else {
        this.tbody.appendChild(el);
      }
    }

    _applyView() {
      const filter = this.filterText.trim().toLowerCase();
      let visible = filter
        ? this.rows.filter(r => r.record.title.toLowerCase().includes(filter))
        : this.rows.slice();

      if (this.sortKey) {
        const compare = SORT_COMPARATORS[this.sortKey];
        visible.sort((a, b) => compare(a.record, b.record) * this.sortDir);
      }

      this.tbody.innerHTML = '';
      visible.forEach(r => this.tbody.appendChild(r.el));
    }

    _updateSortIndicators(panel) {
      panel.querySelectorAll('th[data-sort]').forEach(th => {
        const indicator = th.querySelector('.sort-indicator');
        if (th.dataset.sort === this.sortKey) {
          indicator.textContent = this.sortDir === 1 ? ' ▲' : ' ▼';
        } else {
          indicator.textContent = '';
        }
      });
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
      this.launcherEl.classList.toggle('scraping', isScrolling);
    }

    showToast(message) {
      clearTimeout(this._toastTimer);
      this.toastEl.textContent = message;
      this.toastEl.classList.remove('toast-hidden');
      this._toastTimer = setTimeout(() => this.toastEl.classList.add('toast-hidden'), 2600);
    }
  };
})();
