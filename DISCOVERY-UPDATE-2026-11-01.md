# INEXTGROUP — Discovery Theme Update (2026-11-01)
Development branch: feature/blogger-tmdb-safe
Theme: blogger/theme.xml
Commit: f481591d473052457bcdf624dc6cc719592fab91

## Implemented
- Clarifies homepage filters cover **only Blogger published posts actually loaded on that page**.
- Adds an accessible "Search all published posts" link to Blogger native search. When the visitor enters a title, the full-site search link includes the safely encoded query.
- When local filters find no result, provides a direct fallback to full-site Blogger search.
- Refines footer layout to keep attribution, copyright and legal navigation in separate rows across desktop/mobile.
- Sets poster-card width and height attributes to reserve aspect-ratio space and improves focus-visible navigation.

## Install
1. Blogger Dashboard > Theme > Backup.
2. Open the development branch raw blogger/theme.xml file and save the XML file.
3. Blogger Dashboard > Theme > Restore > Upload the updated XML file.
4. Verify the homepage, a search, the footer and a movie-detail post on desktop and mobile.
5. Keep the existing Blogger Pages and PageList gadget configuration; if it resets during restore, reconfigure Footer legal and information pages in Layout.

## QA
- Homepage displays no false trending claim; Trending means labelled published posts, not live TMDB trending.
- Search query "test" yields full-site fallback /search?q=test even if not in first homepage batch.
- Select type/genre/year and ensure count describes local results.
- Footer links are readable and keyboard reachable on 360px phone view.
- A Blogger static legal page and one movie-detail page remain full width.
- No AdSense JavaScript or TMDB tokens embedded.

## Unfinished
- Sitewide native Blogger search is an unstructured post search, not a full real-time TMDB API search.
- Live approved movie catalog, automated import, official TMDB logo, commercial licensing and AdSense approval are outstanding.
- No deployment: GitHub changes require manual Blogger theme restore.
