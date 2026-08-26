const test = require('node:test');
const assert = require('node:assert/strict');

const { explorerUrl, getDonationView } = require('../public/js/donation-flow');

const config = {
  USDT: { network: 'BSC', address: '0xabc1234567890123456789012345678901234567' },
  BNB: { network: 'BSC', address: '0xabc1234567890123456789012345678901234567' },
  ETH: { network: 'BSC', address: '0xabc1234567890123456789012345678901234567' },
  BTC: { network: 'Bitcoin', address: 'bc1ptestaddress1234567890' },
  SOL: { network: 'Solana', address: 'SolanaTestAddress1234567890' }
};

test('defaults to USDT and returns network-specific safety copy', () => {
  const view = getDonationView(config);
  assert.equal(view.symbol, 'USDT');
  assert.match(view.safetyText, /BNB Smart Chain/);
});

test('BTC selection uses a Bitcoin explorer and Bitcoin safety copy', () => {
  const view = getDonationView(config, 'BTC');
  assert.equal(view.network, 'Bitcoin');
  assert.match(view.safetyText, /Bitcoin network/);
  assert.equal(explorerUrl('BTC', view.address), `https://mempool.space/address/${view.address}`);
});

test('every configured asset produces a complete view', () => {
  for (const symbol of Object.keys(config)) {
    const view = getDonationView(config, symbol);
    assert.equal(view.symbol, symbol);
    assert.ok(view.address);
    assert.ok(view.network);
    assert.ok(view.explorerUrl.startsWith('https://'));
  }
});

test('missing address fails closed', () => {
  assert.throws(() => getDonationView({}, 'USDT'), /unavailable/i);
});

