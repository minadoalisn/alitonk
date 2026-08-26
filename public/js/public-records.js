(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ALI_PUBLIC_RECORDS = api;
})(typeof globalThis === 'object' ? globalThis : this, function createPublicRecords() {
  const SUPPORTED = new Set(['USDT', 'ETH', 'BNB', 'BTC', 'SOL', 'ALI']);

  function isVerifiedRecord(record) {
    const amount = Number(record && record.amount);
    const txHash = String(record && record.txHash || '').trim();
    return String(record && record.status).toLowerCase() === 'confirmed'
      && Number.isFinite(amount)
      && amount > 0
      && SUPPORTED.has(String(record && record.currency || '').toUpperCase())
      && txHash.length >= 8
      && !txHash.includes('...');
  }

  function summarizeVerifiedRecords(records) {
    const verified = Array.isArray(records) ? records.filter(isVerifiedRecord) : [];
    const amounts = {};
    for (const record of verified) {
      const currency = String(record.currency).toUpperCase();
      amounts[currency] = Number(((amounts[currency] || 0) + Number(record.amount)).toFixed(8));
    }
    return { count: verified.length, amounts, records: verified };
  }

  return { isVerifiedRecord, summarizeVerifiedRecords };
});

