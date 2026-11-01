# INEXTGROUP: Blogger Sitemap, Canonical, Robots & Search Console
Updated: 2026-11-01
Branch: feature/blogger-tmdb-safe
Apps Script audit commit: c2417669671714ddd762c9155a7acd075b5c79fd

## Current state
- Existing theme includes Blogger's native all-head-content; it does not manually insert a second canonical or robots meta tag.
- Added auditPublicSeoEndpoints() to Apps Script. It checks public endpoints without needing TMDB or Blogger API credentials and does not publish anything.
- No Google indexing, crawl, or page experience results have been verified live in this change.

## How to run the audit
1. Open Apps Script project "INEXTGROUP TMDB Automation".
2. Copy the newest apps-script/Code.gs from the development branch into the editor. Keep existing Script Properties and make a safe backup first.
3. In Project Settings > Script Properties, optionally add PUBLIC_SITE_URL = https://inextcloud.blogspot.com. This is also the default. Once the custom domain is connected correctly, update to https://inextgroup.cloud only after the domain resolves to the active site.
4. Run auditPublicSeoEndpoints from the function dropdown.
5. In Execution log check Homepage, robots.txt, Post sitemap and Page sitemap. A 200 is a healthy endpoint response, **not** indexing confirmation; inspect canonicalCount/canonicalUrl and robotsMeta for potential issues.

## Recommended Blogger configuration (check, do not blindly overwrite)
- Settings > Privacy > Visible to search engines: turn on when the site is ready for indexing and has public, legal, original content. Staging sites may deliberately leave this off.
- Settings > Meta tags > Enable search description; set an accurate short site description, e.g.: "Discover independently reviewed movie and TV information, release details and official trailers on INEXTGROUP." Do not claim reviews exist until editorially published.
- Individual posts: use Blogger's Search Description field for unique summaries; avoid copying the same text to every page.
- Settings > Crawlers and indexing: Blogger usually manages its robots.txt and custom robots header tags. Do not turn on custom robots.txt or custom robots header tags without a verified need. Misconfiguration can block /search, homepage, pages and posts.
- Search Console: verify site ownership. For staging use URL-prefix property https://inextcloud.blogspot.com/; after domain is live add/verify the correct domain property or protocol-specific URL prefix.
- Submit https://inextcloud.blogspot.com/sitemap.xml and, if publicly accessible and appropriate, https://inextcloud.blogspot.com/sitemap-pages.xml in Search Console > Sitemaps. For a validated custom domain, submit corresponding URLs on that host. Avoid submitting a post-feed as a made-up sitemap.
- Search Console > URL Inspection: check a representative published movie editorial post, TV post and policy page. Record Live Test, page indexability and Google's selected canonical versus user-declared canonical.
- Search Console > Pages: distinguish Crawled - currently not indexed, Discovered - currently not indexed, Duplicate/Google chose different canonical, Blocked by robots.txt, Alternate page with proper canonical, Soft 404 and Server error. Fix only actual reported issues.
- Blogger template's built-in canonical/head output can change; **inspect rendered HTML** for a single canonical tag before adding custom ones.
- Confirm that duplicate Blogspot and custom-domain URLs redirect consistently; do not create conflicting canonical tags or robots instructions.
- Do not set noindex for all pages because only internal test drafts exist. Drafts are not public; use editorial go-live gates before submitting real posts.

## Manual QA URLs
- https://inextcloud.blogspot.com/
- https://inextcloud.blogspot.com/robots.txt
- https://inextcloud.blogspot.com/sitemap.xml
- https://inextcloud.blogspot.com/sitemap-pages.xml

## Before launch
- Confirm TMDB commercial permission and rights to use any posters/metadata.
- No streaming/download/piracy links.
- Confirm real privacy, disclosure, contact information and any consent mechanism.
- Verify domain DNS, HTTPS, redirected canonical host and responsive theme.
- Do not claim Search Console or AdSense approval from a successful endpoint check.

## Known limitations
This Apps Script audit is a fast public HTTP/markup smoke test, not a crawler, browser render test, Search Console connector, or legal review. Google indexing is never guaranteed.
