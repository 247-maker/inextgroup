# Movie & TV Detail SEO: safe structured-data upgrade
Branch: feature/blogger-tmdb-safe
Updated: 2026-11-01
Commit: 8c7c01fcc733737db2bf267d2d08d775f7d75c3f

## Implemented
- A Movie or TVSeries JSON-LD schema is generated **only on a single-item Blogger view** when an existing media detail article has a clear Movie information or TV Show information label, real title, and substantial description.
- Uses only rendered metadata: validated YYYY-MM-DD release/first-air date, HTTPS poster URL, listed genres, and permitted TMDB sameAs URL when supplied.
- Omits aggregateRating: the on-page rating does not include reliable vote count and cannot safely satisfy complete rating structured data.
- Adds a clickable Home > Movies/TV Shows > Title breadcrumb for actual media detail articles. No BreadcrumbList JSON-LD claim was added.
- Fictional API test drafts and non-media pages do not get Movie/TVSeries schema.
- No automated publishing, token exposure, external scripts, or new advertising code.

## Verification
- Javascript syntax of both theme scripts passed a syntax check.
- Still requires Blogger XML import and actual page/browser check. Google rich results are not guaranteed by schema markup.
- Blogger can provide separate built-in BlogPosting metadata; this schema describes the actual movie/series as a different entity.

## Manual deployment
1. Blogger > Theme > Backup.
2. Download the latest blogger/theme.xml from feature/blogger-tmdb-safe, then Theme > Restore > Upload.
3. Open one permitted **published** movie article and one TV article on desktop and phone.
4. Verify breadcrumb links and that poster/layout remains correct.
5. Inspect page source for application/ld+json with Movie or TVSeries on eligible pages; confirm none is created on a static Privacy Policy page.
6. Test with Google's Rich Results Test or Schema Markup Validator when the live pages are accessible. The schema may be valid without rich-result eligibility.

## Rights gate
Keep TMDB_RIGHTS_REVIEWED=no. Do not publish real TMDB movie records, posters or metadata until commercial permission and third-party media rights are established. Existing successful TMDB previews are not a commercial license.
