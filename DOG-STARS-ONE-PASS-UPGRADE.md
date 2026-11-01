# INEXTGROUP — One-Pass Professional Movie Database Upgrade
Updated: 2026-11-01
Branch: feature/blogger-tmdb-safe
Movie reference: https://www.themoviedb.org/movie/1384216-the-dog-stars
Published Blogspot page: https://inextcloud.blogspot.com/2026/11/the-dog-stars-2026-movie-details.html

## Reliable findings
The public web fetcher could not access the Blogspot post (cache miss), so this is a code/source-level fix, not a verified live-page screenshot.
The publicly cached TMDB page is about 1.7 years old, showing incomplete/obsolete information (planned/no current dates). Use live TMDB API results rather than copying this page.
20th Century Studios' official The Dog Stars page confirms Ridley Scott, Mark L. Smith, US Aug 28 2026, R and runtime 1h58m. The on-page "Official Studio-Verified Information" block is explicitly US-specific.
Official reference: https://www.20thcenturystudios.com/movies/the-dog-stars

## Completed in GitHub
Apps Script apps-script/Code.gs:
- professionalMediaHtml_ supports poster + backdrop, overview, TMDB vote average with count, release date, runtime, certification if returned, genres, cast photo/character cards, director/writer/studio/country/budget/revenue, keywords, official YouTube trailers, verified INEXTGROUP related-post links.
- professionalSupplementHtml_ adds full key crew, alternative titles, country release dates, image gallery, third-party review *count only*, and suggestions ONLY linked when a corresponding post is already published on INEXTGROUP.
- professionalVerifiedEditorial_ adds a separate studio-verified fact/context block for Dog Stars; dates are explicitly US only.
- All future licensed TMDB drafts use the same professional HTML renderer.
- applyDogStarsProfessionalUpgrade updates ONLY Dog Stars and creates/verifies a private Blogger backup draft before modifying the original.
- upgradePublishedMovieDetailsBatch updates up to SIX published Movie/TV posts in one explicit run, prioritizing Dog Stars. Each article is privately backed up and verified first, title, labels and URL are preserved. Failed backup aborts update rather than risking content loss.
- Existing movieDatabaseUpgrade and preparePersonProfileDrafts can add related links and draft actor biography profiles. Cast names do not link to TMDB. Actor names link to their published INEXTGROUP profiles only, otherwise remain plain text.
Theme blogger/theme.xml:
- dark cinematic responsive hero and poster, cast cards, gallery, crew, release region cards, keyword sections, sticky jump nav and source-verified panel.
- qualified Movie/TV JSON-LD based on displayed source fields; no invented rating counts or false reviews.
- CSS specificity overrides Blogger's image rules so poster/gallery crop and mobile cards render correctly.

## Live rollout — do once
1. Back up your current Blogger Theme and existing movie posts' HTML if you have written independent editorial material.
2. Save the latest blogger/theme.xml from this GitHub branch and upload via Blogger > Theme > Restore.
3. Back up current Apps Script Code.gs, paste the latest branch apps-script/Code.gs into "INEXTGROUP TMDB Automation" and Save; keep all existing Script Properties unchanged.
4. If the owner holds rights for API/data and imagery, TMDB_RIGHTS_REVIEWED should remain yes.
5. Run **upgradePublishedMovieDetailsBatch** exactly once. This is an intentional live write and will create up to 6 private backup drafts followed by up to 6 updates, prioritizing Dog Stars. Use **applyDogStarsProfessionalUpgrade** instead if you want to change ONLY the one Dog Stars post; do NOT run both immediately.
6. Read the Execution Log for exact published URLs and private backup draft IDs. Inspect the actual Dog Stars page on desktop/mobile and check image gallery, cast and release date.
7. For clickable local actor profiles, run preparePersonProfileDrafts to create up to 3 private draft profiles. Review and publish them from Blogger. Then rerun upgradePublishedMovieDetailsBatch (backs up only the first original version) to link published profiles on movie pages.
8. Use Blogger's real URL Inspection in Google Search Console after content is published. Google indexing is not guaranteed.

## Known hard limits and caveats
- GitHub commits cannot directly update the Apps Script Google-hosted project or Blogger Theme; actions 2-5 require account-owner login.
- The current internal database is built from ACTUALLY published Blogger movie/TV/person URLs. It does not pretend that every TMDB movie or cast member has a page on INEXTGROUP.
- The current batch is capped at 6 live media articles to reduce Blogger API quota errors. Additional batches need scalable cursors and monitoring.
- Published actor profiles require separate editorial review; they are not invented simply to force internal links.
- Upgrading existing articles replaces their old movie HTML body. A verified private Blogger draft backup is saved for each, but custom editorial work will not be automatically merged back; manually restore any useful custom work from the backup.
- TMDB attribution (official logo + notice) must follow actual agreement. Official trailer and source links may be external; cast/filmography and related content navigation remains inside INEXTGROUP when those pages exist.
- No affiliate marketing and no advertising code was added.
- Google can choose not to index automatically generated metadata pages. Improve original expert analysis before submitting indexing requests.

## Tests run
- Apps Script JavaScript parsed.
- Mock TMDB data rendered Gallery, Cast/Crew, Backdrop, Alternate Titles, Regional Release, Reviews Count, Recommendations, studio fact panel, and internal actor/movie URLs without TMDB actor links.
- Three Blogger theme inline JavaScript scripts parsed and b:if tags balanced.
- No successful live Blogger update claimed in this repository-only work.
