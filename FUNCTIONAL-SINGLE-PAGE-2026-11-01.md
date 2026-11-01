# INEXTGROUP — Functional TMDB-Style Single Movie/TV Page
Updated: 2026-11-01
Branch: feature/blogger-tmdb-safe
Sample: The Dog Stars (TMDB movie ID 1384216)
Published target: https://inextcloud.blogspot.com/2026/11/the-dog-stars-2026-movie-details.html

## Requirement
The owner rejected a static cinematic detail page. A usable film database must offer interactive content navigation similar in functionality (not a visual/code clone of TMDB): Cast & Crew, full details, gallery, reviews, related titles, and TV seasons.

## Implemented
1. Accessible functional **tabs**: Overview; Cast & Crew; Media; Details; Reviews (only if third-party review count available); Related. Tabs are built from actual article sections, hide/show panels, support arrow/Home/End keyboard navigation and accessible tab/tabpanel relationships.
2. Navigation honors URL hashes; no-js fallback leaves the article content visible.
3. Responsive gallery **image lightbox** using native dialog, Escape close, left/right picture navigation and keyboard-operable images.
4. Cast explorer supports name/character search and Show All/Show Fewer, displaying up to 60 real TMDB cast entries with roles and lazy-loaded photos. The heading gives the actual displayed/total count.
5. TV Seasons section uses real TMDB season names, posters, airdates, episode counts and expandable descriptions using native details; never invents episodes or links.
6. Person names are linked ONLY to real published INEXTGROUP actor profile URLs. Unknown profiles remain text rather than forwarding to TMDB.
7. Related Movie/TV and Filmography navigation uses real, published first-party links and domain-independent relative paths.
8. Original premium page design continues to show hero poster/backdrop, rating with source count, official studio-verified information, release dates, key crew, production details, gallery and trusted trailer links.
9. Structured data from visible information and original guides / database launch workflow remain integrated.

## Deployment (ONE pass)
1. Download the latest blogger/theme.xml from branch feature/blogger-tmdb-safe, back up your live Blogger Theme and Restore the new XML. Existing posts need upgraded rich markup for all tabs.
2. Back up existing Apps Script Code.gs, then replace it with latest apps-script/Code.gs, Save; do not change the private TMDB_READ_TOKEN or BLOGGER_BLOG_ID.
3. In Apps Script select **finishInextgroupWebsiteLaunch** and Run ONCE if the content hasn't already been published. It creates seven original Guides when not present, up to twelve first-party actor profiles, and upgrades up to eight existing published movie/TV posts, with verified private Blogger backup drafts.
4. If the earlier launch already ran and all editorial content is present, run **upgradePublishedMovieDetailsBatch** instead to rerender up to six existing Movie/TV articles using the latest template; do not run both needlessly.
5. Open real published film and TV URLs. Test all tabs, Cast filter, gallery enlargement, season accordions, Actor first-party links, related movie URLs, mobile view, browser keyboard and source attribution.
6. No domain change is required now. Existing Blogspot URLs remain usable until Blogger accepts custom domain; generated relative links will automatically use the active host.
7. Inspect Blogger backup drafts before deleting anything. Rich regeneration replaces existing metadata body; unique user editorial text needs manual preservation/merge.

## Tested
- Code.gs JavaScript parses; mocked movie with 68 actors renders 60 cast cards and accurate count.
- Actor and related movie links render as relative first-party URLs, never TMDB actor navigation.
- Mock TV record renders expanding season card(s).
- All four Blogger inline JavaScript scripts parse; conditional tags balance.
- Cast filter and tab DOM behavior are implemented but NOT browser-tested on live Blogger because no account/browser write access is available.

## Remaining constraints
- The user's current published Blogger page will not change until new Theme and Code.gs are installed and the upgrade function runs. GitHub commits do not automatically deploy.
- Profile links cannot be clickable until corresponding first-party actor biographies are actually published. Existing launch run covers a bounded set of profiles, not all actors.
- This is a Blogger implementation with server-generated content and client-side tabs, not TMDB's backend or full global catalogue. Reviews are third-party counts only, not re-hosted user-generated texts.
- Live domain, legal policies, AdSense readiness, authorized TMDB commercial asset usage, original editorial content and Search Console indexing still require production review.
