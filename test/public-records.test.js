const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { isVerifiedRecord, summarizeVerifiedRecords } = require('../public/js/public-records');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/site-config.js'), 'utf8'), context);
const config = context.window.ALI_SITE_CONFIG.donations;
const period = { start: '2026-04-01T00:00:00Z', end: '2026-05-01T00:00:00Z' };
const empty = { count: 0, amounts: {}, records: [] };
const prefixes = { BSC: 'https://bscscan.com/tx/', Bitcoin: 'https://mempool.space/tx/', Solana: 'https://solscan.io/tx/' };

// Synthetic fixtures only. These are not real donations or claims of chain verification.
function reviewed(overrides = {}) {
  const currency = overrides.currency || 'USDT';
  const network = config[currency].network;
  const txHash = currency === 'BTC' ? 'ab'.repeat(32) : currency === 'SOL' ? '2'.repeat(88) : '0x' + 'ab'.repeat(32);
  const record = { status: 'confirmed', amount: '0.3', currency, network, recipient: config[currency].address,
    timestamp: '2026-04-10T10:00:00Z', txHash, ...overrides };
  record.verification = { status: 'verified', result: 'received', reviewedBy: 'Synthetic test reviewer',
    reviewedAt: '2026-05-02T10:00:00Z', verifiedTransactionAt: record.timestamp,
    sourceUrl: prefixes[record.network] + record.txHash, ...overrides.verification };
  return record;
}

test('status and a plausible hash alone never establish a verified donation', () => {
  assert.equal(isVerifiedRecord({ status: 'confirmed', amount: '2.5', currency: 'USDT', txHash: '0xabcdef123456' }, config), false);
  const record = reviewed();
  delete record.verification;
  assert.equal(isVerifiedRecord(record, config), false);
  assert.equal(isVerifiedRecord(reviewed(), undefined), false);
});

test('requires an explicit dated receipt review and matching full transaction link', () => {
  assert.equal(isVerifiedRecord(reviewed(), config), true);
  for (const change of [{ status: 'unverified' }, { result: 'failed' }, { reviewedBy: '' }, { reviewedAt: null },
    { reviewedAt: '9999-01-01T00:00:00Z' }, { reviewedAt: '2026-04-09T10:00:00Z' },
    { verifiedTransactionAt: null }, { sourceUrl: 'https://bscscan.com/tx/' + 'cd'.repeat(32) },
    { sourceUrl: 'https://bscscan.com.evil.example/tx/' + 'ab'.repeat(32) }]) {
    assert.equal(isVerifiedRecord(reviewed({ verification: change }), config), false, JSON.stringify(change));
  }
});

test('rejects incomplete or invalid transaction identifiers for each supported network', () => {
  for (const [currency, txHash] of [['USDT', '0x1234...5678'], ['USDT', '0xabcdef123456'],
    ['USDT', '0x' + '0'.repeat(64)], ['BTC', 'abcdef1234567890'], ['BTC', 'z'.repeat(64)],
    ['SOL', 'O'.repeat(88)], ['SOL', '2'.repeat(87 - 10)], ['SOL', '1'.repeat(88)]]) {
    assert.equal(isVerifiedRecord(reviewed({ currency, txHash }), config), false, currency + ':' + txHash);
  }
  for (const currency of Object.keys(config)) assert.equal(isVerifiedRecord(reviewed({ currency }), config), true, currency);
});

test('rejects mismatched networks, recipients, dates and unsupported assets', () => {
  for (const change of [{ network: 'Ethereum' }, { recipient: '0x' + '12'.repeat(20) },
    { timestamp: '2026-02-30T10:00:00Z' }, { timestamp: null }, { status: 'pending' }]) {
    assert.equal(isVerifiedRecord(reviewed(change), config), false, JSON.stringify(change));
  }
  assert.equal(isVerifiedRecord({ ...reviewed(), currency: 'ALI' }, config), false);
});

test('requires positive exact decimal strings rather than coercion or rounded amounts', () => {
  for (const amount of [true, 1, '0', '-1', 'Infinity', '1e18', '0x10', '0.0000000000000000001']) {
    assert.equal(isVerifiedRecord(reviewed({ amount }), config), false, String(amount));
  }
  assert.equal(isVerifiedRecord(reviewed({ currency: 'BTC', amount: '0.000000001' }), config), false);
  assert.equal(isVerifiedRecord(reviewed({ currency: 'SOL', amount: '0.0000000001' }), config), false);
});

test('requires a valid reporting period and uses an inclusive start and exclusive end', () => {
  const records = [reviewed({ timestamp: period.start }), reviewed({ txHash: '0x' + 'cd'.repeat(32), timestamp: period.end })];
  assert.deepEqual(summarizeVerifiedRecords(records, config), empty);
  assert.deepEqual(summarizeVerifiedRecords(records, config, { start: period.end, end: period.start }), empty);
  assert.equal(summarizeVerifiedRecords(records, config, period).count, 1);
});

test('deduplicates transaction identifiers without case-sensitive EVM double counting', () => {
  const record = reviewed();
  const duplicate = reviewed({ txHash: '0x' + 'AB'.repeat(32), amount: '0.30', verification: { sourceUrl: record.verification.sourceUrl } });
  const summary = summarizeVerifiedRecords([record, duplicate, record], config, period);
  assert.equal(summary.count, 1);
  assert.deepEqual(summary.amounts, { 'USDT (BSC)': '0.3' });
});

test('quarantines contradictory claims for the same network and transaction', () => {
  assert.deepEqual(summarizeVerifiedRecords([reviewed(), reviewed({ amount: '0.9' })], config, period), empty);
  assert.deepEqual(summarizeVerifiedRecords([reviewed(), reviewed({ currency: 'BNB' })], config, period), empty);
});

test('keeps assets and networks separate and sums decimals exactly', () => {
  const summary = summarizeVerifiedRecords([reviewed({ amount: '0.1' }),
    reviewed({ txHash: '0x' + 'cd'.repeat(32), amount: '0.2' }), reviewed({ currency: 'BTC', amount: '0.01' }),
    reviewed({ currency: 'SOL', amount: '0.000000001' })], config, period);
  assert.equal(summary.count, 4);
  assert.deepEqual(summary.amounts, { 'USDT (BSC)': '0.3', 'BTC (Bitcoin)': '0.01', 'SOL (Solana)': '0.000000001' });
});

test('missing data remains an empty published-record set, not a zero-donation claim', () => {
  assert.deepEqual(summarizeVerifiedRecords(null, config, period), empty);
  assert.deepEqual(summarizeVerifiedRecords([null, {}, reviewed({ verification: { status: 'unverified' } })], config, period), empty);
});
