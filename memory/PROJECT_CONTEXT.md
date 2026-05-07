# ALI Charity Project Context

Last updated: 2026-05-06

## Core Properties

- Main site: https://minadoai.com
- Main site deployment: Render.com
- Main repository: https://github.com/minadoalisn/alitonk
- Primary promotion hub: https://minadoai.com/blog/
- Legacy blog site, paused: https://alicharity.blog
- Legacy blog deployment: Netlify
- Legacy blog repository: https://github.com/minadoalisn/alicharity.blog
- Netlify Site ID, legacy only: 9f6beac0-9ef6-4aaa-a766-680ce5dd71e8
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
- ALI Charity server IP: 43.160.238.228
- ALI Charity server SSH user: ubuntu
- ALI Charity server SSH port: 22
- Local SSH identity path, if configured: ~/.ssh/alitonk_key
- Do not store server private keys in this repository or memory file.

## Automation

- Daily main-site blog promotion workflow: .github/workflows/weekly-blog-promotion.yml
- Blog promotion script: scripts/generate-blog-promotion.js
- Command: npm run blog:promotion
- Legacy standalone blog repo initialized at D:\ALI币慈善项目\alicharity.blog but paused for promotion work.
- Legacy standalone blog repo workflow: .github/workflows/daily-blog-promotion.yml
- Canonical promotion article path: https://minadoai.com/blog/news/<slug>.html
- Standalone Netlify blog is no longer the primary promotion path.
- Deployment health workflow: .github/workflows/deployment-health.yml
- Deployment health command: npm run deploy:check
- Codex scheduled check: weekly-blog-promotion-check

## Recent Work

- Fixed missing root server.js for Render-style Node startup.
- Added root render.yaml and netlify.toml.
- Added contact page, 404 page, logo.png, and og-image.jpg.
- Improved homepage UI with public/css/site-polish.css.
- Added automated daily main-site blog promotion article generation.
- Centralized ALI Token and donation addresses in public/js/site-config.js.
- Added automated deployment health checks for minadoai.com, main-site blog pages, and legacy alicharity.blog.
- Created and initialized minadoalisn/alicharity.blog as a standalone Netlify-ready static blog repository.
- Pivoted promotion strategy away from Netlify blog complexity to the main-site blog under minadoai.com/blog/.
- Added original generated local homepage and blog images under public/assets/images and public/blog/assets to avoid stock-photo hotlinks.
- Updated homepage UI toward global donor habits for US/EU trust scanning, Middle East cross-border aid context, and Southeast Asia mobile-first access.
- Added blog-index.css and daily article image defaults so generated promotion posts include compressed illustrations, Open Graph images, and lazy-loaded thumbnails.
- Added public/llms.txt for AI-readable GEO context.

## Operating Rules For Future Codex Work

- Read this file before making deployment, SEO, token address, blog, or homepage UI changes.
- Check git status before editing.
- Do not commit .netlify/state.json or environment files.
- Keep public/js/site-config.js as the single source of truth for token and donation addresses.
- Run npm run build after meaningful changes.
- Run npm run deploy:check after deployment or promotion-flow changes.
- For server work, use SSH only if the private key already exists locally at ~/.ssh/alitonk_key or is provided through a secure secret manager.
- For UI changes, verify the affected pages locally through server.js.
- User has pre-approved automatic deployment for future website updates, optimizations, UI changes, and feature work. After local verification passes, commit and push to origin/main, then run npm run deploy:check without asking for separate deployment approval each time.


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


## Memory Snapshot 2026-05-06T15:53:30.941Z

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


## Memory Snapshot 2026-05-07T01:46:11.387Z

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


## Memory Snapshot 2026-05-07T14:01:42.795Z

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


## Memory Snapshot 2026-05-07T14:32:38.594Z

- Branch: main
- Head: 2d4dac9
- Latest commit: 2d4dac9 Optimize global UI and generated blog imagery
- Working tree: M memory/PROJECT_CONTEXT.md;  M public/css/site-polish.css;  M public/index.html; ?? public/assets/images/projects/

### Address Config Snapshot

- contractAddress: 0x4de5F4ac5daC9667eD38A09B908B6Ee7D6E06E79
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: bc1p6tc7jxjgtzdm2rf9vmxjjkkghz3kgfplmm93yll9km90kjmxuw0shcs4cq
- address: HT98k9x4WEQMNbFzrLrJkfjF9ytE116UengPf7NWDweT


## Memory Snapshot 2026-05-07T14:43:26.272Z

