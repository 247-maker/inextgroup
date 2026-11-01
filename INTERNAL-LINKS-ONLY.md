# INEXTGROUP Internal Links Only — Movie/TV/People
Updated: 2026-11-01
Code commit: 0038fd968f6fd44c288bccdfc8aee3694116f540
Branch: feature/blogger-tmdb-safe

## User requirement
All navigational Cast, Actor Profiles, Filmography, Related Movies and Related TV links should stay on INEXTGROUP rather than sending readers to a TMDB page.

## Code behavior
- Newly generated cast lists display people as names with TMDB person ID stored in an HTML data attribute; **no TMDB profile navigation**.
- Published movie/TV posts enriched with upgradePublishedMovieDatabase link to the person's INEXTGROUP Blogger URL **only when that person profile has already been published**.
- Older Cast hyperlinks previously pointing to TMDB person profiles are replaced by a published internal actor URL or plain text.
- Dedicated Cast Profiles section uses verified internal URLs; people without an internal profile are shown as text (no dead links, no external link).
- Related Movies and Related TV Shows show actual public Blogger URLs only; no invented internal URLs.
- preparePersonProfileDrafts builds up to 3 actor biography/filmography drafts. Filmography titles link internally if the corresponding movie/TV post has been published, otherwise show as plain text.
- Official TMDB source credit/attribution can still link externally because this is attribution, **not internal navigation**. Official trailers continue to link to authorized video sources.

## Installation and migration
1. Back up Apps Script Code.gs and place the newest apps-script/Code.gs in the existing authorized Apps Script project. Save.
2. Run previewMovieDatabaseUpgrade to see movie/TV and published person counts.
3. Keep INEXT_DB_DRY_RUN at its default (or set yes) and run upgradePublishedMovieDatabase to preview changes. This does not modify Blogger.
4. Back up published post content before writes.
5. Set INEXT_DB_DRY_RUN=no in Script Properties and run upgradePublishedMovieDatabase. Up to six published media posts are updated to remove former TMDB actor-profile navigation, add Cast Profiles and internal related links.
6. Run preparePersonProfileDrafts. This creates at most three People drafts; review biographies, credits and photo usage rights and add original editorial value.
7. Publish approved People posts using Blogger. Rerun upgradePublishedMovieDatabase after each batch to replace unlinked names with actual INEXTGROUP person URLs.
8. Blogger Theme has People navigation and person-page design on development branch; if not already deployed, back up then restore the current blogger/theme.xml.
9. Verify Cast clicks, related titles, and filmography on the public pages.

## Not yet complete
- Real actor internal pages must be created and published; no existing page URL can be safely invented.
- Current run is capped to 6 media updates and 3 person profile drafts; additional runs require scalable pagination/batch cursor enhancements.
- The repo update has not changed the live Blogger or Apps Script project yet.
- Static code tests confirmed external actor link removal, internal person linking, internal movie linking, and idempotent sections.
