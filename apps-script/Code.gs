/**
 * INEXTGROUP / TMDB -> Blogger: SAFETY-FIRST DRAFT IMPORTER
 * Run setupCheck(), then previewImport(), then importDrafts().
 * Never enable mass auto-publishing. No video hosting or stream links.
 */
const SETTINGS = Object.freeze({
  tmdbBase: 'https://api.themoviedb.org/3',
  bloggerBase: 'https://www.googleapis.com/blogger/v3',
  maxDraftsPerRun: 3,
  minimumOverviewLength: 120,
  sources: ['trending/movie/week', 'trending/tv/week'],
  locale: 'en-US'
});
function props_() { return PropertiesService.getScriptProperties(); }
function required_(key) {
  const value = props_().getProperty(key);
  if (!value) throw new Error('Missing Script Property: ' + key);
  return value;
}
function setupCheck() {
  const has = ['TMDB_READ_TOKEN','BLOGGER_BLOG_ID'].map(k => ({name:k,configured:!!props_().getProperty(k)}));
  Logger.log(JSON.stringify(has));
  return has;
}
function tmdb_(path) {
  const token = required_('TMDB_READ_TOKEN');
  const url = SETTINGS.tmdbBase + '/' + path + (path.indexOf('?')===-1?'?':'&') + 'language=' + encodeURIComponent(SETTINGS.locale);
  const r=UrlFetchApp.fetch(url,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},muteHttpExceptions:true,followRedirects:false});
  if (r.getResponseCode()!==200) throw new Error('TMDB status '+r.getResponseCode());
  return JSON.parse(r.getContentText());
}
function bloggerInsertDraft_(body) {
  const blogId = required_('BLOGGER_BLOG_ID');
  const url=SETTINGS.bloggerBase+'/blogs/'+encodeURIComponent(blogId)+'/posts?isDraft=true';
  const r=UrlFetchApp.fetch(url,{
    method:'post',contentType:'application/json',
    headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},
    payload:JSON.stringify(body),muteHttpExceptions:true
  });
  if (r.getResponseCode()!==200 && r.getResponseCode()!==201) {
    throw new Error('Blogger draft creation failed: HTTP '+r.getResponseCode()+' '+r.getContentText().slice(0,500));
  }
  return JSON.parse(r.getContentText());
}
function esc_(s) {
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function typeOf_(source) { return source.indexOf('/tv/')>=0 ? 'tv' : 'movie'; }
function approved_(m, type) {
  const title=type==='tv'?m.name:m.title;
  const date=type==='tv'?m.first_air_date:m.release_date;
  return m && Number.isSafeInteger(m.id) &&
    title && m.overview && m.overview.trim().length>=SETTINGS.minimumOverviewLength &&
    /^\d{4}-\d{2}-\d{2}$/.test(date||'') &&
    /^\/[a-zA-Z0-9/_-]+\.(jpg|png|webp)$/.test(m.poster_path||'');
}
function genres_(type) {
  const result=tmdb_('genre/'+type+'/list');
  const map={};
  for (const g of result.genres||[]) map[g.id]=g.name;
  return map;
}
function mediaHtml_(m,type,genreNames) {
  const title=type==='tv'?m.name:m.title;
  const date=type==='tv'?m.first_air_date:m.release_date;
  const url='https://www.themoviedb.org/'+type+'/'+encodeURIComponent(m.id);
  const poster='https://image.tmdb.org/t/p/w500'+m.poster_path;
  const avg=Number(m.vote_average);
  const rated=Number(m.vote_count)>0 && Number.isFinite(avg);
  const rating=rated?avg.toFixed(1)+'/10':'Not yet rated';
  const genreList=(m.genre_ids||[]).map(id=>genreNames[id]).filter(Boolean);
  const facts='<li>'+esc_(date)+'</li>'+
    '<li class="inext-media__rating">TMDB ★ '+esc_(rating)+'</li>'+
    '<li>'+(type==='tv'?'Television series':'Movie')+'</li>';
  return '<article class="inext-media">'+
    '<div class="inext-media__hero">'+
    '<figure class="inext-media__poster"><img alt="'+esc_(title)+' official poster via TMDB" loading="lazy" src="'+esc_(poster)+'"/></figure>'+
    '<div class="inext-media__summary">'+
    '<p class="inext-media__eyebrow">'+(type==='tv'?'TV Show':'Movie')+' information</p>'+
    '<h2 class="inext-media__title">'+esc_(title)+'</h2>'+
    '<ul class="inext-media__facts">'+facts+'</ul>'+
    (genreList.length?'<p class="inext-media__genres"><strong>Genres:</strong> '+genreList.map(esc_).join(' · ')+'</p>':'')+
    '</div></div>'+
    '<section class="inext-media__section"><h3>Overview</h3><p>'+esc_(m.overview)+'</p></section>'+
    '<section class="inext-media__section"><h3>Movie and TV information</h3>'+
    '<p>Explore more information and available official videos on the original TMDB listing. Streaming or download availability is not provided here.</p>'+
    '<p><a href="'+esc_(url)+'" rel="noopener noreferrer" target="_blank">View the '+(type==='tv'?'show':'movie')+' on TMDB</a></p></section>'+
    '<p class="inext-media__source">Source: TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>'+
    '</article>';
}
function gather_() {
  let all=[];
  for (const source of SETTINGS.sources) {
    const type=typeOf_(source);
    const page=tmdb_(source);
    all=all.concat((page.results||[]).filter(m=>approved_(m,type)).slice(0,Math.ceil(SETTINGS.maxDraftsPerRun/SETTINGS.sources.length)).map(m=>({type:type,data:m})));
  }
  return all.slice(0,SETTINGS.maxDraftsPerRun);
}
function previewImport() {
  const list=gather_().map(x=>{
    const m=x.data;
    return {type:x.type,id:m.id,title:x.type==='tv'?m.name:m.title,eligible:!props_().getProperty('tmdb_'+x.type+'_'+m.id)};
  });
  Logger.log(JSON.stringify(list,null,2));
  return list;
}
function importDrafts() {
  if (props_().getProperty('TMDB_RIGHTS_REVIEWED')!=='yes') throw new Error('Rights check not complete. Review TMDB permissions and terms.');
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('An import is already running.');
  try {
    const items=gather_(), outcomes=[], cache={};
    for (const x of items) {
      const m=x.data, type=x.type, key='tmdb_'+type+'_'+m.id;
      if (props_().getProperty(key)) {outcomes.push({type:type,id:m.id,status:'skipped_existing'});continue;}
      if (!cache[type]) cache[type]=genres_(type);
      const title=type==='tv'?m.name:m.title;
      const date=type==='tv'?m.first_air_date:m.release_date;
      const genreLabels=(m.genre_ids||[]).map(id=>cache[type][id]).filter(Boolean).slice(0,4);
      const draft=bloggerInsertDraft_({
        kind:'blogger#post',
        title:title+' ('+date.slice(0,4)+') — '+(type==='tv'?'TV show':'Movie')+' details',
        content:mediaHtml_(m,type,cache[type]),
        labels:[type==='tv'?'TV Shows':'Movies','TMDB'].concat(genreLabels)
      });
      props_().setProperty(key,String(draft.id));
      outcomes.push({type:type,id:m.id,bloggerDraftId:draft.id,status:'created_draft'});
    }
    Logger.log(JSON.stringify(outcomes));
    return outcomes;
  } finally {lock.releaseLock();}
}

/**
 * Read-only HTML preview for one genuine TMDB record.
 * Does NOT create a Blogger draft or publish anything.
 * The resulting HTML is shown only in the Apps Script execution log.
 */
function previewMovieDetailHtml() {
  const type='movie';
  const candidates=gather_().filter(x=>x.type===type);
  if (!candidates.length) throw new Error('No eligible TMDB movie records found.');
  const movie=candidates[0].data;
  const html=mediaHtml_(movie,type,genres_(type));
  Logger.log('PREVIEW TITLE: '+movie.title);
  Logger.log('PREVIEW HTML START\n'+html+'\nPREVIEW HTML END');
  return {title:movie.title,html:html};
}


/**
 * One-time write-permission test using fictional content only.
 * Produces a Blogger DRAFT, never publishes, and never uses TMDB media.
 * Requires separate explicit execution by the blog owner.
 */
function testBloggerDraftWrite() {
  const p=props_();
  const key='INEXTGROUP_TEST_DRAFT_ID';
  const already=p.getProperty(key);
  if (already) {
    Logger.log('Existing test draft ID: '+already+' — skipping duplicate creation.');
    return {status:'skipped_existing',draftId:already};
  }
  const html='<article class="inext-media">'+
    '<div class="inext-media__hero">'+
    '<div class="inext-media__summary">'+
    '<p class="inext-media__eyebrow">Blogger API test — fictional content</p>'+
    '<h2 class="inext-media__title">INEXTGROUP Test Record</h2>'+
    '<p>This is fictional content created only to verify Blogger draft-write permission.</p>'+
    '<p>Not a real movie, a TMDB record, or a published recommendation.</p>'+
    '</div></div></article>';
  const draft=bloggerInsertDraft_({
    kind:'blogger#post',
    title:'INEXTGROUP API Draft Test — Do Not Publish',
    content:html,
    labels:['Internal Test']
  });
  if (!draft || !draft.id) throw new Error('Blogger returned no draft ID. Inspect API response.');
  p.setProperty(key,String(draft.id));
  Logger.log('TEST DRAFT CREATED. ID: '+draft.id);
  Logger.log('Open Blogger > Posts > Drafts; do not publish this test record.');
  return {status:'created_draft',draftId:draft.id};
}


/**
 * Expanded details are read only. These functions NEVER create or publish Blogger posts.
 * Data is fetched under the user's own approved TMDB access and is not persisted.
 */
function detailedPreview_(type) {
  if (type!=='movie' && type!=='tv') throw new Error('Unsupported media type.');
  const candidates=gather_().filter(x=>x.type===type);
  if (!candidates.length) throw new Error('No eligible '+type+' record found in trending.');
  const candidate=candidates[0].data;
  const detail=tmdb_(type+'/'+candidate.id+'?append_to_response=credits,videos');
  const genreMap=genres_(type);
  const html=mediaHtml_(candidate,type,genreMap);
  const additions=detailExtrasHtml_(detail,type);
  const composed=html.replace('</article>',additions+'</article>');
  const title=type==='tv'?detail.name:detail.title;
  Logger.log('EXPANDED '+type.toUpperCase()+' PREVIEW: '+title+' (#'+detail.id+')');
  Logger.log('PREVIEW HTML START\n'+composed+'\nPREVIEW HTML END');
  return {type:type,id:detail.id,title:title,html:composed};
}
function detailExtrasHtml_(detail,type) {
  const runtime=type==='movie'?detail.runtime:null;
  const seasons=type==='tv'?detail.number_of_seasons:null;
  const episodes=type==='tv'?detail.number_of_episodes:null;
  const creators=type==='tv'?(detail.created_by||[]).map(p=>p.name).slice(0,5):
    ((detail.credits&&detail.credits.crew)||[]).filter(p=>p.job==='Director').map(p=>p.name).slice(0,5);
  const cast=((detail.credits&&detail.credits.cast)||[]).slice(0,8);
  const officialVideos=((detail.videos&&detail.videos.results)||[])
    .filter(v=>v.site==='YouTube'&&v.official===true&&v.type==='Trailer'&&/^[A-Za-z0-9_-]{11}$/.test(v.key||''))
    .slice(0,2);
  const facts=[];
  if (Number.isFinite(runtime)&&runtime>0) facts.push('Runtime: '+Math.round(runtime)+' minutes');
  if (Number.isSafeInteger(seasons)) facts.push('Seasons: '+seasons);
  if (Number.isSafeInteger(episodes)) facts.push('Episodes: '+episodes);
  let extra='<section class="inext-media__section"><h3>More details</h3>';
  if (facts.length) extra+='<p>'+facts.map(esc_).join(' · ')+'</p>';
  if (creators.length) extra+='<p><strong>'+(type==='tv'?'Created by':'Director')+':</strong> '+creators.map(esc_).join(', ')+'</p>';
  if (cast.length) {
    extra+='<h3>Cast</h3><ul class="inext-cast-list">';
    for (const person of cast) {
      extra+='<li><strong>'+esc_(person.name)+'</strong>'+
        (person.character?' <span>as '+esc_(person.character)+'</span>':'')+'</li>';
    }
    extra+='</ul>';
  }
  if(officialVideos.length){
    extra+='<h3>Official trailers</h3><ul class="inext-trailers">';
    for(const video of officialVideos){
      const href='https://www.youtube.com/watch?v='+video.key;
      extra+='<li><a href="'+esc_(href)+'" target="_blank" rel="noopener noreferrer">'+esc_(video.name||'Watch official trailer')+'</a></li>';
    }
    extra+='</ul>';
  }
  extra+='</section>';
  return extra;
}
function previewExpandedMovieDetailHtml() { return detailedPreview_('movie'); }
function previewExpandedTvDetailHtml() { return detailedPreview_('tv'); }


/**
 * Read-only TMDB homepage catalog diagnostic.
 * Tests trending/popular movie and TV endpoints without creating any Blogger posts
 * and without exposing an API token to the public theme.
 * Keep results in the execution log only until TMDB licensing is approved.
 */
function previewHomepageCatalog() {
  const sections=[
    {name:'Trending Movies',type:'movie',path:'trending/movie/week'},
    {name:'Popular Movies',type:'movie',path:'movie/popular'},
    {name:'Trending TV Shows',type:'tv',path:'trending/tv/week'},
    {name:'Popular TV Shows',type:'tv',path:'tv/popular'}
  ];
  const output=[];
  for(const section of sections) {
    const data=tmdb_(section.path);
    const valid=(data.results||[]).filter(m=>approved_(m,section.type));
    const titles=valid.slice(0,5).map(m=>({
      id:m.id,
      title:section.type==='tv'?m.name:m.title,
      releaseDate:section.type==='tv'?m.first_air_date:m.release_date,
      hasPoster:!!m.poster_path
    }));
    output.push({section:section.name,eligibleCount:valid.length,sample:titles});
  }
  Logger.log('TMDB HOMEPAGE CATALOG PREVIEW (READ ONLY)');
  Logger.log(JSON.stringify(output,null,2));
  Logger.log('No Blogger content was created or published.');
  return output;
}


/**
 * Read-only public Blogger SEO endpoint audit.
 * Optional Script Property PUBLIC_SITE_URL defaults to https://inextcloud.blogspot.com.
 * No TMDB token, Blogger post writes or publishing in this function.
 */
function auditPublicSeoEndpoints() {
  const value=(props_().getProperty('PUBLIC_SITE_URL')||'https://inextcloud.blogspot.com').trim();
  if (!/^https:\/\/[a-z0-9.-]+\/?$/i.test(value)) throw new Error('Use a public HTTPS origin without a path in PUBLIC_SITE_URL.');
  const host=value.replace(/^https:\/\//i,'').replace(/\/$/,'').toLowerCase();
  if (host==='localhost' || !host.includes('.') || /^(?:\d+\.){3}\d+$/.test(host) || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('PUBLIC_SITE_URL must use a public DNS hostname.');
  const origin='https://'+host;
  const targets=[
    {name:'Homepage',path:'/',kind:'html'},
    {name:'robots.txt',path:'/robots.txt',kind:'robots'},
    {name:'Post sitemap',path:'/sitemap.xml',kind:'xml'},
    {name:'Page sitemap',path:'/sitemap-pages.xml',kind:'xml'}
  ];
  const results=[];
  for(const target of targets) {
    const url=origin+target.path;
    try {
      const response=UrlFetchApp.fetch(url,{muteHttpExceptions:true,followRedirects:false});
      const status=response.getResponseCode();
      const body=response.getContentText()||'';
      const result={name:target.name,url:url,httpStatus:status};
      if(status===200) {
        if(target.kind==='html') {
          const links=body.match(/<link\b[^>]*>/gi)||[];
          const canonical=links.filter(x=>/\brel\s*=\s*["']canonical["']/i.test(x));
          result.canonicalCount=canonical.length;
          const href=canonical.length?canonical[0].match(/\bhref\s*=\s*["']([^"']+)["']/i):null;
          result.canonicalUrl=href?href[1]:null;
          const metas=body.match(/<meta\b[^>]*>/gi)||[];
          result.hasDescription=metas.some(x=>/\bname\s*=\s*["']description["']/i.test(x));
          result.robotsMeta=metas.filter(x=>/\bname\s*=\s*["']robots["']/i.test(x)).slice(0,1);
          result.hasTitle=/<title\b[^>]*>[^<]+<\/title>/i.test(body);
        } else if(target.kind==='robots') {
          result.hasUserAgent=/^\s*User-agent\s*:/im.test(body);
          result.hasSitemapDirective=/^\s*Sitemap\s*:/im.test(body);
          result.sample=body.slice(0,400);
        } else {
          result.appearsXml=/^\s*(?:<\?xml[^>]*>\s*)?<(?:urlset|sitemapindex)(?:\s|>)/i.test(body);
          result.locCount=(body.match(/<loc>/g)||[]).length;
        }
      } else {
        const headers=response.getAllHeaders()||{};
        const key=Object.keys(headers).find(k=>k.toLowerCase()==='location');
        if(key)result.redirectLocation=String(headers[key]).slice(0,300);
        result.note='Review response manually; non-200 alone does not prove indexing failure.';
      }
      results.push(result);
    } catch(e) {
      results.push({name:target.name,url:url,error:String(e.message||e).slice(0,300)});
    }
  }
  Logger.log('PUBLIC BLOGGER SEO ENDPOINT AUDIT — READ ONLY');
  Logger.log(JSON.stringify(results,null,2));
  Logger.log('These checks do not verify Google indexing, policy compliance, or TMDB commercial rights.');
  return results;
}


/**
 * One-click prelaunch report. READ ONLY: lists published Blogger posts and
 * pages, tests public SEO endpoints, and flags obvious editorial gaps.
 * Does NOT call TMDB, create drafts, publish, or change Blogger settings.
 */
function runFullSiteReadinessAudit() {
  const blogId=required_('BLOGGER_BLOG_ID');
  const root=SETTINGS.bloggerBase+'/blogs/'+encodeURIComponent(blogId);
  const published=bloggerListAudit_(root+'/posts?status=live&maxResults=100',300);
  const pages=bloggerListAudit_(root+'/pages?status=live&maxResults=100',100);
  const seo=auditPublicSeoEndpoints();
  const problems=[];
  const summaries=[];
  const seen={};
  for(const post of published.items){
    const title=String(post.title||'').trim();
    const content=String(post.content||'');
    const labels=(post.labels||[]).map(x=>String(x).toLowerCase());
    const isMedia=labels.includes('movies')||labels.includes('tv shows');
    const chars=stripHtmlAudit_(content).length;
    const issues=[];
    if(!title)issues.push('missing title');
    if(chars<350)issues.push('short rendered content ('+chars+' chars)');
    if(/(?:do not publish|fictional content|layout test|internal test)/i.test(title+' '+content.slice(0,300)))issues.push('TEST CONTENT: review immediately');
    if(isMedia&&!/inext-media__hero/.test(content))issues.push('movie/TV label but no detail layout');
    if(isMedia&&!/overview|summary/i.test(content))issues.push('check original editorial context');
    if(!post.url)issues.push('missing public post URL');
    const normalized=title.toLowerCase();
    if(seen[normalized])issues.push('duplicate title');
    seen[normalized]=true;
    if(issues.length)problems.push({title:title.slice(0,120),url:post.url||null,issues:issues});
    summaries.push({title:title.slice(0,90),labels:labels.slice(0,5),chars:chars});
  }
  const pageWarnings=[];
  for(const page of pages.items){
    const body=String(page.content||'');
    const text=stripHtmlAudit_(body);
    const issues=[];
    if(/\[(?:PUBLIC CONTACT EMAIL|YOUR PUBLIC CONTACT EMAIL|LEGAL OPERATOR|DATE|FINAL SITE DOMAIN|COPYRIGHT CONTACT EMAIL|LIST ACTUAL PROVIDERS|SPECIFY ACTUAL RETENTION PERIODS|ADD LOCAL PRIVACY RIGHTS|INSERT AGE|APPLICABLE JURISDICTION|COUNTRY|LEGAL ENTITY)/i.test(body))issues.push('unresolved policy placeholder');
    if(text.length<150)issues.push('very short information page');
    if(/privacy/i.test(page.title||'') && !/mrshakil\.me@yahoo\.com|privacy@inextgroup\.cloud/i.test(body))issues.push('verify privacy contact details');
    if(issues.length)pageWarnings.push({title:page.title||'',url:page.url||'',issues:issues});
  }
  const sitemap=seo.find(x=>x.name==='Post sitemap');
  const pageSitemap=seo.find(x=>x.name==='Page sitemap');
  const report={
    generatedAt:new Date().toISOString(),
    blogId:blogId,
    publishedPostsCount:published.items.length,
    publishedPagesCount:pages.items.length,
    postListTruncated:published.truncated,
    pageListTruncated:pages.truncated,
    postSitemapLocCount:sitemap?sitemap.locCount:null,
    pageSitemapLocCount:pageSitemap?pageSitemap.locCount:null,
    pages:pages.items.map(x=>({title:x.title||'',url:x.url||''})),
    flaggedPageCount:pageWarnings.length,
    flaggedPages:pageWarnings,
    flaggedPostCount:problems.length,
    flaggedPosts:problems.slice(0,40),
    samplePublishedPosts:summaries.slice(0,15),
    seoEndpoints:seo,
    rightsReady:props_().getProperty('TMDB_RIGHTS_REVIEWED')==='yes'?'property set yes — independently verify evidence':'no — commercial TMDB publication blocked'
  };
  Logger.log('INEXTGROUP FULL SITE READINESS AUDIT — READ ONLY');
  Logger.log(JSON.stringify(report,null,2));
  Logger.log('No Blogger or TMDB content was created, edited, or published.');
  return report;
}
function bloggerListAudit_(firstUrl,maxItems) {
  const items=[];
  let next=firstUrl;
  let truncated=false;
  for(let batch=0;batch<5&&next;batch++){
    const result=UrlFetchApp.fetch(next,{
      headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken(),Accept:'application/json'},
      followRedirects:false,muteHttpExceptions:true
    });
    const status=result.getResponseCode();
    if(status!==200)throw new Error('Blogger list audit HTTP '+status);
    const payload=JSON.parse(result.getContentText());
    const list=payload.items||[];
    for(const item of list){
      if(items.length>=maxItems){truncated=true;break;}
      items.push({id:item.id,title:item.title,content:item.content,url:item.url,labels:item.labels||[]});
    }
    if(truncated)break;
    if(payload.nextPageToken){
      if(items.length>=maxItems){truncated=true;break;}
      next=firstUrl+(firstUrl.indexOf('?')>=0?'&':'?')+'pageToken='+encodeURIComponent(payload.nextPageToken);
    }else next=null;
    if(batch===4&&next)truncated=true;
  }
  return {items:items,truncated:truncated};
}
function stripHtmlAudit_(html) {
  return String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot|#\d+);/gi,' ')
    .replace(/\s+/g,' ').trim();
}


/**
 * Original editorial starter posts — expressly authorized by the owner.
 * NO TMDB API, poster, copyrighted synopsis, affiliate link or fake review.
 * This function intentionally publishes up to four original evergreen guides.
 * Re-running skips exact-title matches and successful publish markers.
 */
function publishOriginalEditorialGuides() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(5000))throw new Error('Another publication run is in progress.');
  try{
    const posts=originalEditorialGuides_();
    const blogId=required_('BLOGGER_BLOG_ID');
    const root=SETTINGS.bloggerBase+'/blogs/'+encodeURIComponent(blogId);
    const current=bloggerListAudit_(root+'/posts?status=live&maxResults=100',300);
    if(current.truncated)throw new Error('Published inventory was truncated; cannot safely prevent duplicates.');
    const existing=new Set(current.items.map(p=>String(p.title||'').trim().toLowerCase()));
    const outcome=[];
    for(const p of posts){
      const marker='INEXT_ORIGINAL_GUIDE_'+p.slug;
      const saved=props_().getProperty(marker);
      if(saved||existing.has(p.title.toLowerCase())){
        outcome.push({title:p.title,status:'already_exists',url:saved||null});
        continue;
      }
      const result=UrlFetchApp.fetch(root+'/posts',{
        method:'post',contentType:'application/json',
        headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},
        payload:JSON.stringify({kind:'blogger#post',title:p.title,content:p.html,labels:p.labels}),
        muteHttpExceptions:true,followRedirects:false
      });
      const status=result.getResponseCode();
      if(status!==200&&status!==201){
        outcome.push({title:p.title,status:'failed',httpStatus:status,detail:result.getContentText().slice(0,180)});
        break;
      }
      const published=JSON.parse(result.getContentText());
      if(!published.id)throw new Error('Blogger returned no post ID after publishing '+p.title);
      props_().setProperty(marker,String(published.url||published.id));
      existing.add(p.title.toLowerCase());
      outcome.push({title:p.title,status:'published',url:published.url||null,id:published.id});
    }
    Logger.log('INEXTGROUP ORIGINAL EDITORIAL — PUBLICATION RESULTS');
    Logger.log(JSON.stringify(outcome,null,2));
    Logger.log('Review live posts for accuracy, layout and search descriptions before requesting indexing.');
    return outcome;
  }finally{lock.releaseLock();}
}
function originalEditorialGuides_(){
  const entries=[{"title":"How to Check Where a Movie Is Legally Available to Watch","labels":["Movies","Viewing Guides"],"desc":"A practical method for checking official movie streaming, rental and purchase options without trusting misleading links.","sections":[["Start with the film, not a search result","When you want to watch a film, the hardest part is often finding the right release in your country. A search result can point to an old offer, an unofficial upload or a different film with a similar title. Begin by writing down the full movie title and, where possible, its release year. These details help distinguish remakes, sequels and similarly named productions. If a provider page lists the director or cast, use those details to confirm that you have found the correct title."],["Check the streaming provider directly","Open the official website or app of a streaming service available in your country, then search for the exact film. A title appearing in a search engine snippet is not enough to prove it can currently be streamed. Catalogue rights change by territory and over time. Check the actual title page for your location, the viewing format and any subscription requirement. Some services offer a film to rent or buy even when it is not included with their subscription."],["Understand the different viewing options","Subscription streaming means access may be included in a recurring plan, subject to the service's terms. Digital rental usually provides a limited viewing window and may have different rules before and after playback begins. Digital purchase generally means a license to access content under a provider's conditions, not ownership of the film's copyright. A cinema screening is a separate release channel. Never assume an option is free just because a link says 'watch now'."],["Watch for suspicious links","Be cautious when a website requests an unfamiliar browser extension, asks you to download an executable video player, or sends you through repeated redirects. Check the domain name carefully instead of relying on a recognizable logo. If a page promises a new cinema release free of charge without identifying an authorized distributor, treat that promise skeptically. Avoid submitting card details to a website whose business identity and payment terms you cannot verify."],["Confirm before paying","Before subscribing, renting or buying, check the film's language, audio and subtitle options, picture quality, supported devices, price and cancellation conditions. Availability can vary across the USA, UK and other regions. If you travel, your home subscription may not provide the same catalogue everywhere. The most reliable answer is the current listing inside the authorized provider's own service."],["What INEXTGROUP does","INEXTGROUP is an independent information website, not a streaming provider. An article here may help you identify a movie and understand a viewing option, but it does not guarantee that a specific provider has a title today. Always confirm current access and prices on the provider's official page. If we later introduce affiliate links, those commercial relationships should be disclosed beside the relevant recommendation."]],"slug":"evergreen_guide_1"},{"title":"Movie Ratings Explained: Audience Scores, Critics and Review Counts","labels":["Movies","Viewing Guides"],"desc":"Learn the difference between viewer ratings, professional reviews, voting averages and sample size before choosing a film.","sections":[["A score is a starting point","A movie rating condenses many opinions into one number or symbol. That can help you browse, but it cannot tell you whether a film matches your taste. Action fans may value pacing while drama fans look for character development. The most useful approach is to treat a rating as one signal alongside genre, subject, length and the type of story you want to watch."],["Audience and critic ratings measure different things","Audience scores summarize feedback from participating viewers. Critics' assessments usually reflect published reviews from reviewers or outlets. Each system has its own eligibility rules, scale and method of aggregation. A percentage of positive reviews is not necessarily the same as an average score out of ten. Before comparing sites, read the explanation of the rating system rather than assuming the numbers are interchangeable."],["Why the number of votes matters","Imagine a newly listed film with just a handful of enthusiastic votes and another film with thousands of votes across a much broader audience. Even if both display the same average, the underlying evidence is different. Small samples are more vulnerable to variation, selection effects and temporary spikes. A vote count is valuable context, especially for newly released films or lesser-known titles."],["Ratings change over time","New votes and reviews can move an aggregate score after release. Early reactions may come from festival audiences, devoted fans or people who sought out the film deliberately. Later viewers may have different expectations. A rating copied into an old article may no longer reflect the source website. Check the date of the article and, for an up-to-date number, consult the source directly."],["How to read ratings responsibly","Look for a clear source label, the scoring scale and the number of responses when available. Avoid treating a user-generated rating as a verified measure of artistic quality. Read a few balanced reviews that explain what worked and what did not, but watch for spoilers. If you are sensitive to certain themes, examine content guidance separately; a high rating does not mean a film suits every viewer."],["Our approach to rating information","When INEXTGROUP references a third-party community rating, that value should be attributed to the provider. It is not an original INEXTGROUP review score. We do not invent user ratings, critic consensus or vote counts. Readers can use ratings to narrow their choices, then decide for themselves what makes a film worth watching."]],"slug":"evergreen_guide_2"},{"title":"TV Seasons, Episodes and Limited Series: A Simple Viewing Guide","labels":["TV Shows","Viewing Guides"],"desc":"Understand television episode counts, release schedules, season numbering and limited series before starting a show.","sections":[["Season and episode are separate ideas","A season is a group of television episodes released or organized together. An episode is an individual installment. There is no universal number of episodes per season. A six-episode season and a twenty-episode season can both be complete within their own production model. This is why a season count alone tells you little about the amount of viewing time involved."],["Why episode numbering can vary","Broadcasters, streaming services, home-video releases and third-party databases may group specials or split seasons differently. A holiday special can be numbered separately, counted within a season or listed in a special category. Some international releases divide one season into two parts. When episode numbers seem inconsistent, look at the titles and original airing information instead of assuming one catalogue must be wrong."],["Limited series versus ongoing series","A limited series is generally presented as a self-contained run rather than an open-ended program. That does not automatically mean it has only one episode or a particular runtime. An ongoing series may receive additional seasons, but a listing for an earlier season is not a promise of renewal. Words such as 'planned', 'reported', 'renewed' and 'released' describe different levels of certainty and should not be used interchangeably."],["Weekly releases and full-season releases","Some series arrive episode by episode, while others become available as a full season on a particular service. A promotional date may refer to the first episode rather than the entire season. Country-specific schedules, time zones, platform rights and regional licensing can affect when viewers see new episodes. Check the official broadcaster or streaming provider for the schedule relevant to your location."],["Plan your viewing time","To estimate viewing time, multiply the approximate length of an episode by the number of episodes you intend to watch. Treat this as a rough estimate: opening recaps, finales, special episodes and episode lengths can vary. For a series you have not watched before, starting with a few episodes may be more useful than judging it solely by its total seasons."],["Check the status of a series","A database might label a series as returning, ended or in production, but those descriptions can change. Before discussing a future season as confirmed, look for an announcement from the creator, network, studio or streaming platform. INEXTGROUP aims to distinguish confirmed information from speculation. We do not list invented premiere dates, episodes or renewals."]],"slug":"evergreen_guide_3"},{"title":"How to Find Official Movie Trailers and Avoid Fake Video Links","labels":["Movies","TV Shows","Viewing Guides"],"desc":"Use official channels and basic verification checks to identify legitimate trailers and avoid misleading video links.","sections":[["What counts as an official trailer","A trailer is promotional video material released to introduce a movie or television series. Studios, distributors, broadcasters, streaming platforms and their verified partners may publish official versions. Fan edits, reaction videos, concept trailers and compilations can also be enjoyable, but they should not be mistaken for official footage. Look for clear attribution before sharing a clip as a confirmed trailer."],["Find the original publisher","A useful first step is to visit the movie's studio, distributor or official service website and follow its links to a video platform. On YouTube and other platforms, check the channel identity, links from the publisher's website and the video description. A verification badge may help, but it is not a substitute for checking whether the channel actually represents the rights holder."],["Read video titles carefully","Some unofficial uploads use phrases such as 'official trailer', 'first look' or '2027 teaser' even when the footage is a fan-made concept. A sensational thumbnail may combine scenes from unrelated movies or AI-generated imagery. Compare the title and announced release information against an official production announcement. If there is no corroborating source, describe the video as unofficial or unverified."],["Why regional clips can differ","Trailers may be edited for different markets, age classifications, languages or distribution partners. A dubbed trailer can be legitimate even if it is published by a regional distributor instead of the original studio channel. Release dates shown at the end of a trailer can also apply only to a particular country. Always check the market before treating a date as global."],["Protect your devices and accounts","You should not need to install a browser extension or download unknown software just to view a promotional video. Beware of sites that imitate a video player but redirect to forms asking for card details or account credentials. Prefer links from known official sources. If a video disappears, look for an authorized replacement rather than assuming a mirrored upload is safe."],["How INEXTGROUP handles trailers","Where verified and permitted, INEXTGROUP may link to official trailers rather than host copyrighted movie footage. We should identify the original publisher and avoid presenting fan concepts as studio announcements. A trailer link does not mean the full film or series is legally available to stream through our site."]],"slug":"evergreen_guide_4"}];
  return entries.map(function(a){
    const html='<article class="inext-editorial-guide">'+
      '<p><strong>INEXTGROUP Viewing Guide</strong> · Independent educational information</p>'+
      '<p>'+esc_(a.desc)+'</p>'+
      a.sections.map(function(section){return '<section><h2>'+esc_(section[0])+'</h2><p>'+esc_(section[1])+'</p></section>';}).join('')+
      '<p><strong>Editorial note:</strong> This guide explains general viewing and discovery concepts. For current release, prices, streaming availability and partner terms, consult the relevant authorized official provider. INEXTGROUP does not host movies or television streams.</p>'+
      '</article>';
    return {title:a.title,slug:a.slug,labels:a.labels,html:html};
  });
}
