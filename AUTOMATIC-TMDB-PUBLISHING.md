# INEXTGROUP — Continuous TMDB API → Blogger Publishing
Date: 2026-11-01
Development branch: feature/blogger-tmdb-safe
Google Apps Script project: INEXTGROUP TMDB Automation

## What was added
- `installInextAutoPublisher()`: one-time, explicit owner action to authorize and create an Apps Script trigger **every six hours** and enable publishing (not merely drafts) in private Script Properties. Re-running installer replaces its existing triggers to prevent duplicates.
- `inextScheduledTmdbSync()`: source fetches from TMDB Trending Movies, Trending TV, Popular Movies and Popular TV; selects eligible unseen titles; obtains full movie/TV detail data for rich INEXTGROUP pages; writes at most **two new Blogger posts per run** and **six per Bangladesh calendar day**; logs actual Blogger post IDs and URLs.
- `inextAutoPublishStatus()`: read-only status including enabled state, mode, next config, daily count, last result, trigger count.
- `stopInextAutoPublisher()`: removes time triggers and stops future automatic publication, preserving existing public posts.
- Source record IDs are matched to already published posts AND drafts; Script Properties store successful TMDB IDs; post titles are checked as a further duplicate barrier. Bounded API errors and lock prevent concurrent writing.
- Existing first-party Cast, Filmography and Related title links remain local to INEXTGROUP when a corresponding Blogger page exists; no made-up internal profile links.
- Previously published new rich pages now recognized by `dbIndex_()` instead of only the legacy `inext-media__hero` template.

## One-time activation
1. Back up existing Apps Script Code.gs. Copy current source from https://github.com/247-maker/inextgroup/blob/feature/blogger-tmdb-safe/apps-script/Code.gs and save it in your existing project.
2. Project Settings → Script Properties: keep BLOGGER_BLOG_ID and TMDB_READ_TOKEN private. TMDB_RIGHTS_REVIEWED=yes only when the owner's permission covers ongoing commercial API use and imagery.
3. In the function dropdown choose `installInextAutoPublisher` → Run. Complete the Google authorization screen. This creates the **time-based trigger**. The Google-hosted Apps Script project must remain active and within its runtime and API quotas.
4. Select `inextAutoPublishStatus` → Run and verify `installedTriggers:1`, `enabled:true`, `mode:"publish"`.
5. For an immediate small batch, manually Run `inextScheduledTmdbSync` once; otherwise the time trigger starts scheduled runs. Check the Execution log for `created`, `skipped`, `errors`, and actual URLs.
6. Check Blogger → Posts → Published and the new movie/TV pages. Since this setup publishes automatically, audit the content and be prepared to unpublish or correct errors.
7. For full halt, Run `stopInextAutoPublisher` and verify status again. No existing posts are deleted.

## Operating limits and essential quality notes
- This is an ongoing source *ingestion* workflow. It automatically creates new title pages; it does **not** yet refresh all previously published movie/TV facts every six hours. New content appears when eligible new title records are available and Blogger accepts API requests.
- It only processes up to twenty TMDB items per source and at most two new posts in one run; there is no false promise of importing the entire TMDB database or every newly released title.
- If the Blogger published or draft inventory exceeds 500 posts in this version, publishing halts rather than risking duplicate postings; implement persistent paginated indexing before scaling beyond this size.
- To reduce low-information pages, candidate records require a valid year/date, a meaningful overview (at least 180 characters), a poster, and at least two cast records, among other checks. Automated metadata is still not equal to independently authored journalism. Add editorial insights and check original content value before submitting pages for Google indexing or AdSense assessment.
- Automatic publishing itself is a deliberate owner opt-in. Scheduled runs may fail under Blogger 429 quota or Apps Script authorization/runtime limits and do not bypass those limits. The last result and logs help diagnose them.
- Commercial TMDB license terms and artwork rights remain an owner obligation. Do not commit licenses or API credentials to public GitHub.
- Blogger's own Blogspot → custom domain redirects and HTTPS will activate separately after Domain verification; generated on-site links use relative paths, so they survive the migration.
- Do not use a second ChatGPT recurring automation to duplicate the Apps Script trigger. This solution uses Google's native project trigger.

## Deployment truth
GitHub code only has been committed. The assistant cannot remotely click Run or grant Google authorization within the user's Apps Script project. Automatic publishing is NOT active until the owner installs and authorizes the trigger in Google.
