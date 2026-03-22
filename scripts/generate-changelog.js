import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.resolve(__dirname, '..');
const publicPath = path.resolve(rootPath, 'public');

const pkgPath = path.resolve(rootPath, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const currentVersion = pkg.version;

const changelogJsonPath = path.resolve(publicPath, 'changelog.json');
const changelogPath = path.resolve(rootPath, 'CHANGELOG.md');

if (!fs.existsSync(changelogPath)) {
  console.log(`[generate-changelog] No CHANGELOG.md found. Writing fallback notes for v${currentVersion}`);
  fs.writeFileSync(changelogJsonPath, JSON.stringify([], null, 2));
  process.exit(0);
}

const changelogContent = fs.readFileSync(changelogPath, 'utf-8');

const versionRegex = /^###? \[?(\d+\.\d+\.\d+)\]?.*$/gm;
let match;
const versions = [];
while ((match = versionRegex.exec(changelogContent)) !== null) {
  versions.push({ version: match[1], index: match.index });
}

const allReleases = [];

for (let i = 0; i < versions.length; i++) {
  const v = versions[i];
  const nextV = versions[i + 1];
  const endIndex = nextV ? nextV.index : changelogContent.length;
  const block = changelogContent.slice(v.index, endIndex);
  
  const bulletRegex = /^[*-]\s+(.+)$/gm;
  const changes = [];
  let bulletMatch;
  while ((bulletMatch = bulletRegex.exec(block)) !== null) {
    let text = bulletMatch[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    text = text.replace(/\s*\([^)]+\)$/, '');
    text = text.charAt(0).toUpperCase() + text.slice(1);
    changes.push(text.trim());
  }

  const force = block.includes('[FORCE]');
  
  // Optionally map conventional commit titles to generic ones for i18n
  allReleases.push({
    version: v.version,
    changes,
    force
  });
}

fs.writeFileSync(changelogJsonPath, JSON.stringify(allReleases, null, 2));
console.log(`[generate-changelog] Successfully generated changelog.json with ${allReleases.length} releases.`);
