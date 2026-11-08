// Renders the canonical address list on the donor-safety page from site-config.js.
(() => {
  const list = document.getElementById('addressList');
  if (!list) return;
  const config = window.ALI_SITE_CONFIG;

  function row(label, value) {
    const wrap = document.createElement('div');
    wrap.className = 'address-row';
    const title = document.createElement('strong');
    title.textContent = label;
    const code = document.createElement('code');
    code.className = 'address';
    code.textContent = value;
    wrap.append(title, code);
    return wrap;
  }

  if (!config || !config.donations || !config.token) {
    const message = document.createElement('p');
    message.className = 'label';
    message.textContent = 'Official address data could not be loaded. Use the Donate page before sending funds.';
    list.replaceChildren(message);
    return;
  }
  list.replaceChildren(
    row(`${config.token.symbol} contract / ${config.token.network}`, config.token.contractAddress),
    ...Object.entries(config.donations).map(([asset, item]) => row(`${asset} / ${item.network}`, item.address))
  );
})();