- Branch: main
- Head: 160d00d
- Latest commit: 160d00d Refresh homepage project imagery
- Working tree: M public/admin-login.html;  M public/dashboard.html

### Address Config Snapshot

- contractAddress: 0x4de5F4ac5daC9667eD38A09B908B6Ee7D6E06E79
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: bc1p6tc7jxjgtzdm2rf9vmxjjkkghz3kgfplmm93yll9km90kjmxuw0shcs4cq
- address: HT98k9x4WEQMNbFzrLrJkfjF9ytE116UengPf7NWDweT


## Memory Snapshot 2026-05-07T14:54:33.997Z

- Branch: main
- Head: 160d00d
- Latest commit: 160d00d Refresh homepage project imagery
- Working tree: M .gitignore;  M memory/PROJECT_CONTEXT.md;  M public/admin-login.html;  M public/dashboard.html;  M server.js

### Address Config Snapshot

- contractAddress: 0x4de5F4ac5daC9667eD38A09B908B6Ee7D6E06E79
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: bc1p6tc7jxjgtzdm2rf9vmxjjkkghz3kgfplmm93yll9km90kjmxuw0shcs4cq
- address: HT98k9x4WEQMNbFzrLrJkfjF9ytE116UengPf7NWDweT


## Memory Snapshot 2026-05-07T15:09:41.041Z

- Branch: main
- Head: 160d00d
- Latest commit: 160d00d Refresh homepage project imagery
- Working tree: M .gitignore;  M memory/PROJECT_CONTEXT.md;  M public/admin-login.html;  M public/dashboard.html;  M public/data/donations.json;  M server.js

### Address Config Snapshot

- contractAddress: 0x4de5F4ac5daC9667eD38A09B908B6Ee7D6E06E79
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: bc1p6tc7jxjgtzdm2rf9vmxjjkkghz3kgfplmm93yll9km90kjmxuw0shcs4cq
- address: HT98k9x4WEQMNbFzrLrJkfjF9ytE116UengPf7NWDweT


## Memory Snapshot 2026-05-07T15:13:31.381Z

- Branch: main
- Head: 160d00d
- Latest commit: 160d00d Refresh homepage project imagery
- Working tree: M .gitignore;  M memory/PROJECT_CONTEXT.md;  M public/admin-login.html;  M public/dashboard.html;  M public/data/donations.json;  M server.js

### Address Config Snapshot

- contractAddress: 0x4de5F4ac5daC9667eD38A09B908B6Ee7D6E06E79
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: bc1p6tc7jxjgtzdm2rf9vmxjjkkghz3kgfplmm93yll9km90kjmxuw0shcs4cq
- address: HT98k9x4WEQMNbFzrLrJkfjF9ytE116UengPf7NWDweT


## Memory Snapshot 2026-05-07T15:26:07.851Z

- Branch: main
- Head: 1bd238f
- Latest commit: 1bd238f Record automatic deployment preference
- Working tree: M public/blog/news.html;  M public/blog/sitemap.xml;  M public/index.html;  M public/llms.txt;  M public/sitemap.xml; ?? public/blog/news/2026-05-07-kraken-parent-payward-to-buy-reap-in-600m-stablecoin-payments-push-charity-transparency.html; ?? public/promotion.html

### Address Config Snapshot

- contractAddress: 0x4de5F4ac5daC9667eD38A09B908B6Ee7D6E06E79
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: bc1p6tc7jxjgtzdm2rf9vmxjjkkghz3kgfplmm93yll9km90kjmxuw0shcs4cq
- address: HT98k9x4WEQMNbFzrLrJkfjF9ytE116UengPf7NWDweT


## Memory Snapshot 2026-05-07T16:48:33.225Z

- Branch: main
- Head: da84f72
- Latest commit: da84f72 Add autonomous promotion hub and briefing
- Working tree: M public/blog/index.html;  M public/blog/sitemap.xml;  M public/index.html;  M public/llms.txt;  M public/promotion.html;  M public/sitemap.xml;  M public/token-dashboard.html; ?? public/blog/ali-token-dex-launch-preparation.html; ?? public/blog/crypto-philanthropy-trends-2026-stablecoin-aid-transparent-giving.html; ?? public/dex-launch.html

### Address Config Snapshot

- contractAddress: 0x4de5F4ac5daC9667eD38A09B908B6Ee7D6E06E79
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: 0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC
- address: bc1p6tc7jxjgtzdm2rf9vmxjjkkghz3kgfplmm93yll9km90kjmxuw0shcs4cq
- address: HT98k9x4WEQMNbFzrLrJkfjF9ytE116UengPf7NWDweT
