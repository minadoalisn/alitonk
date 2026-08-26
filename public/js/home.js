(() => {
  const status = document.querySelector('#verifiedRecords');

  async function renderPublicRecords() {
    try {
      const response = await fetch('/data/donations.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Public data unavailable');
      const data = await response.json();
      const summary = window.ALI_PUBLIC_RECORDS.summarizeVerifiedRecords(data.donations);
      if (!summary.count) {
        status.textContent = 'No verified public donation records are currently published.';
        return;
      }
      const amounts = Object.entries(summary.amounts).map(([currency, amount]) => `${amount} ${currency}`).join(', ');
      status.textContent = `${summary.count} verified public donation record${summary.count === 1 ? '' : 's'}: ${amounts}.`;
    } catch {
      status.textContent = 'Public donation records are temporarily unavailable.';
    }
  }

  document.querySelector('#year').textContent = String(new Date().getFullYear());
  renderPublicRecords();
})();
