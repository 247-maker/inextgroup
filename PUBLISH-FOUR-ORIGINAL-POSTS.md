# INEXTGROUP — One-click original content publication
Date: 2026-11-01
Branch: feature/blogger-tmdb-safe
Code commit: a8c32d95e664f7f09f849aca82d9ef0f1aef309b

## What changed
The Apps Script contains publishOriginalEditorialGuides(). Running it publishes FOUR original evergreen entertainment education articles to the already connected Blogger blog, with unique titles, relevant labels, a Blogger-public URL result, source-independent wording and exact-title + Script Property duplicate prevention.

Titles:
1. How to Check Where a Movie Is Legally Available to Watch
2. Movie Ratings Explained: Audience Scores, Critics and Review Counts
3. TV Seasons, Episodes and Limited Series: A Simple Viewing Guide
4. How to Find Official Movie Trailers and Avoid Fake Video Links

This is factual editorial educational content, not copied TMDB data. It includes no TMDB artwork, unlicensed video, invented movie listings, reviews, release dates, partners or ad code. An owner-editor should still review these articles after publication and add unique search descriptions in the Blogger editor. User explicitly requested getting content live quickly for Search Console inspection.

## Publish in one action
1. Back up Apps Script's current Code.gs; copy the latest apps-script/Code.gs from the feature branch into the same editor and Save.
2. In the function dropdown select **publishOriginalEditorialGuides** and click Run.
3. Approve the required Blogger permission only if this is your intended Google account and staging Blog ID. This is a WRITE operation and creates public posts (NOT drafts).
4. The Execution Log returns four outcomes with status and live URLs, or a failure report. If interrupted rerun the same function: it checks live Blogger titles and saved markers to avoid repeat posts.
5. Open Blogger > Posts > Published, validate all four article bodies/URLs, set individual Search Descriptions and edit article wording if needed.
6. Check /sitemap.xml after Blogger has updated; use Search Console > Sitemaps to submit the site's true sitemap; inspect individual real published URLs for indexing. Search Console indexing is not automatic or guaranteed.
7. Do not publish the fictional test records. Keep TMDB_RIGHTS_REVIEWED=no and leave monetization scripts disabled until commercial licensing/compliance is reviewed.

## Important limitations
- This repository commit does NOT publish to Blogger by itself: Apps Script is a different Google-hosted project. The user must run the named function once in the authorized Apps Script account.
- Any pre-existing approved content does not automatically appear if Blogger displays a smaller homepage feed batch.
- AdSense approval, custom-domain redirect, commercial TMDB terms and true site readiness remain unverified.
- Current policy pages and legal text need final review; user plans to update later.
