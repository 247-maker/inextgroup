# INEXTGROUP — Blogger + TMDB (development branch)

## Status
Implementation scaffold: Blogger theme and TMDB-to-Blogger **draft-only** importer.
Not deployed. Production account, blog ID, OAuth authorization, DNS, commercial rights, and visual parity still require verification.

## Directory
- blogger/theme.xml — importable responsive Blogger XML theme.
- apps-script/Code.gs — controlled TMDB metadata importer; creates Blogger **drafts only**.
- apps-script/appsscript.json — required OAuth scopes.

## Provisioning and safety
1. Create a staging Blogger blog owned by the site administrator.
2. Back up any existing Blogger theme. In Blogger > Theme > Restore, upload theme.xml.
3. Create a standalone Google Apps Script project under the intended Google account.
4. Copy Code.gs and appsscript.json (manifest using project settings).
5. In Script Properties supply:
   - TMDB_READ_TOKEN: a valid approved TMDB API read access token.
   - BLOGGER_BLOG_ID: the numeric ID of your staging blog.
   - TMDB_RIGHTS_REVIEWED: **only set "yes" after verifying the applicable TMDB commercial permissions and use terms.**
6. Confirm Blogger API access/authorization for your Google project and account.
7. Run setupCheck(), then previewImport(), and inspect Apps Script execution logs.
8. Only after source licensing and content rights approval, run importDrafts(). It imports at most 3 eligible records as **drafts**. Review and enrich them before publishing.
9. Do not create a timed trigger until the editorial and policy controls are accepted.
10. Add the official TMDB logo and final policy pages before launch.

## Limitations
- The supplied repository currently has only unrelated standalone HTML pages; a complete original movie UI and original TMDB implementation were not recoverable. Exact legacy functionality/design parity cannot be promised.
- Blogger native search currently searches **published posts**; this is not real-time whole-TMDB catalog search.
- The current importer handles movies; TV, genres, full detail, caching and editorial approval automation are still roadmap items.
- Apps Script quotas and TMDB licensing apply. Free hosting does not guarantee free commercial TMDB licensing.
- No unauthorised video links, copied broadcaster branding, or suspicious third-party scripts are imported.
- No publication or deployment is performed by this repository commit.

## Verifying the build
Check XML validity with a parser, import to a test Blogger blog, inspect mobile and post layout, verify Blogger OAuth and TMDB API status, and review drafts manually. Never enter tokens into the theme or GitHub.

## Owner approval gates
Blogger access, TMDB eligibility/licensing confirmation, approval of editorial content and custom-domain DNS settings.
