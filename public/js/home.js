(() => {
  const status = document.querySelector('#verifiedRecords');

  async function renderPublicRecords() {
    try {
      const response = await fetch('/data/donations.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Public data unavailable');
      const data = await response.json();
      const config = window.ALI_SITE_CONFIG && window.ALI_SITE_CONFIG.donations;
      const summary = window.ALI_PUBLIC_RECORDS.summarizeVerifiedRecords(data.donations, config, data.reportingPeriod);
      if (!summary.count) {
        status.textContent = 'No reviewed donation totals are currently published for a reporting period. Actual donation totals are unknown.';
        return;
      }
      const amounts = Object.entries(summary.amounts).map(([currency, amount]) => `${amount} ${currency}`).join(', ');
      status.textContent = `${summary.count} reviewed public transaction record${summary.count === 1 ? '' : 's'} from ${data.reportingPeriod.start} (inclusive) to ${data.reportingPeriod.end} (exclusive): ${amounts}. This published subset is not a complete donation total or proof of impact.`;
    } catch {
      status.textContent = 'Public donation records are temporarily unavailable.';
    }
  }

  document.querySelector('#year').textContent = String(new Date().getFullYear());
  renderPublicRecords();
})();
