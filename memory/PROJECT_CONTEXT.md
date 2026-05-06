# ALI Charity Project Context

Last updated: 2026-05-06

## Core Properties

- Main site: https://minadoai.com
- Main site deployment: Render.com
- Main repository: https://github.com/minadoalisn/alitonk
- Blog site: https://alicharity.blog
- Blog deployment: Netlify
- Blog repository: git@github.com:minadoalisn/alicharity.blog.git
- Netlify Site ID: 9f6beac0-9ef6-4aaa-a766-680ce5dd71e8
- Local workspace: D:\ALI币慈善项目\alitonk

## Token And Donation Addresses

- ALI Token BSC contract: 0x4de5F4ac5daC9667eD38A09B908B6Ee7D6E06E79
- USDT / ETH / BNB donation address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- BTC donation address: bc1p6tc7jxjgtzdm2rf9vmxjjkkghz3kgfplmm93yll9km90kjmxuw0shcs4cq
- SOL donation address: HT98k9x4WEQMNbFzrLrJkfjF9ytE116UengPf7NWDweT
- Canonical address config: public/js/site-config.js

## Deployment Configuration

- Render static config: render.yaml
- Netlify config: netlify.toml
- Local static server: server.js
- Build command: npm run build
- Start command: npm start
- Static publish directory: public

## Automation

- Weekly blog promotion workflow: .github/workflows/weekly-blog-promotion.yml
- Blog promotion script: scripts/generate-blog-promotion.js
- Command: npm run blog:promotion
- Deployment health workflow: .github/workflows/deployment-health.yml
- Deployment health command: npm run deploy:check
- Codex scheduled check: weekly-blog-promotion-check

## Recent Work

- Fixed missing root server.js for Render-style Node startup.
- Added root render.yaml and netlify.toml.
- Added contact page, 404 page, logo.png, and og-image.jpg.
- Improved homepage UI with public/css/site-polish.css.
- Added automated weekly blog promotion article generation.
- Centralized ALI Token and donation addresses in public/js/site-config.js.
- Added automated deployment health checks for minadoai.com and alicharity.blog.

## Operating Rules For Future Codex Work

- Read this file before making deployment, SEO, token address, blog, or homepage UI changes.
- Check git status before editing.
- Do not commit .netlify/state.json or environment files.
- Keep public/js/site-config.js as the single source of truth for token and donation addresses.
- Run npm run build after meaningful changes.
- Run npm run deploy:check after deployment or promotion-flow changes.
- For UI changes, verify the affected pages locally through server.js.
- Commit and push to origin/main after user-approved production changes.


## Memory Snapshot 2026-05-06T15:22:10.215Z

- Branch: unknown
- Head: unknown
- Latest commit: unknown
- Working tree: clean

### Address Config Snapshot

- contractAddress: 0x4de5F4ac5daC9667eD38A09B908B6Ee7D6E06E79
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: bc1p6tc7jxjgtzdm2rf9vmxjjkkghz3kgfplmm93yll9km90kjmxuw0shcs4cq
- address: HT98k9x4WEQMNbFzrLrJkfjF9ytE116UengPf7NWDweT


## Memory Snapshot 2026-05-06T15:23:06.363Z

- Branch: unavailable in current sandbox
- Head: unavailable in current sandbox
- Latest commit: unavailable in current sandbox
- Working tree: unavailable in current sandbox

### Address Config Snapshot

- contractAddress: 0x4de5F4ac5daC9667eD38A09B908B6Ee7D6E06E79
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: bc1p6tc7jxjgtzdm2rf9vmxjjkkghz3kgfplmm93yll9km90kjmxuw0shcs4cq
- address: HT98k9x4WEQMNbFzrLrJkfjF9ytE116UengPf7NWDweT
