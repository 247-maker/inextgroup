# INEXTGROUP — ONE-RUN MOVIE DATABASE LAUNCH
Updated: 2026-11-01
Branch: feature/blogger-tmdb-safe
Apps Script commit: efbf33308fb3dcf7294b8b590c27b414215f6812
Core function: launchInextgroupMovieDatabase

## Purpose
Finish a substantial initial set of linked movie, TV and people pages in ONE owner-triggered run, not a sequence of multiple manual preview/draft/relink functions.

## Work performed by one run
1. Authenticated inventory of published movie/TV posts and published people.
2. Selects up to EIGHT published media articles, The Dog Stars first when present.
3. Fetches full detail fields, credits, trailers, image gallery, region release dates, alternate titles and recommendations from TMDB under the owner's stated commercial permission.
4. Publishes up to TWELVE eligible first-party people profile posts from cast, with biographies/selected filmographies (no false movie pages or external actor navigation). Skip person profiles already published or represented by a draft.
5. Refreshes the live Blogger person URL index.
6. For each selected media post, creates a PRIVATE verified Blogger backup draft before rewriting the HTML with premium responsive poster/backdrop, cast, crew, related Movies/TV and real first-party Actor Profile links. Keeps the original post ID, post URL, title and labels.
7. Tries short bounded backoffs for transient Blogger API 429 or 5xx failures, and returns completed URLs and any errors.
8. Appends no ad or affiliate code. No automated timed trigger is created.

## How to deploy once
1. Blogger > Theme > Backup. Upload latest blogger/theme.xml from feature/blogger-tmdb-safe via Theme > Restore. Note: GitHub cannot automatically deploy to Blogger.
2. Apps Script > Code.gs: make a backup, paste latest branch version into existing INEXTGROUP TMDB Automation and Save.
3. Check that existing Script Properties TMDB_READ_TOKEN, BLOGGER_BLOG_ID, and TMDB_RIGHTS_REVIEWED=yes reflect your approved account and permission. Never paste tokens in chat or GitHub. Confirm person images/biographies are within the permission's scope.
4. **Run launchInextgroupMovieDatabase once.** This is not a preview: it publishes profile pages and rewrites up to eight already-published media articles, with backups.
5. Inspect Execution Log publishedPeople, updatedMovies, errors, and actual public URLs.
6. Test public https://inextcloud.blogspot.com/2026/11/the-dog-stars-2026-movie-details.html and one Actor Profile; test mobile.
7. When published URLs are visible in /sitemap.xml, submit site sitemap to verified Google Search Console and inspect a sample of actual article URLs. Sitemap success does not imply Google indexing.
8. If the site has more than eight published media posts or not all cast profiles are present, the same function can be rerun after reviewing output and quotas. It skips published person pages and verifies previous backups. Do not repeatedly spam the API when Google returns quota errors.

## Caveats
- This operation overwrites existing media-post HTML after backing it up. Any unique custom editorial text is preserved in the backup, but not automatically merged into new metadata output. Restore custom writing manually from the matching 'INTERNAL BACKUP' Blogger draft if needed.
- Actor profiles are based on licensed TMDB biographies and credits; add original editorial value and verify facts. No commercial license text was inspected; owner affirmed commercial rights.
- Only published INEXTGROUP URLs become links. Missing people/movie pages are shown as text instead of external TMDB navigation.
- The dataset is not the entire TMDB universe; this is an indexed first-party graph built from published Blogger entries. Pagination/scale remains limited by Apps Script and Blogger quotas.
- The exact live page content could not be fetched by the public browsing tool; source-code and mock-render tests do not prove the live deployment.
- Production license attribution and official logo requirements, AdSense approval, privacy/cookie compliance, and unique editorial quality remain separate obligations.
- The assistant cannot click Run in the user's private Apps Script or restore a Blogger theme through GitHub. Owner executes those actions from their signed-in account.

## Static tests
- Latest Code.gs parses as JavaScript.
- Three inline theme scripts parse; Blogger conditional element counts are balanced.
- Mock film includes real first-party person and related-media links; no external TMDB person links or fabricated ratings.
