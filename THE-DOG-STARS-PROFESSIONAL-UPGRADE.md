# INEXTGROUP: Professional Movie Page Upgrade — The Dog Stars
Updated: 2026-11-01
Branch: feature/blogger-tmdb-safe
Example post: https://inextcloud.blogspot.com/2026/11/the-dog-stars-2026-movie-details.html
TMDB reference: https://www.themoviedb.org/movie/1384216-the-dog-stars

## What was checked
- External web reader could not fetch the user's Blogspot URL (cache miss); therefore the live page's precise rendering was NOT verified.
- TMDB public page was fetchable but its cached contents were old and incomplete (planned status, missing dates). Do not copy its stale status into current posts.
- The current official 20th Century Studios website lists The Dog Stars (2026), directed by Ridley Scott, written by Mark L. Smith, starring Jacob Elordi and Josh Brolin, US theatrical release August 28 2026 and runtime 1h 58m. See https://www.20thcenturystudios.com/movies/the-dog-stars
- Apps Script existing detail renderer showed only short metadata, eight cast names, and minimal styling.

## Implemented in repository
- New professionalMediaHtml_(detail,type,index): dark responsive backdrop hero, poster, title/tagline, vote average with vote count, release date, runtime, US certification when API returns it, genres, director/creators, detailed overview, cast photos and characters, directors/writers, original title/language, studios/countries, budget/revenue when supplied, topics, trailers, and related first-party INEXTGROUP posts.
- No movie, actor or filmography navigation to TMDB. Actor names have first-party links only when a real published Person post exists. Unpublished profiles remain plain names.
- Official TMDB source record remains an external attribution link, and official YouTube trailers remain external.
- prepareLicensedTmdbDraftBatch now uses the rich template for all future media drafts. No auto-publication added.
- previewDogStarsProfessionalUpgrade is READ ONLY and confirms the exact target post; run first.
- applyDogStarsProfessionalUpgrade updates **only** the published Dog Stars post. Before writing it backs up old HTML in Script Properties under INEXT_BACKUP_DOGSTARS_1384216. It REFUSES to edit if the original body exceeds 8,000 characters and a safe backup is not already present.
- This operation replaces the existing published HTML body rather than merging custom editorial text. Save your current post content manually if you've written unique material and plan to restore it.
- Blogger theme has unique responsive cinematic detail CSS plus Movie/TV structured-data compatibility.

## Deployment — one focused upgrade
1. Blogger > Theme: download your current theme backup.
2. Download latest blogger/theme.xml from feature/blogger-tmdb-safe; restore/upload and verify navigation/pages remain correct.
3. Back up Apps Script Code.gs; paste latest apps-script/Code.gs from the same feature branch and Save.
4. Run previewDogStarsProfessionalUpgrade; it reports the specific existing post ID, current/new HTML sizes and cast count without writing.
5. Ensure rights permissions cover all images and metadata; confirm TMDB_RIGHTS_REVIEWED=yes.
6. **Before applying**, copy existing Dog Stars post HTML into a local text backup, especially if custom editorial edits were added. Then run applyDogStarsProfessionalUpgrade. This is a live Blogger UPDATE.
7. Open the exact Dog Stars Blogspot URL and check backdrop, cast, metadata, mobile, related internal links, Schema and displayed dates. If no actor profiles were published, names will be plain text instead of invalid links.
8. Run preparePersonProfileDrafts and publish reviewed People posts; then regenerate the specific Dog Stars page so the first-party cast links can appear, only after safeguarding any editor-created changes. Automated reapply is a full-body replacement; this is not a merge.
9. Set an original unique Search Description for Dog Stars in Blogger and use Search Console URL Inspection.

## Key caveats
- The posted update is in GitHub only; this assistant cannot directly run the user's Apps Script or write the live Blogger site.
- Old html backup is saved in Apps Script Properties if within size limit. Keep a separate manual copy.
- Content quality requires independently useful original analysis beyond TMDB metadata for search indexing. Do not claim Google's indexing or AdSense approval.
- Movie source date can differ by territory; check official studio source before editorializing an international release date.
- Update URLs from Blogger are not guaranteed until the script has executed and response is verified.

## Verification performed
- Apps Script JS parses successfully.
- Theme's three inline JS blocks parse; Blogger b:if opening/closing counts match.
- Mock professional film record rendered backdrop, cast internal person links, related INEXTGROUP movie links, runtime, genres, certificate, semantic facts layout and trailer fallback; no external cast profile link was generated.
