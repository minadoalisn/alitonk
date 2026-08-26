# ALI Charity Static Site UX Audit

Date: 2026-08-26  
Scope: homepage, donation flow, core trust routes, static delivery, and GEO publication controls.

## Outcome

The optimized static core passed desktop and 390 px mobile review. The donation journey now exposes one asset selector, one official address, one copy action, and one network-specific send checklist. No wallet connection, signature request, contact form, or browser-only donation claim remains.

## Evidence

- Desktop homepage: `artifacts/final-ux-2026-08-26/01-home-desktop.png`
- Mobile homepage: `artifacts/final-ux-2026-08-26/02-home-mobile.png`
- Mobile USDT donation: `artifacts/final-ux-2026-08-26/03-donate-usdt-mobile.png`
- Mobile BTC selection and copy feedback: `artifacts/final-ux-2026-08-26/04-donate-btc-copy-mobile.png`
- Desktop donation: `artifacts/final-ux-2026-08-26/05-donate-desktop.png`

Screenshots are local verification artifacts and intentionally excluded from deployment.

## Verified behavior

- Homepage and donation page each contain one descriptive H1.
- The homepage shows no synthetic donation, project, expenditure, or mixed-currency totals.
- Placeholder and pending records are rejected before public summary rendering.
- USDT defaults to BNB Smart Chain and the BscScan address view.
- BTC switches to the Bitcoin network and the matching mempool.space address view.
- Copy feedback is exposed through a live status region (`Official address copied.`).
- The 390 px layouts have no horizontal overflow; the homepage donation action remains visible without covering content.
- Skip links, semantic regions, native buttons, radio roles, details disclosure, and visible keyboard focus are present.
- Browser console review found no warnings or errors on the final donation page.
- `/`, `/donate.html`, `/donor-safety.html`, `/about.html`, `/blog/`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/data/donations.json`, and `/js/site-config.js` returned HTTP 200 from the read-only local server.
- The GEO audit scored the homepage, donation page, donor-safety page, transparency method, and blog index at 10/10 under the repository's evidence-led rubric.

## Limits

This review verifies rendered desktop/mobile states, core semantics, keyboard-oriented controls, route health, and console output. It is not a formal WCAG conformance certification and does not replace testing with assistive-technology users.
