# INEXTGROUP Commercial Launch Plan
Updated: 2026-11-01
Status: PLANNING — no automated publication

## Commercial business model
INEXTGROUP intends advertising revenue only, with no affiliate marketing, commissions or referral tracking. Treat TMDB use as commercial. Working API credentials alone do not grant commercial rights.

## Required release gates
1. TMDB licensing: verify current official commercial API terms and secure any necessary license or written approval covering a revenue-generating service, metadata, images, caching, rate limits and attribution. Retain written evidence.
2. Third-party rights: source/verify rights for posters, backdrops and trailers; link only to official authorized video and authorized video providers. TMDB access does not grant film or stream rights.
3. Editorial policy: draft-first, manual quality review, editorial contribution beyond a copied API overview, truthful rating/source, no bulk thin-post publication, piracy, deceptive buttons, unauthorized broadcaster brands or redirects.
4. Blogger and advertising: check then-current Blogger/Google Publisher/AdSense rules; provide About, Contact, Privacy, Terms, Copyright/DMCA contact, Editorial Policy, advertising disclosure where relevant, TMDB accreditation and required official logo. Evaluate consent/cookie obligations by visitor region. Clearly mark paid placements and sponsorships where applicable.
5. Security: TMDB token in Script Properties only; no secrets in Blogger theme, public JSON, repository or logs. Least-privilege OAuth. Protect any published Apps Script endpoints with practical authorization/rate controls and avoid uncontrolled scraping/quotas.
6. Default stop: retain TMDB_RIGHTS_REVIEWED=no until permissions verified. No real TMDB auto-posts. The fictional testBloggerDraftWrite function is strictly a draft write check.

## Target architecture
- Blogger hosts the editorial site, SEO pages, HTML theme and approved articles.
- Apps Script privately fetches TMDB data and stages drafts after rights approval.
- Public discovery cards derive from published Blogger posts. Full live TMDB catalog needs separate, license-compatible, secure and cached design.
- Revenue comes from display ads only; there are no affiliate links, commission offers or referral-tracking features. Avoid false "watch free" claims.

## Implementation priorities
P0 — Verify rights and recover a complete original-site feature inventory.
P1 — Complete privacy, contact, disclosures, copyright and proper TMDB branding.
P2 — Improve movie/TV details, loaded-published-post filters, cards, mobile and accessibility.
P3 — Add permissioned metadata staging, duplicate mappings, quotas, failure logs, editorial review and controlled updates.
P4 — Implement display-ad placements after content quality and publisher policy checks.
P5 — Stage QA, backup, verify SEO/HTTPS, connect domain only with owner approval and release.

## Acceptance checklist
- [ ] Current TMDB commercial permission and image rights documented.
- [ ] Current Blogger and Google Publisher policies reviewed.
- [ ] Advertising disclosures, privacy and consent if applicable completed.
- [ ] Security checks passed; no exposed credentials.
- [ ] Original feature gap and accessibility/mobile tests reviewed.
- [ ] Drafts manually reviewed before any public publishing.
- [ ] Domain DNS, Search Console and backups verified.
- [ ] Owner approves launch.

## Evidence and limitations
Screenshots show successful TMDB API read-only previews, Blogger draft-write test and functioning Blogger theme/homepage. These do not prove TMDB commercial licensing, AdSense eligibility, full website feature parity or live catalog features.
