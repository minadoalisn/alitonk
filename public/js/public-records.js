(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ALI_PUBLIC_RECORDS = api;
})(typeof globalThis === 'object' ? globalThis : this, function createPublicRecords() {
  const EXPLORERS = Object.freeze({
    BSC: 'https://bscscan.com/tx/',
    Bitcoin: 'https://mempool.space/tx/',
    Solana: 'https://solscan.io/tx/'
  });
  const SCALE = 10n ** 18n;

  function timestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return NaN;
    const time = Date.parse(value);
    return Number.isFinite(time) && new Date(time).toISOString().replace('.000Z', 'Z') === value.replace('.000Z', 'Z') ? time : NaN;
  }

  function units(amount) {
    const [whole, fraction = ''] = amount.split('.');
    return BigInt(whole) * SCALE + BigInt(fraction.padEnd(18, '0'));
  }

  function decimal(amount) {
    const digits = amount.toString().padStart(19, '0');
    const fraction = digits.slice(-18).replace(/0+$/, '');
    return digits.slice(0, -18) + (fraction ? '.' + fraction : '');
  }

  function normalizedHash(record) {
    return record.network === 'Solana' ? record.txHash : record.txHash.toLowerCase();
  }

  function completeHash(hash, network) {
    if (typeof hash !== 'string') return false;
    if (network === 'BSC') return /^0x[0-9a-fA-F]{64}$/.test(hash) && !/^0x0{64}$/.test(hash);
    if (network === 'Bitcoin') return /^[0-9a-fA-F]{64}$/.test(hash) && !/^0{64}$/.test(hash);
    if (network !== 'Solana' || !/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(hash)) return false;
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let value = 0n;
    for (const character of hash) value = value * 58n + BigInt(alphabet.indexOf(character));
    const leadingZeroBytes = hash.match(/^1*/)[0].length;
    return value > 0n && leadingZeroBytes + Math.ceil(value.toString(16).length / 2) === 64;
  }

  // This is a fail-closed publication gate, not an RPC call or an independent audit.
  // A responsible reviewer must check the linked receipt before publishing verified metadata.
  function isVerifiedRecord(record, config) {
    if (!record || record.status !== 'confirmed' || !config || typeof record.currency !== 'string') return false;
    const currency = record.currency.toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(config, currency)) return false;
    const route = config[currency];
    if (!route || !route.address || record.network !== route.network || !Object.prototype.hasOwnProperty.call(EXPLORERS, record.network)) return false;
    if (typeof record.recipient !== 'string') return false;
    const sameRecipient = record.network === 'BSC'
      ? record.recipient.toLowerCase() === route.address.toLowerCase()
      : record.recipient === route.address;
    if (!sameRecipient || !completeHash(record.txHash, record.network)) return false;
    const precision = record.network === 'Bitcoin' ? 8 : record.network === 'Solana' ? 9 : 18;
    if (typeof record.amount !== 'string' || !/^(?:0|[1-9]\d{0,29})(?:\.\d{1,18})?$/.test(record.amount)) return false;
    if ((record.amount.split('.')[1] || '').length > precision || units(record.amount) <= 0n) return false;
    const review = record.verification;
    const happenedAt = timestamp(record.timestamp);
    const reviewedAt = timestamp(review && review.reviewedAt);
    return !!review && review.status === 'verified' && review.result === 'received'
      && typeof review.reviewedBy === 'string' && !!review.reviewedBy.trim()
      && Number.isFinite(happenedAt) && Number.isFinite(reviewedAt)
      && happenedAt <= reviewedAt && reviewedAt <= Date.now()
      && timestamp(review.verifiedTransactionAt) === happenedAt
      && review.sourceUrl === EXPLORERS[record.network] + normalizedHash(record);
  }

  function summarizeVerifiedRecords(records, config, reportingPeriod) {
    const empty = { count: 0, amounts: {}, records: [] };
    const start = timestamp(reportingPeriod && reportingPeriod.start);
    const end = timestamp(reportingPeriod && reportingPeriod.end);
    if (!Array.isArray(records) || !Number.isFinite(start) || !Number.isFinite(end) || start >= end || end > Date.now()) return empty;
    const transactions = new Map();
    for (const record of records.filter(record => isVerifiedRecord(record, config))) {
      const key = record.network + ':' + normalizedHash(record);
      const recipient = record.network === 'BSC' ? record.recipient.toLowerCase() : record.recipient;
      const fingerprint = JSON.stringify([record.currency.toUpperCase(), recipient, units(record.amount).toString(), timestamp(record.timestamp)]);
      const previous = transactions.get(key);
      if (!previous) transactions.set(key, { record, fingerprint, conflict: false });
      else if (previous.fingerprint !== fingerprint) previous.conflict = true;
    }
    const verified = [...transactions.values()].filter(entry => !entry.conflict)
      .map(entry => entry.record).filter(record => timestamp(record.timestamp) >= start && timestamp(record.timestamp) < end);
    const totals = {};
    for (const record of verified) {
      const asset = `${record.currency.toUpperCase()} (${record.network})`;
      totals[asset] = (totals[asset] || 0n) + units(record.amount);
    }
    const amounts = Object.fromEntries(Object.entries(totals).map(([asset, amount]) => [asset, decimal(amount)]));
    return { count: verified.length, amounts, records: verified };
  }

  return { isVerifiedRecord, summarizeVerifiedRecords };
});

