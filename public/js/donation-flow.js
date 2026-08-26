(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ALI_DONATION_FLOW = api;
})(typeof globalThis === 'object' ? globalThis : this, function createDonationFlow() {
  const SAFETY = Object.freeze({
    BSC: 'Send only on BNB Smart Chain. A wrong network can permanently lose funds.',
    Bitcoin: 'Send BTC only on the Bitcoin network. Check the full address before sending.',
    Solana: 'Send SOL only on the Solana network. Check the full address before sending.'
  });

  function explorerUrl(symbol, address) {
    const safeAddress = encodeURIComponent(String(address || ''));
    if (symbol === 'BTC') return `https://mempool.space/address/${safeAddress}`;
    if (symbol === 'SOL') return `https://solscan.io/account/${safeAddress}`;
    return `https://bscscan.com/address/${safeAddress}`;
  }

  function getDonationView(config, requestedSymbol = 'USDT') {
    const symbol = String(requestedSymbol || 'USDT').toUpperCase();
    const asset = config && config[symbol];
    if (!asset || !asset.address || !asset.network) {
      throw new Error('Donation address unavailable');
    }
    return {
      symbol,
      network: asset.network,
      address: asset.address,
      safetyText: SAFETY[asset.network] || `Send only on ${asset.network}.`,
      explorerUrl: explorerUrl(symbol, asset.address)
    };
  }

  return { explorerUrl, getDonationView };
});

