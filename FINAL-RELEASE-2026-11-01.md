# INEXTGROUP — FINAL DEVELOPMENT & CONTENT RELEASE
Release prepared: 2026-11-01
Branch: feature/blogger-tmdb-safe
Main repository: 247-maker/inextgroup
Live (currently): https://inextcloud.blogspot.com/
Custom domain (pending Blogger verification): https://www.inextgroup.cloud/

## Release summary — implemented in GitHub
1. Seven original people-first editorial reference guides (existing four + three new): legal movie availability; rating interpretation; TV seasons and episodes; identifying official trailers; cast versus crew; regional release dates; actor filmographies.
2. A single entry point `finishInextgroupWebsiteLaunch` that publishes the editorial guides with duplicate protection, then processes the existing movie/TV and person content graph, then returns a Blogger inventory and read-only content QA report.
3. Professional Film/TV display template with cinematic hero, poster, studio facts, verified cast and crew, photos, trailer links, regional release dates, alternative titles, source attributed data and internal related-post links only when real Blogger destinations exist.
4. Actor profiles with biography, portrait (if permitted), selected credits, and first-party Filmography links to published movie/TV posts; no forced TMDB actor links.
5. DOMAIN-INDEPENDENT first-party linking: inextInternalHref_ converts existing inextcloud.blogspot.com URLs and future inextgroup.cloud URLs into the same safe relative path; rejects outside hosts. Thus old article internal links will continue to work after custom-domain activation.
6. Homepage discovery cards now recognize the new professional Movie/TV layout for poster, rating, year and type. Viewing Guides and People are not falsely classified as movie cards. Main navigation includes a Guides category.
7. Movie/TV Person JSON-LD enhancements with visible cast, director, country and runtime. No invented review rating.
8. Removed affiliate CSS and affiliate suggestion from the original viewing guide. Site commercial model is display advertising only.
9. Verified private Blogger backup drafts before rewriting existing published movie/TV HTML, with bounded API retry on transient failures. Post-launch read-only Blogger quality report detects duplicate post titles, published editorial notices, unexpected published backup drafts, missing images and legacy article layouts.
10. No secret TMDB token embedded in Blogger Theme or GitHub; OAuth/Token remains in Apps Script private Script Properties.

## What to run to publish the prepared content
Owner action 1: From branch feature/blogger-tmdb-safe, download blogger/theme.xml, back up currently published Blogger Theme, then upload new template in Blogger > Theme > Restore. Check PageList gadget and navigation after restore.
Owner action 2: From same branch, back up and paste latest apps-script/Code.gs into the already-authorized Apps Script project "INEXTGROUP TMDB Automation"; save. Leave existing TMDB_READ_TOKEN and BLOGGER_BLOG_ID in private Script Properties. Set TMDB_RIGHTS_REVIEWED=yes ONLY if owner's grant includes this commercial use and images.
Owner action 3: Apps Script > Functions > **finishInextgroupWebsiteLaunch** > Run (ONCE). This is a write action: 7 editorial posts (unless already published), up to 12 new people pages, and up to 8 existing Movie/TV page updates with private draft backups; it may be partially completed if Blogger quota is reached, but returns/errors are logged. Never run in parallel. Do not immediately repeat after rate limit errors.
Owner action 4: Open Execution log and inspect guides, database, inventory, quality and errors. Confirm at least one movie and one person page open with valid internal links, mobile layout, visible images, and no leftover editorial review notice.
Owner action 5: After Blogger Custom Domain Save succeeds, enable root-domain redirect and HTTPS redirect, check page URLs and Blogger's own canonical handling. Existing generated internal links are relative and will follow the active domain. Submit real published sitemap /sitemap.xml and /sitemap-pages.xml to Search Console (only if present and valid); do not request indexing for drafts.

## Scope and caveats (do not misrepresent)
- These are committed GitHub sources. The tool access cannot deploy to the owner's signed-in Blogger Template or Google Apps Script. No new post has been published by the assistant itself through GitHub commits.
- Running the launch function will publish people pages and editorial guides automatically. If owner prefers editorial review first, do not run it; use draft-first component functions instead.
- The live Blogspot page could not be fetched by a public web reader, so no end-to-end live page/browser verification has occurred after this code work.
- Automatic metadata pages still need original editorial context and rights-compliant, source-verified facts to be genuinely valuable to readers. No indexing, AdSense approval, or TMDB legal permission is asserted by the code.
- A live article is replaced only after its old body is saved as a private Blogger backup draft; custom writing is not merged automatically. Recover original text using 'INTERNAL BACKUP' drafts if needed.
- This run is intentionally bounded (up to 8 media posts, 12 people profiles) by API quotas and Apps Script runtime. It is not a claim that the entirety of TMDB has been imported.
- Domain remains pending until Blogger accepts Google ownership CNAME and HTTPS is active. No registrar/DNS changes were made by this release.
- Website legal pages and AdSense account approval remain owner-managed.
- TMDB source attribution may require approved official logo assets per owner's licensed terms; confirm compliance.

## Automated code checks performed
- Apps Script parses; all three Blogger inline JS scripts parse; b:if opening/closing tags balance.
- Seven original Guides are generated.
- Film sample includes full Hero, Gallery, Cast links and related on-site Movie links.
- Existing Blogspot and pending custom domain both map to the same relative article path.
- External domains are rejected from internal-link generator.
- No fabricated community rating is emitted when the source provides no vote count.
