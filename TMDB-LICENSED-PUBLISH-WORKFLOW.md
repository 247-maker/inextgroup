# INEXTGROUP — TMDB commercial workflow, owner confirmed permission
Updated: 2026-11-01
Source: apps-script/Code.gs
Branch: feature/blogger-tmdb-safe
Code commit: 940decc444f9ab9ad012f1582f4579180d5ceeb9

## Permission scope
The owner states they received commercial permission from TMDB. Record the agreement and ensure it covers the API, movie/TV data, posters/backdrops, advertising use, attribution, geographic scope, limits, expiration and any third-party restrictions. The code does not establish whether the claimed license covers specific assets. Do not share credentials or private agreements in public GitHub.

## One batch from API to actual Blogger movie URLs
1. Back up current Apps Script Code.gs. Copy and save the latest code from this branch in the existing INEXTGROUP TMDB Automation Apps Script project.
2. In Apps Script Project Settings > Script Properties, change TMDB_RIGHTS_REVIEWED from no to yes **only if the applicable agreement indeed covers the intended commercial data and imagery**.
3. Select prepareLicensedTmdbDraftBatch and Run. The function fetches trending/popular movies and TV, prevents duplicates against published posts and existing drafts, and creates at most 6 real Blogger DRAFTS. It never publishes.
4. Blogger > Posts > Drafts: open each new TMDB-labelled post. Check correctness, source, images, licensing, release information and add original, useful editorial context. REMOVE the visibly labelled editorial-review section after edits. Ensure the content is more than a verbatim API synopsis and avoids invented availability, reviews or ratings.
5. Take the Blogger **numeric post IDs** of only fully edited and approved drafts. In Apps Script Script Properties, set TMDB_EDITORIAL_APPROVED_IDS to a comma-separated list of at most six of those IDs (no passwords or tokens).
6. Run publishReviewedTmdbPosts. It checks the entire selected set for DRAFT status, Movies or TV Shows and TMDB labels, non-test content, minimum body size, and that the review warning has been removed. If all are valid, calls Blogger's official posts.publish endpoint for each draft. If a network error occurs during the sequence, inspect the published statuses and rerun only remaining draft IDs.
7. After the posts go live, homepage's published Blogger post catalogue should pick up posts loaded onto homepage, and /sitemap.xml should eventually contain actual post URLs. In Search Console inspect/index each real URL rather than attempting to index TMDB API URLs.

## Safety
- No unattended trigger or bulk auto-publication added.
- Page/advertising setup left to owner; no affiliate marketing is planned.
- TMDB read token remains only in Apps Script Properties.
- Publishing method is based on Google's documented Blogger posts.publish endpoint.
- Official TMDB attribution text must be prominent and required approved logo must be used in About/Credits; review official TMDB attribution docs before production.
- All TMDB imagery use must fall within owner's commercial permission and rights scope.

## Official sources checked on 2026-11-01
- https://developer.themoviedb.org/docs/faq (commercial vs developer, attribution and logos)
- https://developers.google.com/blogger/docs/3.0/reference/posts/insert (draft creation)
- https://developers.google.com/blogger/docs/3.0/reference/posts/publish (publish existing reviewed draft)

## Current state
GitHub code updated only; Apps Script code not automatically synced. No TMDB-derived posts have been published by these repository changes.
