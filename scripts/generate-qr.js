// Builds one QR code SVG per official donation address from the canonical config,
// so a QR image can never drift from the address shown as text.
const fs = require('node:fs');
const path = require('node:path');
const QRCode = require('qrcode');
const { loadSiteConfig, networkSlug } = require('./lib/site-config');

const outDir = path.join(__dirname, '..', 'public', 'assets', 'qr');

async function main() {
  const { donations } = loadSiteConfig();
  fs.mkdirSync(outDir, { recursive: true });
  const written = new Map();
  for (const { network, address } of Object.values(donations)) {
    const slug = networkSlug(network);
    if (written.has(slug)) {
      if (written.get(slug) !== address) throw new Error(`Network ${network} has more than one address; give each its own QR slug.`);
      continue;
    }
    const svg = await QRCode.toString(address, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#102033', light: '#ffffff' } });
    fs.writeFileSync(path.join(outDir, `${slug}.svg`), svg);
    written.set(slug, address);
  }
  for (const stale of fs.readdirSync(outDir)) {
    if (!written.has(stale.replace(/\.svg$/, ''))) fs.rmSync(path.join(outDir, stale));
  }
  console.log(`Generated ${written.size} donation QR codes: ${[...written.keys()].join(', ')}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
