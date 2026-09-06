// Formatting helpers shared by Model implementations (runs in the MAIN world,
// alongside the platform models that parse each site's raw payloads).
window.SEOScraper = window.SEOScraper || {};

window.SEOScraper.Format = {
  // "26K views" / "1 view" -> "26K" / "1"
  stripViewsSuffix(raw) {
    if (!raw) return 'N/A';
    const trimmed = raw.trim();
    const lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace === -1) return trimmed;
    const lastWord = trimmed.slice(lastSpace + 1).toLowerCase();
    if (lastWord === 'view' || lastWord === 'views') {
      return trimmed.slice(0, lastSpace).trim() || 'N/A';
    }
    return trimmed;
  },

  // "2026-04-04T17:02:03-07:00" -> "04/04/2026" (DD/MM/YYYY)
  formatDate(raw) {
    const datePart = raw.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  }
};
