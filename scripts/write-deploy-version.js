const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outFile = path.join(root, 'public', 'deploy-version.json');

function gitValue(command, fallback) {
  try {
    return execSync(command, { cwd: root, encoding: 'utf8' }).trim();
  } catch (error) {
    return fallback;
  }
}

const payload = {
  commit: gitValue('git rev-parse HEAD', 'unknown'),
  branch: gitValue('git rev-parse --abbrev-ref HEAD', 'unknown'),
  generatedAt: new Date().toISOString()
};

fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote public/deploy-version.json for ${payload.commit}`);

if (process.env.INDEXNOW_KEY) {
  const key = String(process.env.INDEXNOW_KEY).trim();
  const keyFile = path.join(root, 'public', `${key}.txt`);
  fs.writeFileSync(keyFile, `${key}\n`);
  console.log(`Wrote public/${key}.txt for IndexNow verification`);
}
