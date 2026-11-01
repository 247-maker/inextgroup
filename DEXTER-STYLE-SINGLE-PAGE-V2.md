# INEXTGROUP — Dexter: Resurrection–Referenced TV/Movie Single Page v2
Updated: 2026-11-01
Reference: https://www.themoviedb.org/tv/259909-dexter-resurrection
Branch: feature/blogger-tmdb-safe
Current Blogger URL: https://inextcloud.blogspot.com/
Custom domain: pending Blogger verification at www.inextgroup.cloud

## Reference research
TMDB page has a large poster + backdrop title hero, year, certification, genres, user score, trailer, tagline/overview, creator, series cast, current season, media, social reviews, and a detail-sidebar hierarchy. The cached reference may be stale; dynamically fetch current licensed TMDB metadata for each film/TV post rather than copying static TMDB claims or their exact design.

## Implemented in GitHub
- New responsive 2-column movie/TV page: cinematic poster/backdrop header with synopsis and linked official video action; main interactive tab content; right info sidebar with status, type, original language, network, creators, seasons, episodes, last air date, official website (validated HTTPS), keywords; sidebar drops below on mobile.
- Improved tabs: Overview, Cast & Crew, Media, Details, Reviews when available, Related.
- Cast search and expand to 60 roles. First-party INEXTGROUP actor and filmography links only where real published pages exist; no fake URLs or external actor navigation.
- Real TV season panels: latest regular season adds episode title, official dates, runtime, synopsis, TMDB still images and native expandable details. One additional TMDB read when building a TV article; failures do not abort season cards.
- Official video cards for vetted trailers, teasers and featurettes; YouTube links are explicitly external source actions.
- Gallery and lightbox, country-specific release records, alternative titles, crew and actual INEXTGROUP recommendations.
- Theme CSS hides Blogger's comment form, existing comment list and comment controls on single posts. No comments were deleted. To disable new comments at the platform level, in Blogger > Settings > Comments > Comment location select **Hide**. This setting is **separate** from TMDB's third-party review count, which may remain as sourced data.
- Preserved guide/article post titles by scoping movie title hiding to actual movie/TV pages.
- Source preview and code tests: JS parsed; sample Dexter-format TV data rendered hero video, sidebar, season, real internal actor/related links, video cards and source attribution. Live browser validation and Blogger upload are not performed by GitHub commits.

## One deployment for this revision
1. Back up Blogger Theme and Apps Script first.
2. Replace Blogger Theme with the newest `blogger/theme.xml` from this branch (Blogger > Theme > Restore).
3. Replace Apps Script `Code.gs` with newest `apps-script/Code.gs`; preserve Script Properties and secrets.
4. Blogger > Settings > Comments > Comment location > **Hide** to disable comment entry on the live site. Existing comments remain stored unless explicitly deleted. Reference: https://support.google.com/blogger/answer/9691230
5. Run `upgradePublishedMovieDetailsBatch` to rebuild up to six published film/TV posts, using verified private backup drafts. If earlier backup verification fails, do not bypass it. This replaces generated HTML and does not merge human-written additions.
6. Verify a movie and a TV page on desktop/mobile; inspect Cast & Crew, Media, Details, Related tabs, current-season episodes and Blogger comments absence.
7. If more than six existing articles need re-rendering, they require a reviewed subsequent batch. The function does not claim to import the entire TMDB catalogue.

## Cautions
- The new design follows TMDB's information hierarchy and interaction patterns but does not reproduce their copyrighted design assets, styling or code.
- No invented reviews or release info; missing source data does not generate facts.
- The profile links are first-party only when corresponding INEXTGROUP posts exist.
- Explicit commercial TMDB permissions and rights over particular media assets should cover this usage; their contract was not inspected.
- Deployment to a live Blogger account is not available through this GitHub integration, and these commits alone have not modified the live site.
