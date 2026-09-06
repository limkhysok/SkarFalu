// Export helper used by the ViewModel (isolated world). Kept generic over
// "records" so it can serve every platform's scraped table, not just YouTube.
window.SEOScraper = window.SEOScraper || {};

window.SEOScraper.Export = {
  toTxt(records, filename) {
    if (!records || records.length === 0) return;

    let txtContent = '| number | url_link | title | views_count | date |\n';
    txtContent += '--------------------------------------------------------------------------------\n';

    records.forEach(item => {
      // Sanitize pipeline characters in titles to preserve layout
      const safeTitle = item.title.replace(/\|/g, '-');
      txtContent += `| ${item.number} | ${item.url} | ${safeTitle} | ${item.views} | ${item.date} |\n`;
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  }
};
