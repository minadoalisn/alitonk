(() => {
  const config = window.ALI_SITE_CONFIG && window.ALI_SITE_CONFIG.donations;
  const flow = window.ALI_DONATION_FLOW;
  const symbols = ['USDT', 'BNB', 'ETH', 'BTC', 'SOL'];
  const options = document.querySelector('#assetOptions');
  const copyButton = document.querySelector('#copyAddress');
  const status = document.querySelector('#copyStatus');
  let selected = new URLSearchParams(window.location.search).get('asset') || 'USDT';

  function setUnavailable(message) {
    document.querySelector('#donationAddress').textContent = 'Address unavailable';
    document.querySelector('#networkSafety').textContent = message;
    copyButton.disabled = true;
    status.textContent = message;
  }

  function render(symbol) {
    try {
      const view = flow.getDonationView(config, symbol);
      selected = view.symbol;
      document.querySelector('#networkName').textContent = view.network;
      document.querySelector('#addressLabel').textContent = `${view.symbol} official address`;
      document.querySelector('#donationAddress').textContent = view.address;
      document.querySelector('#networkSafety').textContent = view.safetyText;
      document.querySelector('#explorerLink').href = view.explorerUrl;
      options.querySelectorAll('[data-asset]').forEach(button => button.setAttribute('aria-checked', String(button.dataset.asset === selected)));
      copyButton.disabled = false;
      status.textContent = '';
    } catch {
      setUnavailable('Official donation configuration could not be loaded. Do not send funds until it is available.');
    }
  }

  async function copyAddress() {
    let address;
    try { address = flow.getDonationView(config, selected).address; }
    catch { setUnavailable('Official donation address is unavailable.'); return; }
    try {
      await navigator.clipboard.writeText(address);
      status.textContent = 'Official address copied.';
      copyButton.textContent = 'Copied';
      window.setTimeout(() => { copyButton.textContent = 'Copy official address'; }, 1800);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('#donationAddress'));
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      status.textContent = 'Address selected. Use your browser copy command.';
    }
  }

  for (const symbol of symbols) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.asset = symbol;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.textContent = symbol;
    button.addEventListener('click', () => render(symbol));
    options.append(button);
  }
  copyButton.addEventListener('click', copyAddress);
  render(symbols.includes(selected.toUpperCase()) ? selected.toUpperCase() : 'USDT');
})();
