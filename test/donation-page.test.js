const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const publicDir = path.join(__dirname, '..', 'public');
const settle = () => new Promise(resolve => setImmediate(resolve));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Only the browser boundaries are replaced. Run the shipped configuration,
// routing helper and controller, and observe the rendered UI and clipboard input.
function loadPage({ writeText = async () => {}, search = '', withConfig = true } = {}) {
  class Element extends EventTarget {
    constructor() {
      super();
      this.textContent = '';
      this.dataset = {};
      this.attributes = {};
      this.children = [];
      this.disabled = false;
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    append(element) { this.children.push(element); }
    querySelectorAll(selector) {
      assert.equal(selector, '[data-asset]');
      return this.children.filter(element => element.dataset.asset);
    }
    click() { if (!this.disabled) this.dispatchEvent(new Event('click')); }
  }
  const html = fs.readFileSync(path.join(publicDir, 'donate.html'), 'utf8');
  const elements = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [`#${id}`, new Element()]));
  const copy = elements['#copyAddress'];
  copy.textContent = 'Copy official address';
  copy.disabled = true;
  const timers = new Map();
  let nextTimer = 0;
  let selectedNode;
  const window = {
    location: { search },
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    getSelection: () => ({
      removeAllRanges() { selectedNode = undefined; },
      addRange(range) { selectedNode = range.node; }
    })
  };
  const context = vm.createContext(Object.assign(window, {
    window, URLSearchParams,
    navigator: { clipboard: writeText ? { writeText } : undefined },
    document: {
      querySelector(selector) { assert.ok(elements[selector], selector); return elements[selector]; },
      createElement(tag) { assert.equal(tag, 'button'); return new Element(); },
      createRange: () => ({ selectNodeContents(node) { this.node = node; } })
    }
  }));
  for (const script of [withConfig && 'site-config.js', 'donation-flow.js', 'donation-page.js'].filter(Boolean)) {
    vm.runInContext(fs.readFileSync(path.join(publicDir, 'js', script), 'utf8'), context, { filename: script });
  }
  return {
    copy, timers,
    status: elements['#copyStatus'],
    address: elements['#donationAddress'],
    network: elements['#networkName'],
    assets: Object.fromEntries(elements['#assetOptions'].children.map(button => [button.dataset.asset, button])),
    config: window.ALI_SITE_CONFIG && window.ALI_SITE_CONFIG.donations,
    getSelectedNode: () => selectedNode
  };
}

test('changing asset clears the previous copied label, confirmation and reset timer', async () => {
  const page = loadPage();
  page.copy.click();
  await settle();
  assert.equal(page.copy.textContent, 'Copied');
  page.assets.BTC.click();
  assert.equal(page.address.textContent, page.config.BTC.address);
  assert.equal(page.copy.textContent, 'Copy official address');
  assert.equal(page.status.textContent, '');
  assert.equal(page.timers.size, 0);
});

test('pending clipboard writes lock asset selection and prevent concurrent copies', async () => {
  const pending = deferred();
  const writes = [];
  const page = loadPage({ writeText: text => { writes.push(text); return pending.promise; } });
  page.copy.click();
  assert.equal(page.copy.disabled, true);
  assert.ok(Object.values(page.assets).every(button => button.disabled));
  page.assets.BTC.click();
  page.copy.click();
  // Even a dispatched event must not start a second write or change the view.
  page.copy.dispatchEvent(new Event('click'));
  page.assets.BTC.dispatchEvent(new Event('click'));
  assert.equal(page.address.textContent, page.config.USDT.address);
  assert.deepEqual(writes, [page.config.USDT.address]);
  pending.resolve();
  await settle();
  assert.equal(page.copy.disabled, false);
  assert.ok(Object.values(page.assets).every(button => !button.disabled));
  assert.match(page.status.textContent, /USDT.*BSC.*copied/);
});

test('a new pending copy clears the previous success and its timer', async () => {
  const pending = deferred();
  let writes = 0;
  const page = loadPage({ writeText: () => ++writes === 1 ? Promise.resolve() : pending.promise });
  page.copy.click();
  await settle();
  assert.equal(page.timers.size, 1);
  page.copy.click();
  assert.equal(page.timers.size, 0);
  assert.equal(page.copy.textContent, 'Copying...');
  assert.doesNotMatch(page.status.textContent, /copied/i);
  pending.resolve();
  await settle();
  assert.equal(page.copy.textContent, 'Copied');
});

test('every asset copies its exact configured address with a network-specific confirmation', async () => {
  const writes = [];
  const page = loadPage({ writeText: async text => { writes.push(text); } });
  for (const [symbol, asset] of Object.entries(page.config)) {
    page.assets[symbol].click();
    page.copy.click();
    await settle();
    assert.equal(writes.at(-1), asset.address);
    assert.equal(page.address.textContent, asset.address);
    assert.equal(page.network.textContent, asset.network);
    assert.ok(page.status.textContent.includes(symbol));
    assert.ok(page.status.textContent.includes(asset.network));
    for (const [id, callback] of page.timers) { page.timers.delete(id); callback(); }
    assert.equal(page.copy.textContent, 'Copy official address');
  }
});

test('clipboard rejection selects the current address without claiming a successful copy and unlocks controls', async () => {
  const pending = deferred();
  const page = loadPage({ writeText: () => pending.promise, search: '?asset=BTC' });
  page.copy.click();
  pending.reject(new Error('NotAllowedError'));
  await settle();
  assert.equal(page.getSelectedNode(), page.address);
  assert.equal(page.address.textContent, page.config.BTC.address);
  assert.match(page.status.textContent, /Use your browser copy command/);
  assert.doesNotMatch(page.status.textContent, /copied/i);
  assert.equal(page.copy.textContent, 'Copy official address');
  assert.equal(page.copy.disabled, false);
  assert.ok(Object.values(page.assets).every(button => !button.disabled));
  page.assets.SOL.click();
  assert.equal(page.address.textContent, page.config.SOL.address);
  assert.equal(page.status.textContent, '');
});

test('an unavailable clipboard API retains the manual-copy fallback', async () => {
  const page = loadPage({ writeText: null });
  page.copy.click();
  await settle();
  assert.equal(page.getSelectedNode(), page.address);
  assert.match(page.status.textContent, /Use your browser copy command/);
  assert.equal(page.copy.disabled, false);
});

test('missing donation configuration fails closed without enabling address copying', () => {
  const page = loadPage({ withConfig: false });
  assert.equal(page.copy.disabled, true);
  assert.equal(page.address.textContent, 'Address unavailable');
  assert.match(page.status.textContent, /Do not send funds/);
});
