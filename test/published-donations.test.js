const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { summarizeVerifiedRecords } = require('../public/js/public-records');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/donations.json'), 'utf8'));
const legacyStats = {
  totalDonations: 1,
  confirmedDonations: 1,
  pendingDonations: 0,
  rejectedDonations: 0,
  totalAmount: 0.3,
  pendingAmount: 0,
  aliTokensIssued: 0.3
};

test('the published placeholder is explicitly unverified without losing its original fields', () => {
  const record = data.donations.find(record => record.id === 1);
  assert.equal(record.status, 'unverified');
  assert.equal(record.previouslyReportedStatus, 'confirmed');
  assert.equal(record.txHash, '0x1234...5678');
  assert.equal(record.currency, 'USDT');
  assert.equal(record.amount, '0.3');
  assert.equal(record.timestamp, '2026-04-10T10:00:00Z');
  assert.equal(record.projectId, 'proj_general');
  assert.equal(record.verification.status, 'unverified');
  assert.match(record.verification.reason, /truncated transaction hash/i);
  assert.equal(record.verification.sourceUrl, 'https://minadoai.com/data/donations.json');
  assert.equal(record.verification.sourcePublishedAt, null);
  assert.equal(record.verification.verifiedTransactionAt, null);
  assert.ok(Number.isFinite(Date.parse(record.verification.reviewedAt)));
});

test('unverified donation totals are unknown rather than zero or legacy claimed amounts', () => {
  assert.equal(data.statisticsStatus, 'unverified');
  assert.deepEqual(Object.keys(data.stats).sort(), Object.keys(legacyStats).sort());
  for (const [name, value] of Object.entries(data.stats)) {
    assert.equal(value, null, `${name} must not imply a verified total`);
  }
  assert.match(data.statisticsNote, /unknown, not zero/i);
  assert.match(data.statisticsNote, /not.*proof of receipt/i);
});

test('previous statistics are retained only as explicitly unverified historical claims', () => {
  assert.equal(data.previouslyReportedStats?.status, 'unverified');
  assert.deepEqual(data.previouslyReportedStats.values, legacyStats);
  assert.match(data.previouslyReportedStats.note, /not.*verified/i);
});

test('the homepage consumer excludes the retained unverified record', () => {
  assert.deepEqual(summarizeVerifiedRecords(data.donations), { count: 0, amounts: {}, records: [] });
});
