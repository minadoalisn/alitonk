(() => {
  const config = window.ALI_SITE_CONFIG && window.ALI_SITE_CONFIG.donations;
  const flow = window.ALI_DONATION_FLOW;
  const symbols = ['USDT', 'BNB', 'ETH', 'BTC', 'SOL'];
  const options = document.querySelector('#assetOptions');
  const copyButton = document.querySelector('#copyAddress');
  const status = document.querySelector('#copyStatus');
  let selected = new URLSearchParams(window.location.search).get('asset') || 'USDT';
  let copyInProgress = false;
  let copyResetTimer;

  function clearCopyFeedback() {
    window.clearTimeout(copyResetTimer);
    copyResetTimer = undefined;
    copyButton.textContent = 'Copy official address';
    status.textContent = '';
  }

  function setCopyPending(pending) {
    copyInProgress = pending;
    copyButton.disabled = pending;
    options.querySelectorAll('[data-asset]').forEach(button => { button.disabled = pending; });
  }

  function setUnavailable(message) {
    clearCopyFeedback();
    document.querySelector('#donationAddress').textContent = 'Address unavailable';
    document.querySelector('#networkSafety').textContent = message;
    copyButton.disabled = true;
    status.textContent = message;
  }

  function render(symbol) {
    if (copyInProgress) return;
    clearCopyFeedback();
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
    if (copyInProgress) return;
    let view;
    try { view = flow.getDonationView(config, selected); }
    catch { setUnavailable('Official donation address is unavailable.'); return; }
    clearCopyFeedback();
    setCopyPending(true);
    copyButton.textContent = 'Copying...';
    status.textContent = `Copying ${view.symbol} address on ${view.network}...`;
    try {
      await navigator.clipboard.writeText(view.address);
      status.textContent = `${view.symbol} address on ${view.network} copied.`;
      copyButton.textContent = 'Copied';
      copyResetTimer = window.setTimeout(() => {
        copyButton.textContent = 'Copy official address';
        copyResetTimer = undefined;
      }, 1800);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('#donationAddress'));
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      copyButton.textContent = 'Copy official address';
      status.textContent = 'Address selected. Use your browser copy command.';
    } finally {
      setCopyPending(false);
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
