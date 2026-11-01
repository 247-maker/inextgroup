# INEXTGROUP — Movie and People Database Upgrade
Date: 2026-11-01
Branch: feature/blogger-tmdb-safe
Apps Script commit: bc4d11a1f9629f3a0d54e4f551a831bf106b5ee8
Blogger theme commit: 39ee4dabbbefcf35d57687df34474bed70e9e8b9

## User report
Verity Blogger published media page exists, but user reports names in cast section are not clickable and internal links are missing. Direct fetch of the specific public Blogger URL was not available through external web browsing, so its exact rendered HTML and indexing have NOT been verified independently.

## Code delivered
- In new movie/TV detail drafts, cast names are clickable to official TMDB person IDs from credit data.
- For **existing** published Blogger media articles, previewMovieDatabaseUpgrade() inventories linked TMDB IDs, actual published person pages and public media links.
- upgradePublishedMovieDatabase() enriches at most six published media entries per execution. Default is **dry run**, and it makes no writes unless the owner explicitly sets INEXT_DB_DRY_RUN=no in Script Properties. It adds click-through cast-profile links and a related-title module with **only real published internal URLs**; missing people profiles link out to their actual TMDB page. It does not replace original body or remove owner editorial content.
- preparePersonProfileDrafts() collects up to three cast people from existing published movie/TV articles, fetches biography and selected credits with TMDB person + combined_credits APIs, and creates **drafts** under People. Missing or too-short biographies are skipped. Credits that match published Movie/TV titles link to their true internal Blogger URL; others link to TMDB.
- Once the People drafts are reviewed and published, re-run upgradePublishedMovieDatabase to update the dedicated Cast Profiles module to link internally where real public person URLs now exist.
- Blogger theme gets People link in top navigation and responsive biography, cast, filmography and Related Titles CSS.

## Practical sequence (after backup)
1. Copy latest apps-script/Code.gs into the existing Apps Script project and Save. Leave existing TMDB token untouched; do not share it.
2. Run previewMovieDatabaseUpgrade (READ ONLY). Verify mediaCount and sample entries include the known Verity post.
3. Keep rights flag yes ONLY if owner's actual commercial license covers content and images.
4. In Script Properties set INEXT_DB_DRY_RUN=no for the run that should **modify published content**. Run upgradePublishedMovieDatabase. It updates at most 6 existing published media posts; up to one small Blogger write per media post. If HTTP 429 occurs, stop and inspect before retrying.
5. Open the public Verity URL. In its new Cast Profiles module names link to TMDB person pages; Related Movies links to published INEXTGROUP movie posts when any exist. A valid Movies category link appears even if no related posts exist.
6. Run preparePersonProfileDrafts. Review up to three Blogger People Drafts for accuracy and originality, then publish approved profiles.
7. Run upgradePublishedMovieDatabase again; its separate Cast Profiles module now points to internal INEXTGROUP people URLs where published profiles exist. If none exist, it still offers working official TMDB person profile links.
8. Install the latest blogger/theme.xml through Blogger Theme > Backup > Restore to show People navigation and improved styling. Recheck Pages gadget and footer links after restore.
9. Verify internal links, movie and actor profiles, published sitemap URLs and Google Search Console URL Inspection. No mass auto publication of person profiles.

## Important caveats
- Blogger is a blog CMS, not a dedicated relational movie database. These functions provide a link graph based on published Blogger posts, not a complete full-TMDB index.
- Only currently published Blogger media posts are eligible for related-link matches.
- No fictional person profile, movie ID, release date, or missing URL is invented.
- Google indexing and rich-result eligibility are not guaranteed.
- The Apps Script code has passed static JS parse only; the Blogger API write and live rendered page still require the owner's actual authorized execution and verification.
- Ensure user-supplied TMDB commercial license includes person photographs and biography metadata.
- No affiliate scripts were added; advertising remains owner-controlled in Blogger Layout.
