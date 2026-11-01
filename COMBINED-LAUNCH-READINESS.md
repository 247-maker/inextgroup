# INEXTGROUP — Combined Launch Readiness (2026-11-01)
Branch: feature/blogger-tmdb-safe
Apps Script: apps-script/Code.gs (latest commit af2b770793ab0761a26306894d7e89598693275e)
Status: REPOSITORY READY FOR A SINGLE AUDIT; commercial production not approved.

## What the user's screenshot verifies
- Apps Script audit finished executing.
- https://inextcloud.blogspot.com/sitemap.xml returned HTTP 200 with XML and locCount 0.
- https://inextcloud.blogspot.com/sitemap-pages.xml returned HTTP 200 with XML and locCount 7.
- The screenshot does not show full homepage canonical or robots details and does not establish Google indexing.
- Zero URLs in the posts sitemap means no post URLs were listed in this response, not necessarily proof that no post could be indexed. Determine why with authenticated Blogger published-post inventory.

## Consolidated development now in place
1. Blogger responsive dark discovery theme: homepage cards from actual publicly rendered published posts, movie/TV label navigation, genre/year/type filters limited to the loaded set, full-site Blogger search fallback, poster failure fallback, keyboard skip link and responsive footer legal PageList.
2. Movie and TV detail UI: poster, type, source-attributed metadata, optional cast and official trailer previews, accessible page breadcrumb and schema.org Movie/TVSeries on qualifying published pages.
3. Draft-only TMDB/Google Apps Script integration with Script Properties for secrets, max import limits and rights flag: TMDB_RIGHTS_REVIEWED=no.
4. Technical read-only diagnostics: previewHomepageCatalog, auditPublicSeoEndpoints, and new runFullSiteReadinessAudit.
5. Seven legal/commercial draft pages and disclosed affiliate-card template are in repository. User says policy content will be finalized later.
6. runFullSiteReadinessAudit checks authenticated published posts and pages, detects low-content or test posts, missing labels, duplicate titles, placeholder policies, and aggregates SEO endpoint results; it does not create or publish anything.

## One action instead of repetitive tests
- Make a backup of current Apps Script Code.gs and paste the latest repository Code.gs into the existing Apps Script project; leave Properties untouched.
- Run **runFullSiteReadinessAudit**. It reads public sitemap/robots/home and the blog's published items via Blogger API. Only one consolidated log is needed.
- Examine counts and flaggedPosts/flaggedPages. Do not treat empty post sitemap as a broken sitemap if no published posts exist.
- No Theme restore is needed for this Apps Script-only change.

## Release gates
- Commercial API/data/poster license or explicit applicable written permission: **not established**.
- Real original editorial articles worth indexing: **not confirmed**.
- All policy placeholders and owner contacts verified: **not confirmed**.
- Search Console verification, submitted sitemap status, chosen canonical domain and DNS/HTTPS: **not confirmed**.
- AdSense approval, active ads and affiliate partners/consent: **not confirmed**.
- Browsing user or Blogger staging site and performance numbers from this environment: **not verified**.

## Important editorial boundary
Do NOT set TMDB_RIGHTS_REVIEWED=yes simply to generate mass posts. Do NOT publish fictional API tests. When commercial rights are cleared, use manual editorial approval and meaningful original reporting/analysis, then publish selectively. The presence of empty sitemap posts is a publication/content problem, not an invitation to create low-value automated pages.

## Deployment notes
- All repository changes are on feature/blogger-tmdb-safe; main untouched.
- The user must copy Apps Script changes to the live standalone project; repository commits do not synchronize automatically.
- Any later Blogger theme update should first backup and use Restore, then test footer PageList and item views.
