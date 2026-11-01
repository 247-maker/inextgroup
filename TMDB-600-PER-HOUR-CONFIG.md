# INEXTGROUP — 10 Posts/Minute Scheduler Configuration
Updated: 2026-11-01
Branch: feature/blogger-tmdb-safe

## Requested scheduling
- Apps Script time-driven trigger: every **1 minute**
- Maximum per invocation: **10 new TMDB-derived Blogger posts**
- Theoretical upper bound: **600 posts per hour**, assuming no delays and all resources are available
- Maximum configured per Bangladesh calendar day: **5,000 posts**, after which the importer stops for that day
- Mode: publish, with explicit Blogger LIVE status verification (not Draft)
- Script lock avoids simultaneous runs; same-minute counter prevents manual duplicate runs from exceeding 10 successes in the tracked minute
- Code commit: 26116ab1516fad583cf46b0607b723fee8e601ea

## Important: target is NOT demonstrated capacity
- Existing importer fetches the first page of four TMDB sources, at most 80 records in a run, and many will already exist or lack qualifying details.
- Existing inventory safeguard deliberately **stops after more than 500 published/draft items**, rather than creating duplicate pages. This must be redesigned with a durable database/index before pursuing thousands of daily posts.
- Google Apps Script has execution-time and trigger quotas, and Blogger APIs may enforce account-level or project-level limits, rate limits or anti-abuse restrictions. No permission or API quota approval for 600/hour has been verified.
- Publishing thousands of programmatic metadata-only pages can create low-value/duplicative content and does not guarantee Search indexing or AdSense eligibility.
- If Blogger returns HTTP 429, stop/reduce throughput; do not attempt to bypass provider limits.
- Accurate movie details and artwork rights still depend on the user-confirmed commercial TMDB permission.

## One-time user steps
1. Back up existing Code.gs in the Google Apps Script project.
2. Replace with branch apps-script/Code.gs and Save.
3. Run installInextAutoPublisher once to replace the prior hourly trigger with a one-minute trigger.
4. Run inextAutoPublishStatus to confirm scheduleMinutes=1, maxPerRun=10, maxPerDay=5000, installedTriggers=1, enabled=true and mode=publish.
5. Review results of inextScheduledTmdbSync and Blogger Published list. Check quota errors and duplicate guard; use stopInextAutoPublisher to halt.
6. Increase actual throughput only after database-backed indexing, multi-page TMDB ingestion, editor-quality standards, API capacity validation, and performance testing.

## Current stage
GitHub source changed. Owner must copy/save and install new Apps Script trigger; the live script is NOT remotely updated by these commits.
