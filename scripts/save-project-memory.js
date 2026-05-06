const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const memoryPath = path.join(root, 'memory', 'PROJECT_CONTEXT.md');

function run(command) {
  try {
    return execSync(command, { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unavailable in current sandbox';
  }
}

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function getAddressConfigSummary() {
  const config = read(path.join(root, 'public', 'js', 'site-config.js'));
  const addresses = [...config.matchAll(/(contractAddress|address): '([^']+)'/g)].map((match) => `- ${match[1]}: ${match[2]}`);
  return addresses.join('\n');
}

function main() {
  const now = new Date().toISOString();
  const branch = process.env.GITHUB_REF_NAME || run('git branch --show-current');
  const head = process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 7) : run('git rev-parse --short HEAD');
  const status = run('git status --short');
  const latestCommit = run('git log -1 --pretty=format:"%h %s"');
  const addressSummary = getAddressConfigSummary();

  const snapshot = `

## Memory Snapshot ${now}

- Branch: ${branch}
- Head: ${head}
- Latest commit: ${latestCommit}
- Working tree: ${status === 'unavailable in current sandbox' ? status : (status || 'clean').split('\n').join('; ')}

### Address Config Snapshot

${addressSummary || '- No address config found.'}
`;

  fs.appendFileSync(memoryPath, snapshot);
  console.log(`Saved project memory snapshot to ${path.relative(root, memoryPath)}`);
}

main();
