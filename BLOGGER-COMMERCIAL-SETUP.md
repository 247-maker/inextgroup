# INEXTGROUP — Commercial Blogger Rollout
Date: 2026-11-01

## Status
Seven HTML policy/information drafts and an updated Blogger theme are committed on feature/blogger-tmdb-safe. They are not yet live, verified, or legally approved. User already verified TMDB previews, Blogger API connection, fictional draft-writing, and earlier theme versions. Do not claim AdSense or TMDB approval.

## Pages to create in Blogger
From Blogger > Pages > New Page > HTML view, copy body from each referenced file, edit all bracketed placeholders, preview, then publish **only when accurate**.

1. About Us -> blogger/legal-pages/about-us.html
2. Contact -> blogger/legal-pages/contact.html
3. Privacy Policy -> blogger/legal-pages/privacy-policy.html
4. Terms of Use -> blogger/legal-pages/terms-of-use.html
5. Affiliate Disclosure -> blogger/legal-pages/affiliate-disclosure.html
6. Editorial & Corrections Policy -> blogger/legal-pages/editorial-and-corrections-policy.html
7. Copyright & Takedown -> blogger/legal-pages/copyright-and-takedown.html

Blogger generates actual /p/...html URLs depending on the page title and creation. Do not assume an exact slug. Set legal page URLs and disclosure links from Blogger's published actual pages.

## Information operator must verify
- Actual operator or legal business name and country / applicable law
- Public contact and copyright email
- Actual analytics, ad, cookie and affiliate partners; privacy rights and retention
- Whether consent management is needed for the audience, including UK and US states
- Any TMDB commercial license/permission and attribution/logo specifications
- Affiliate program membership and approved merchant/tracking URL

## Theme upgrade
1. Blogger > Theme > Backup before changes.
2. Download raw blogger/theme.xml from the feature branch, upload via Theme > Restore.
3. Check blog homepage and a single post on mobile/desktop.
4. Blogger > Layout > Footer legal and information pages > Page List gadget: enable/order real published pages; save.
5. Verify footer links navigate to live, accurate information. Keep no dead links.

## Affiliate placement
- Use blogger/affiliate-card-template.html as a guide only; replace placeholders with actual approved merchant/product link and disclose paid relationship near link.
- Link attributes: rel="sponsored noopener noreferrer", target="_blank" only if appropriate.
- Never call links "Free stream", "Play now" or "Watch online" unless factually true and authorized.
- Never use third-party ad script copied from the old standalone HTML pages.

## Ads
Do not insert arbitrary ad code or claim AdSense eligibility. First verify (a) legal page accuracy, (b) sufficient independently useful content, (c) publisher compliance, (d) rights to published material, (e) consent handling where required, and (f) AdSense account/site review result. Then connect only official ad scripts via Blogger's supported integration or approved code.

## TMDB rights gate
TMDB_RIGHTS_REVIEWED must remain no. API reads and previews succeeding do not establish commercial rights. Obtain written terms or permissions as applicable before showing API results/images commercially. The existing preview fixtures must not be published. Do not convert rights flag to yes simply to make importer run.

## Required acceptance checks
- [ ] Correct page URLs, contact, privacy and affiliate disclosures
- [ ] Official TMDB attribution/logo use verified against current terms
- [ ] All ad/affiliate rights and partner requirements checked
- [ ] API secrets not in XML/HTML/git logs; rotate exposed token if needed
- [ ] Mobile/desktop, navigation, category filtering, keyboard and search tested
- [ ] No unauthorized streams, broadcaster impersonation, thin mass pages
- [ ] Original website features compared and gaps documented
- [ ] Production domain HTTPS, DNS and Search Console configured only after verification

## Commercial restrictions
As of 2026-11-01, official policies/terms have not been fetched or reviewed live in this environment. The drafts are NOT legal advice or a verified current compliance determination.
