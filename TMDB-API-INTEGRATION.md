# INEXTGROUP TMDB API Integration — Batch Pipeline
Updated: 2026-11-01
Branch: feature/blogger-tmdb-safe
Code: apps-script/Code.gs
Commit: be1b557173dbd4df6646962f110c983ad3e32810

## Implemented in code
- TMDB source endpoints: trending movies/week, popular movies, trending TV/week, popular TV.
- Type-aware deduplication by TMDB ID (movie and TV IDs do not collide).
- Read-only prepareTmdbCataloguePreview() takes up to 3 eligible movies and 3 eligible series and reports names, TMDB IDs, release dates, poster existence, sections and overview length. No Blogger writes.
- tmdbIntegrationStatus(): confirms configured properties and licence gate without revealing credentials.
- prepareLicensedTmdbDraftBatch(): AFTER verified commercial licence/artwork rights, manually set TMDB_RIGHTS_REVIEWED=yes and run to create up to SIX Blogger DRAFTS. Details may include verified TMDB director/creator, cast, runtime/seasons/episodes and official YouTube trailer links where returned by TMDB. Every draft includes mandatory editorial-review notice. No real TMDB post is auto-published.
- Existing editorial guide publisher is distinct and does not depend on TMDB rights.

## Deployment
1. Back up Apps Script Code.gs.
2. Copy latest Code.gs from the feature branch into the already-authorized Google Apps Script project.
3. Save. The GitHub commit does NOT update Apps Script automatically.
4. For noncommercial development test: run tmdbIntegrationStatus(), then prepareTmdbCataloguePreview(). Both are read only.
5. Before using prepareLicensedTmdbDraftBatch(), establish and document the applicable commercial API and artwork rights and only then change TMDB_RIGHTS_REVIEWED to yes.
6. Review and enhance each draft with original editorial contribution, correct source/date, rights check, title/search description and appropriate visuals; manually publish individually through Blogger.
7. Public published posts then appear in the theme's existing Blog-derived catalogue. Their actual URLs may be inspected in Search Console and Sitemap.
8. To publish four original rights-independent evergreen guides immediately, run publishOriginalEditorialGuides() instead. Those do not automatically create TMDB catalogue titles.

## Important distinctions
- The API works in Apps Script: read-only previews have succeeded. A live TMDB catalogue visible on the public website is NOT deployed, and commercial permission is NOT confirmed.
- Blogger homepage only indexes items displayed in its published feed, not the full TMDB database.
- No credentials in theme or GitHub. Never publish a raw Apps Script Web App endpoint containing secrets or unrestricted write access.
- All posts should be original and people-first; copied TMDB overviews alone are insufficient for reliable long-term SEO quality.
- No advertising or affiliate details were touched. Owner may configure them independently later.
