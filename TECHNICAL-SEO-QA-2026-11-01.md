# INEXTGROUP Technical SEO + Performance QA — 2026-11-01
Development branch: feature/blogger-tmdb-safe
Theme source: blogger/theme.xml
Commit: 83e547e1fc031e453ac5b9ffa212be8175886a88

## Done in code
1. Keyboard skip-to-content link and focusable main content landmark.
2. Browser theme-color metadata for a consistent dark mobile interface.
3. Conditional preconnect to TMDB image host on single-item pages (no requests to the API and no token).
4. Fixed poster sizing and fallback text when remote cover image fails, with lazy loading retained.
5. Smaller-screen display handling and 16px filter form controls to reduce mobile zoom.
6. Preserved existing schema.org Movie/TVSeries generation, genre filters, native Blogger full-site search, policy footer and affiliate styles.

## Repository-only checks
- Confirmed both inline JavaScript blocks parse.
- Confirmed all Blogger b:if tags in theme are balanced.
- Confirmed no advertising script or TMDB token inserted in this change.

## Manual live checks (not yet executed)
- Blogger > Theme > Backup, then upload development branch theme.xml through Restore.
- Load homepage using mobile width 360px, open menu and test title search.
- Navigate using Tab key; skip link must appear at top when focused and jump into main.
- Open a published editorial post and a legal page, check text wrapping, single-column detail and footer.
- Disable an image URL in browser dev tools: poster fallback title should remain readable.
- Use PageSpeed Insights/Lighthouse on the public homepage and a public media post: record CWV and accessibility results, then act on real issues instead of claiming scores.
- Google Search Console > Pages: inspect indexed/canonical pages, not invented crawl statuses. Blogger provides its own canonical/head metadata; check for duplicates before adding any other canonical tags.
- Check Structured Data with Schema Markup Validator. Movie/TVSeries schema is not itself a promise of Google rich result eligibility.
- Verify HTTPS on final domain and redirect behavior after DNS setup.
- Ensure no real TMDB-derived commercial pages are published before permissions and media rights review.

## Remaining blockers
- No live Browser-based Lighthouse/network audit performed.
- Google policies, TMDB commercial terms and publisher eligibility not verified with current official texts.
- Production domain and live search/index status not confirmed.
- Rights gate: TMDB_RIGHTS_REVIEWED=no.
