const test = require('node:test');
const assert = require('node:assert/strict');

const { isVerifiedRecord, summarizeVerifiedRecords } = require('../public/js/public-records');

test('rejects placeholder and pending records', () => {
  assert.equal(isVerifiedRecord({ status: 'confirmed', amount: '0.3', currency: 'USDT', txHash: '0x1234...5678' }), false);
  assert.equal(isVerifiedRecord({ status: 'pending', amount: '5', currency: 'USDT', txHash: '0xabcdef123456' }), false);
});

test('summarizes only supported confirmed records without currency conversion', () => {
  const summary = summarizeVerifiedRecords([
    { status: 'confirmed', amount: '2.5', currency: 'USDT', txHash: '0xabcdef123456' },
    { status: 'confirmed', amount: '0.01', currency: 'BTC', txHash: 'abcdef1234567890' }
  ]);
  assert.equal(summary.count, 2);
  assert.deepEqual(summary.amounts, { BTC: 0.01, USDT: 2.5 });
});

test('ignores invalid amounts and unsupported currencies', () => {
  const summary = summarizeVerifiedRecords([
    { status: 'confirmed', amount: '-1', currency: 'USDT', txHash: '0xabcdef123456' },
    { status: 'confirmed', amount: '1', currency: 'DOGE', txHash: 'abcdef1234567890' }
  ]);
  assert.equal(summary.count, 0);
  assert.deepEqual(summary.amounts, {});
});
