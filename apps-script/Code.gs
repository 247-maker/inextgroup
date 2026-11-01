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
      extra+='<li'+(Number.isSafeInteger(person.id)?' data-inext-person-id="'+person.id+'"':'')+'><strong>'+esc_(person.name)+'</strong>'+
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
      items.push({id:item.id,title:item.title,content:item.content,url:item.url,status:item.status,labels:item.labels||[]});
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
    const posts=originalEditorialGuides_().concat(inextAdditionalEditorialGuides_());
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
  const entries=[{"title":"How to Check Where a Movie Is Legally Available to Watch","labels":["Movies","Viewing Guides"],"desc":"A practical method for checking official movie streaming, rental and purchase options without trusting misleading links.","sections":[["Start with the film, not a search result","When you want to watch a film, the hardest part is often finding the right release in your country. A search result can point to an old offer, an unofficial upload or a different film with a similar title. Begin by writing down the full movie title and, where possible, its release year. These details help distinguish remakes, sequels and similarly named productions. If a provider page lists the director or cast, use those details to confirm that you have found the correct title."],["Check the streaming provider directly","Open the official website or app of a streaming service available in your country, then search for the exact film. A title appearing in a search engine snippet is not enough to prove it can currently be streamed. Catalogue rights change by territory and over time. Check the actual title page for your location, the viewing format and any subscription requirement. Some services offer a film to rent or buy even when it is not included with their subscription."],["Understand the different viewing options","Subscription streaming means access may be included in a recurring plan, subject to the service's terms. Digital rental usually provides a limited viewing window and may have different rules before and after playback begins. Digital purchase generally means a license to access content under a provider's conditions, not ownership of the film's copyright. A cinema screening is a separate release channel. Never assume an option is free just because a link says 'watch now'."],["Watch for suspicious links","Be cautious when a website requests an unfamiliar browser extension, asks you to download an executable video player, or sends you through repeated redirects. Check the domain name carefully instead of relying on a recognizable logo. If a page promises a new cinema release free of charge without identifying an authorized distributor, treat that promise skeptically. Avoid submitting card details to a website whose business identity and payment terms you cannot verify."],["Confirm before paying","Before subscribing, renting or buying, check the film's language, audio and subtitle options, picture quality, supported devices, price and cancellation conditions. Availability can vary across the USA, UK and other regions. If you travel, your home subscription may not provide the same catalogue everywhere. The most reliable answer is the current listing inside the authorized provider's own service."],["What INEXTGROUP does","INEXTGROUP is an independent information website, not a streaming provider. An article here may help you identify a movie and understand a viewing option, but it does not guarantee that a specific provider has a title today. Always confirm current access and prices on the provider's official page. INEXTGROUP currently relies on display advertising rather than affiliate relationships. The presence of advertising does not guarantee that any third-party service offers a particular title."]],"slug":"evergreen_guide_1"},{"title":"Movie Ratings Explained: Audience Scores, Critics and Review Counts","labels":["Movies","Viewing Guides"],"desc":"Learn the difference between viewer ratings, professional reviews, voting averages and sample size before choosing a film.","sections":[["A score is a starting point","A movie rating condenses many opinions into one number or symbol. That can help you browse, but it cannot tell you whether a film matches your taste. Action fans may value pacing while drama fans look for character development. The most useful approach is to treat a rating as one signal alongside genre, subject, length and the type of story you want to watch."],["Audience and critic ratings measure different things","Audience scores summarize feedback from participating viewers. Critics' assessments usually reflect published reviews from reviewers or outlets. Each system has its own eligibility rules, scale and method of aggregation. A percentage of positive reviews is not necessarily the same as an average score out of ten. Before comparing sites, read the explanation of the rating system rather than assuming the numbers are interchangeable."],["Why the number of votes matters","Imagine a newly listed film with just a handful of enthusiastic votes and another film with thousands of votes across a much broader audience. Even if both display the same average, the underlying evidence is different. Small samples are more vulnerable to variation, selection effects and temporary spikes. A vote count is valuable context, especially for newly released films or lesser-known titles."],["Ratings change over time","New votes and reviews can move an aggregate score after release. Early reactions may come from festival audiences, devoted fans or people who sought out the film deliberately. Later viewers may have different expectations. A rating copied into an old article may no longer reflect the source website. Check the date of the article and, for an up-to-date number, consult the source directly."],["How to read ratings responsibly","Look for a clear source label, the scoring scale and the number of responses when available. Avoid treating a user-generated rating as a verified measure of artistic quality. Read a few balanced reviews that explain what worked and what did not, but watch for spoilers. If you are sensitive to certain themes, examine content guidance separately; a high rating does not mean a film suits every viewer."],["Our approach to rating information","When INEXTGROUP references a third-party community rating, that value should be attributed to the provider. It is not an original INEXTGROUP review score. We do not invent user ratings, critic consensus or vote counts. Readers can use ratings to narrow their choices, then decide for themselves what makes a film worth watching."]],"slug":"evergreen_guide_2"},{"title":"TV Seasons, Episodes and Limited Series: A Simple Viewing Guide","labels":["TV Shows","Viewing Guides"],"desc":"Understand television episode counts, release schedules, season numbering and limited series before starting a show.","sections":[["Season and episode are separate ideas","A season is a group of television episodes released or organized together. An episode is an individual installment. There is no universal number of episodes per season. A six-episode season and a twenty-episode season can both be complete within their own production model. This is why a season count alone tells you little about the amount of viewing time involved."],["Why episode numbering can vary","Broadcasters, streaming services, home-video releases and third-party databases may group specials or split seasons differently. A holiday special can be numbered separately, counted within a season or listed in a special category. Some international releases divide one season into two parts. When episode numbers seem inconsistent, look at the titles and original airing information instead of assuming one catalogue must be wrong."],["Limited series versus ongoing series","A limited series is generally presented as a self-contained run rather than an open-ended program. That does not automatically mean it has only one episode or a particular runtime. An ongoing series may receive additional seasons, but a listing for an earlier season is not a promise of renewal. Words such as 'planned', 'reported', 'renewed' and 'released' describe different levels of certainty and should not be used interchangeably."],["Weekly releases and full-season releases","Some series arrive episode by episode, while others become available as a full season on a particular service. A promotional date may refer to the first episode rather than the entire season. Country-specific schedules, time zones, platform rights and regional licensing can affect when viewers see new episodes. Check the official broadcaster or streaming provider for the schedule relevant to your location."],["Plan your viewing time","To estimate viewing time, multiply the approximate length of an episode by the number of episodes you intend to watch. Treat this as a rough estimate: opening recaps, finales, special episodes and episode lengths can vary. For a series you have not watched before, starting with a few episodes may be more useful than judging it solely by its total seasons."],["Check the status of a series","A database might label a series as returning, ended or in production, but those descriptions can change. Before discussing a future season as confirmed, look for an announcement from the creator, network, studio or streaming platform. INEXTGROUP aims to distinguish confirmed information from speculation. We do not list invented premiere dates, episodes or renewals."]],"slug":"evergreen_guide_3"},{"title":"How to Find Official Movie Trailers and Avoid Fake Video Links","labels":["Movies","TV Shows","Viewing Guides"],"desc":"Use official channels and basic verification checks to identify legitimate trailers and avoid misleading video links.","sections":[["What counts as an official trailer","A trailer is promotional video material released to introduce a movie or television series. Studios, distributors, broadcasters, streaming platforms and their verified partners may publish official versions. Fan edits, reaction videos, concept trailers and compilations can also be enjoyable, but they should not be mistaken for official footage. Look for clear attribution before sharing a clip as a confirmed trailer."],["Find the original publisher","A useful first step is to visit the movie's studio, distributor or official service website and follow its links to a video platform. On YouTube and other platforms, check the channel identity, links from the publisher's website and the video description. A verification badge may help, but it is not a substitute for checking whether the channel actually represents the rights holder."],["Read video titles carefully","Some unofficial uploads use phrases such as 'official trailer', 'first look' or '2027 teaser' even when the footage is a fan-made concept. A sensational thumbnail may combine scenes from unrelated movies or AI-generated imagery. Compare the title and announced release information against an official production announcement. If there is no corroborating source, describe the video as unofficial or unverified."],["Why regional clips can differ","Trailers may be edited for different markets, age classifications, languages or distribution partners. A dubbed trailer can be legitimate even if it is published by a regional distributor instead of the original studio channel. Release dates shown at the end of a trailer can also apply only to a particular country. Always check the market before treating a date as global."],["Protect your devices and accounts","You should not need to install a browser extension or download unknown software just to view a promotional video. Beware of sites that imitate a video player but redirect to forms asking for card details or account credentials. Prefer links from known official sources. If a video disappears, look for an authorized replacement rather than assuming a mirrored upload is safe."],["How INEXTGROUP handles trailers","Where verified and permitted, INEXTGROUP may link to official trailers rather than host copyrighted movie footage. We should identify the original publisher and avoid presenting fan concepts as studio announcements. A trailer link does not mean the full film or series is legally available to stream through our site."]],"slug":"evergreen_guide_4"}];
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


/**
 * Production-oriented TMDB ingestion tools. All preview functions READ ONLY.
 * No public API keys, browser endpoints or Apps Script public Web App deployment.
 * Real TMDB drafts may ONLY be created once commercial rights are independently
 * reviewed and TMDB_RIGHTS_REVIEWED has been explicitly set to yes by the owner.
 * Even after approval, NOTHING in this module publishes real TMDB content.
 */
const TMDB_CATALOG_SOURCES=Object.freeze([
  {section:'Trending Movies',type:'movie',path:'trending/movie/week'},
  {section:'Popular Movies',type:'movie',path:'movie/popular'},
  {section:'Trending TV Shows',type:'tv',path:'trending/tv/week'},
  {section:'Popular TV Shows',type:'tv',path:'tv/popular'}
]);

/** Private preview of the next catalog batch. No Blogger writes. */
function prepareTmdbCataloguePreview() {
  const list=tmdbCatalogCandidates_(3);
  const report=list.map((entry,i)=>({
    sequence:i+1,type:entry.type,id:entry.data.id,
    title:String(entry.data[entry.type==='movie'?'title':'name']),
    releaseDate:entry.type==='movie'?entry.data.release_date:entry.data.first_air_date,
    sections:entry.sections,
    hasPoster:!!entry.data.poster_path,
    overviewLength:String(entry.data.overview||'').length
  }));
  Logger.log('TMDB CATALOG PREVIEW — READ ONLY (no site updates)');
  Logger.log(JSON.stringify(report,null,2));
  return report;
}
function tmdbCatalogCandidates_(perTypeLimit) {
  const byType={movie:0,tv:0},seen={},output=[];
  for(const source of TMDB_CATALOG_SOURCES) {
    const data=tmdb_(source.path);
    for(const media of data.results||[]) {
      if(!approved_(media,source.type))continue;
      const key=source.type+':'+media.id;
      if(seen[key]){
        seen[key].sections.push(source.section);
        continue;
      }
      if(byType[source.type]>=perTypeLimit)continue;
      const item={type:source.type,data:media,sections:[source.section]};
      seen[key]=item;output.push(item);byType[source.type]++;
    }
  }
  return output;
}

/**
 * Owner-gated TMDB draft pipeline. Never publishes or schedules posts.
 * Imported draft HTML shows source metadata and a conspicuous editorial
 * review checklist; it must be enriched and approved manually before publishing.
 */
function prepareLicensedTmdbDraftBatch() {
  if(props_().getProperty('TMDB_RIGHTS_REVIEWED')!=='yes') {
    throw new Error('Commercial TMDB licensing and artwork rights not confirmed. Set TMDB_RIGHTS_REVIEWED=yes ONLY after verifying actual authorization.');
  }
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(5000))throw new Error('TMDB sync already running.');
  try {
    const max=6;
    const entries=tmdbCatalogCandidates_(3).slice(0,max);
    const blogId=required_('BLOGGER_BLOG_ID');
    const root=SETTINGS.bloggerBase+'/blogs/'+encodeURIComponent(blogId);
    const known=bloggerListAudit_(root+'/posts?status=live&maxResults=100',300);
    const existingDrafts=bloggerListAudit_(root+'/posts?status=draft&maxResults=100',300);
    const result=[];
    if(known.truncated||existingDrafts.truncated)throw new Error('Blogger inventory truncated; stop for safe duplicate checks.');
    const publishedTitles=new Set(known.items.concat(existingDrafts.items).map(x=>String(x.title||'').toLowerCase()));
    const genreMaps={};
    const publishedIndex=dbIndex_();
    for(const entry of entries){
      const m=entry.data,type=entry.type,key='tmdb_'+type+'_'+m.id;
      const title=String(type==='movie'?m.title:m.name).trim();
      const date=String(type==='movie'?m.release_date:m.first_air_date);
      const postTitle=title+' ('+date.slice(0,4)+') — '+(type==='tv'?'TV show':'Movie')+' details';
      if(props_().getProperty(key)||publishedTitles.has(postTitle.toLowerCase())){
        result.push({type:type,id:m.id,status:'skipped_existing'});continue;
      }
      if(!genreMaps[type])genreMaps[type]=genres_(type);
      const detail=tmdb_(type+'/'+encodeURIComponent(m.id)+'?append_to_response=credits,videos,keywords,release_dates,images,alternative_titles,recommendations,similar,reviews&include_image_language=en,null');
      const labels=[type==='movie'?'Movies':'TV Shows','TMDB']
        .concat((detail.genres||[]).map(g=>g.name).filter(Boolean).slice(0,4));
      const body=professionalMediaHtml_(detail,type,publishedIndex);
      const review='<section class="inext-pro-section">'+
        '<h3>Editorial review required before publishing</h3>'+
        '<p>This is an unreviewed TMDB metadata draft. Verify production details, copyrights, trailers and dates; add original editorial commentary. Remove this notice before publication.</p>'+
        '</section>';
      const content=body.replace('</article>',review+'</article>');
      const draft=bloggerInsertDraft_({
        kind:'blogger#post',title:postTitle,content:content,labels:labels
      });
      if(!draft||!draft.id)throw new Error('Blogger did not return a draft ID.');
      props_().setProperty(key,String(draft.id));
      result.push({type:type,id:m.id,title:postTitle,status:'created_draft',draftId:draft.id});
    }
    Logger.log('TMDB LICENSED DRAFT BATCH — NO POSTS PUBLISHED');
    Logger.log(JSON.stringify(result,null,2));
    return result;
  }finally{lock.releaseLock();}
}

/** Read-only status of commercial publishing gate and blog connection. */
function tmdbIntegrationStatus() {
  const p=props_();
  const status={
    tmdbTokenConfigured:!!p.getProperty('TMDB_READ_TOKEN'),
    bloggerBlogIdConfigured:!!p.getProperty('BLOGGER_BLOG_ID'),
    rightsFlag:p.getProperty('TMDB_RIGHTS_REVIEWED')==='yes'?'yes':'no',
    supportedSections:TMDB_CATALOG_SOURCES.map(x=>x.section),
    maxDraftsPerLicensedBatch:6,
    realTmdbPublishingEnabled:false,
    publicTmdbFeedEnabled:false,
    note:'No commercial permission is inferred from a valid API token.'
  };
  Logger.log(JSON.stringify(status,null,2));
  return status;
}


/**
 * Explicitly publishes ONLY manually reviewed TMDB drafts, selected by
 * the owner via Script Property TMDB_EDITORIAL_APPROVED_IDS.
 * No scheduled trigger, no publishing of drafts with editorial warning.
 * Blogger documentation: POST /blogs/{blogId}/posts/{postId}/publish.
 */
function publishReviewedTmdbPosts() {
  if(props_().getProperty('TMDB_RIGHTS_REVIEWED')!=='yes'){
    throw new Error('Commercial TMDB data/artwork licensing gate is not approved in Script Properties.');
  }
  const raw=String(props_().getProperty('TMDB_EDITORIAL_APPROVED_IDS')||'').trim();
  if(!raw)throw new Error('Set TMDB_EDITORIAL_APPROVED_IDS to the reviewed Blogger draft IDs (comma-separated).');
  const ids=[...new Set(raw.split(/[\s,;]+/).filter(Boolean))].slice(0,6);
  if(ids.some(id=>!/^\d{5,30}$/.test(id)))throw new Error('Only numeric Blogger post IDs are allowed.');
  const blogId=required_('BLOGGER_BLOG_ID');
  const root=SETTINGS.bloggerBase+'/blogs/'+encodeURIComponent(blogId)+'/posts/';
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(5000))throw new Error('Another publication is running.');
  try{
    const validated=[];
    for(const id of ids){
      const get=UrlFetchApp.fetch(root+encodeURIComponent(id),{
        headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},
        muteHttpExceptions:true,followRedirects:false
      });
      if(get.getResponseCode()!==200)throw new Error('Cannot read draft '+id+': HTTP '+get.getResponseCode());
      const p=JSON.parse(get.getContentText());
      const labels=(p.labels||[]).map(x=>String(x).toLowerCase());
      if(String(p.status).toUpperCase()!=='DRAFT')throw new Error(id+' is not a draft; stop.');
      if(!labels.includes('tmdb')||!(labels.includes('movies')||labels.includes('tv shows')))throw new Error(id+' is not a labelled TMDB media draft.');
      const body=String(p.content||'');
      if(/Editorial review required before publishing|This is an unreviewed metadata draft/i.test(body)){
        throw new Error('Remove the editorial-review notice and substantively review/edit draft '+id+' in Blogger first.');
      }
      if(!/inext-media__hero/.test(body)||stripHtmlAudit_(body).length<500)throw new Error('Insufficient reviewed media details in '+id);
      if(/do not publish|fictional content|layout test|internal test/i.test(String(p.title||'')+' '+body.slice(0,400)))throw new Error('Test-content marker found in '+id);
      validated.push({id:id,title:p.title||''});
    }
    // All drafts are validated before the first write.
    const published=[];
    for(const item of validated){
      const response=UrlFetchApp.fetch(root+encodeURIComponent(item.id)+'/publish',{
        method:'post',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},
        muteHttpExceptions:true,followRedirects:false
      });
      if(response.getResponseCode()!==200&&response.getResponseCode()!==201){
        throw new Error('Published '+published.length+' of '+validated.length+'; stopped at '+item.id+' HTTP '+response.getResponseCode());
      }
      const info=JSON.parse(response.getContentText());
      published.push({title:item.title,id:item.id,status:'published',url:info.url||''});
    }
    Logger.log('MANUALLY APPROVED TMDB POST PUBLICATION');
    Logger.log(JSON.stringify(published,null,2));
    return published;
  }finally{lock.releaseLock();}
}


// Movie/TV knowledge graph: only published internal URLs are used as internal links.
function dbIndex_(){
 const id=required_('BLOGGER_BLOG_ID'),root=SETTINGS.bloggerBase+'/blogs/'+encodeURIComponent(id);
 const pub=bloggerListAudit_(root+'/posts?status=live&maxResults=100',300);
 if(pub.truncated)throw new Error('Too many published posts for complete link inventory.');
 const people={},media={};
 pub.items.forEach(p=>{
  const h=String(p.content||'');
  const person=h.match(/data-inext-person-id=["'](\d+)["']/i);
  if(person&&p.url)people[person[1]]=p.url;
  const m=h.match(/themoviedb\.org\/(movie|tv)\/(\d+)/i);
  if(m&&p.url&&(h.indexOf('inext-media__hero')>=0||h.indexOf('inext-pro-media')>=0))media[m[1]+':'+m[2]]=p;
  // Newer rich posts have an explicit TMDB ID/type, independent of attribution links.
  const rich=h.match(/data-inext-media-id=["'](\d+)["'][^>]*data-inext-media-type=["'](movie|tv)["']/i);
  if(rich&&p.url)media[rich[2].toLowerCase()+':'+rich[1]]=p;
 });
 return {root:root,people:people,media:media,posts:pub.items};
}
function previewMovieDatabaseUpgrade(){
 const x=dbIndex_();
 const result={publishedPostCount:x.posts.length,mediaCount:Object.keys(x.media).length,
  publishedPersonProfiles:Object.keys(x.people).length,
  media:Object.keys(x.media).slice(0,20).map(k=>({tmdbKey:k,title:x.media[k].title,url:x.media[k].url}))};
 Logger.log(JSON.stringify(result,null,2));return result;
}
function dbRelated_(key,index){
 const type=key.split(':')[0],other=Object.keys(index.media).filter(k=>k!==key&&k.indexOf(type+':')===0).slice(0,6);
 const label=type==='movie'?'Movies':'TV Shows',category=type==='movie'?'Movies':'TV%20Shows';
 let h='<section class="inext-media__section inext-related"><h3>More '+label+' on INEXTGROUP</h3>';
 if(other.length){h+='<ul class="inext-related-list">';
  other.forEach(k=>{const p=index.media[k];h+='<li><a href="'+esc_(inextInternalHref_(p.url))+'">'+esc_(p.title)+'</a></li>';});
  h+='</ul>';
 }else h+='<p>More movie and TV profiles will appear as our database grows.</p>';
 return h+'<p><a href="/search/label/'+category+'">Browse '+label+'</a></p></section>';
}
function dbEnhanceHtml_(content,detail,key,index){
 let html=String(content||'');
 const cast=(detail.credits&&detail.credits.cast||[]).slice(0,12);
 let internalCast=0;
 // Remove previously generated sections before upgrading (idempotent).
 for(const pair of [['<!--INEXT_RELATED_START-->','<!--INEXT_RELATED_END-->'],
                    ['<!--INEXT_CAST_LINKS_START-->','<!--INEXT_CAST_LINKS_END-->']]){
  const a=html.indexOf(pair[0]),b=html.indexOf(pair[1]);
  if(a>=0&&b>a)html=html.slice(0,a)+html.slice(b+pair[1].length);
 }
 // Rewrite original cast-list entries by TMDB person ID, where available.
 // Unknown people are readable text: never send users outside INEXTGROUP.
 html=html.replace(/<li\b([^>]*data-inext-person-id=["'](\d+)["'][^>]*)>([\s\S]*?)<\/li>/gi,function(full,attrs,id,inside){
  const actor=index.people[id];
  const clean=inside.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi,'$1');
  const first=clean.match(/<strong>([\s\S]*?)<\/strong>/i);
  if(!first)return full;
  if(actor){internalCast++;
   return '<li'+attrs+'>'+clean.replace(first[0],'<strong><a href="'+esc_(inextInternalHref_(actor))+'">'+first[1]+'</a></strong>')+'</li>';
  }
  return '<li'+attrs+'>'+clean+'</li>';
 });
 // Convert legacy TMDB cast hyperlinks to verified internal links or plain text.
 html=html.replace(/<a\b[^>]*href=["']https:\/\/(?:www\.)?themoviedb\.org\/person\/(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
   function(_all,id,label){return index.people[id]?'<a href="'+esc_(inextInternalHref_(index.people[id]))+'">'+label+'</a>':label;});
 // Older posts had external TMDB actor links but no person-id attributes.
 // Rebuild their original cast list conservatively when the names match.
 cast.forEach(p=>{
  if(!Number.isSafeInteger(p.id)||!p.name)return;
  const actor=index.people[String(p.id)];
  const encoded=esc_(p.name);
  const existing='<strong>'+encoded+'</strong>';
  if(!actor||!html.includes(existing))return;
  html=html.replace(existing,'<strong><a href="'+esc_(inextInternalHref_(actor))+'">'+encoded+'</a></strong>');
 });
 const related='<!--INEXT_RELATED_START-->'+dbRelated_(key,index)+'<!--INEXT_RELATED_END-->';
 let profiles='<section class="inext-media__section inext-cast-links"><h3>Cast and profiles</h3><ul class="inext-cast-list">';
 cast.slice(0,10).forEach(p=>{
  if(!p||!p.name)return;
  const actor=index.people[String(p.id)],display=esc_(p.name);
  profiles+='<li>'+(actor?'<a href="'+esc_(inextInternalHref_(actor))+'">'+display+'</a>':'<span>'+display+'</span>')+
   (p.character?'<span>as '+esc_(p.character)+'</span>':'')+'</li>';
 });
 profiles+='</ul><p>Actor names become clickable when their INEXTGROUP profiles are published.</p></section>';
 const additions=related+'<!--INEXT_CAST_LINKS_START-->'+profiles+'<!--INEXT_CAST_LINKS_END-->';
 const endTag=html.lastIndexOf('</article>');
 html=endTag>=0?html.slice(0,endTag)+additions+html.slice(endTag):html+additions;
 return {html:html,castCount:cast.length,internalCast:internalCast};
}

/**
 * First run: read-only by default. INEXT_DB_DRY_RUN=no explicitly permits
 * up to six existing published media posts to be enriched in place.
 * Preserves all existing post text and appends idempotent related/cast sections.
 */
function upgradePublishedMovieDatabase(){
 if(props_().getProperty('TMDB_RIGHTS_REVIEWED')!=='yes')throw new Error('Rights flag must be yes for TMDB-derived content.');
 const lock=LockService.getScriptLock();
 if(!lock.tryLock(5000))throw new Error('Another database update is running.');
 try{
  const index=dbIndex_(),dry=props_().getProperty('INEXT_DB_DRY_RUN')!=='no',result=[];
  for(const key of Object.keys(index.media).slice(0,6)){
   const entry=index.media[key],pair=key.split(':');
   const detail=tmdb_(pair[0]+'/'+pair[1]+'?append_to_response=credits');
   const enhanced=dbEnhanceHtml_(entry.content,detail,key,index);
   if(enhanced.html===entry.content){result.push({title:entry.title,status:'unchanged'});continue;}
   if(dry){result.push({title:entry.title,status:'dry_run',castCount:enhanced.castCount,
     availableRelatedPosts:Object.keys(index.media).filter(k=>k!==key&&k.indexOf(pair[0]+':')===0).length});continue;}
   const response=UrlFetchApp.fetch(index.root+'/posts/'+encodeURIComponent(entry.id),{
    method:'put',contentType:'application/json',
    headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},
    payload:JSON.stringify({kind:'blogger#post',id:entry.id,title:entry.title,content:enhanced.html,labels:entry.labels||[]}),
    muteHttpExceptions:true,followRedirects:false
   });
   if(response.getResponseCode()!==200){
    result.push({title:entry.title,status:'error',httpStatus:response.getResponseCode()});break;
   }
   result.push({title:entry.title,status:'updated',url:entry.url,castCount:enhanced.castCount});
   Utilities.sleep(1100);
  }
  Logger.log('DATABASE ENHANCEMENT '+(dry?'DRY RUN':'LIVE UPDATE'));
  Logger.log(JSON.stringify(result,null,2));return result;
 }finally{lock.releaseLock();}
}
/**
 * Draft up to three person profiles. After manual publication, run the
 * database upgrade again to switch cast-profile links to internal URLs.
 */
function preparePersonProfileDrafts(){
 if(props_().getProperty('TMDB_RIGHTS_REVIEWED')!=='yes')throw new Error('Review people biography and photo rights.');
 const lock=LockService.getScriptLock();
 if(!lock.tryLock(5000))throw new Error('Already creating profiles.');
 try{
  const x=dbIndex_(),drafts=bloggerListAudit_(x.root+'/posts?status=draft&maxResults=100',300);
  if(drafts.truncated)throw new Error('Draft inventory truncated.');
  const known={...x.people},result=[],seen={};
  drafts.items.forEach(p=>{const m=String(p.content||'').match(/data-inext-person-id=["'](\d+)["']/);if(m)known[m[1]]=p.id;});
  for(const key of Object.keys(x.media).slice(0,3)){
   if(result.filter(a=>a.status==='created_draft').length>=3)break;
   const bits=key.split(':'),detail=tmdb_(bits[0]+'/'+bits[1]+'?append_to_response=credits');
   for(const cast of (detail.credits&&detail.credits.cast||[]).slice(0,5)){
    if(result.filter(a=>a.status==='created_draft').length>=3)break;
    if(!cast.id||seen[cast.id]||known[cast.id])continue;
    seen[cast.id]=1;
    const p=tmdb_('person/'+cast.id+'?append_to_response=combined_credits');
    if(!p.name||String(p.biography||'').length<120){result.push({id:cast.id,status:'insufficient_biography'});continue;}
    const photo=p.profile_path&&/^\/[a-z0-9/_-]+\.(jpg|png|webp)$/i.test(p.profile_path)?
      'https://image.tmdb.org/t/p/w342'+p.profile_path:'';
    let body='<article class="inext-person-profile" data-inext-person-id="'+p.id+'"><h2>'+esc_(p.name)+
      ' — Biography and Filmography</h2>'+
      (photo?'<img src="'+esc_(photo)+'" alt="'+esc_(p.name)+'" loading="lazy" width="230" height="345"/>':'')+
      '<p><strong>Known for:</strong> '+esc_(p.known_for_department||'Entertainment')+'</p>'+
      '<h3>Biography</h3><p>'+esc_(p.biography)+'</p><h3>Selected Filmography</h3><ul>';
    for(const f of ((p.combined_credits&&p.combined_credits.cast)||[]).filter(f=>f.media_type==='movie'||f.media_type==='tv').slice(0,12)){
     const internal=x.media[f.media_type+':'+f.id],name=esc_(f.title||f.name||'Untitled');
     body+='<li>'+(internal?'<a href="'+esc_(inextInternalHref_(internal.url))+'">'+name+'</a>':name)+'</li>';
    }
    body+='</ul><p>Source: <a href="https://www.themoviedb.org/person/'+p.id+'">TMDB profile</a></p>'+
      '<p><strong>Editorial review required before publishing:</strong> Verify bio and image rights, add original context, then remove this message.</p></article>';
    const created=bloggerInsertDraft_({kind:'blogger#post',title:p.name+' — Biography and Filmography',
      content:body,labels:['People','TMDB']});
    if(!created||!created.id)throw new Error('No draft ID returned for '+p.name);
    known[String(p.id)]=created.id;
    result.push({name:p.name,id:p.id,draftId:created.id,status:'created_draft'});
    Utilities.sleep(1100);
   }
  }
  Logger.log(JSON.stringify(result,null,2));return result;
 }finally{lock.releaseLock();}
}


/**
 * Rich professional Movie / TV view; uses actual detailed TMDB data, no fictional facts.
 * Movie and cast navigation remain internal to published INEXTGROUP URLs only.
 * Source attribution/official trailers may open trusted external sites.
 */
function professionalMediaHtml_(d,type,index) {
 const tv=type==='tv',title=String(tv?d.name:d.title||''),date=String(tv?d.first_air_date:d.release_date||'');
 if(!title||!Number.isSafeInteger(d.id))throw new Error('Invalid TMDB movie/series details.');
 const e=esc_,item=index||{people:{},media:{}},year=/^\d{4}/.test(date)?date.slice(0,4):'';
 const img=(path,size)=>path&&/^\/[a-z0-9/_-]+\.(?:jpg|png|webp)$/i.test(path)?'https://image.tmdb.org/t/p/'+size+path:'';
 const poster=img(d.poster_path,'w500'),backdrop=img(d.backdrop_path,'w1280');
 const text=(v)=>v==null||v===''?'':e(v);
 const tile=(label,value)=>value?'<div class="inext-info-tile"><dt>'+e(label)+'</dt><dd>'+e(value)+'</dd></div>':'';
 const money=n=>Number.isFinite(n)&&n>0?'$'+Math.round(n).toLocaleString('en-US'):'';
 const rating=Number.isFinite(d.vote_average)&&d.vote_count>0?d.vote_average.toFixed(1)+'/10 · '+d.vote_count.toLocaleString('en-US')+' TMDB votes':'';
 const credit=d.credits||{},crew=credit.crew||[],cast=(credit.cast||[]).slice(0,60);
 const directors=crew.filter(p=>p.job==='Director').map(p=>p.name).filter(Boolean);
 const writers=crew.filter(p=>/^(Screenplay|Writer|Story|Teleplay)$/.test(p.job||'')).map(p=>p.name).filter(Boolean);
 const leads=tv?(d.created_by||[]).map(p=>p.name).filter(Boolean):directors;
 const unique=a=>[...new Set(a)];
 const videos=((d.videos&&d.videos.results)||[]).filter(v=>v.site==='YouTube'&&v.official===true&&['Trailer','Teaser','Featurette'].includes(v.type)&&/^[A-Za-z0-9_-]{11}$/.test(v.key||'')).slice(0,8);
 const heroTrailer=videos.find(v=>v.type==='Trailer')||videos[0]||null;
 const genres=(d.genres||[]).map(g=>g.name).filter(Boolean);
 const countries=(d.production_countries||[]).map(p=>p.name).filter(Boolean);
 const companies=(d.production_companies||[]).map(p=>p.name).filter(Boolean);
 const keywords=((d.keywords&&(d.keywords.keywords||d.keywords.results))||[]).map(k=>k.name).filter(Boolean).slice(0,10);
 const certs=((d.release_dates&&d.release_dates.results)||[]).filter(r=>r.iso_3166_1==='US');
 const certification=certs.reduce((found,region)=>found||((region.release_dates||[]).map(x=>x.certification).find(Boolean)||''),'');
 const language=d.original_language||'';
 let html='<article class="inext-pro-media inext-media" data-inext-media-id="'+d.id+'" data-inext-media-type="'+type+'">';
 html+='<div class="inext-pro-banner"'+(backdrop?' style="background-image:linear-gradient(90deg,rgba(7,13,23,.97) 0%,rgba(7,13,23,.65) 68%,rgba(7,13,23,.44)),url(&quot;'+e(backdrop)+'&quot;)"':'')+'><div class="inext-pro-hero">';
 html+='<div class="inext-pro-cover">'+(poster?'<img src="'+e(poster)+'" alt="'+e(title)+' poster" width="360" height="540" loading="eager" fetchpriority="high"/>':'<div class="inext-pro-fallback">No poster available</div>')+'</div>';
 html+='<div class="inext-pro-summary"><p class="inext-pro-kicker">'+(tv?'TV Series':'Movie')+(year?' · '+year:'')+'</p><h2 class="inext-media__title">'+e(title)+'</h2>';
 if(d.tagline)html+='<p class="inext-pro-tagline">'+e(d.tagline)+'</p>';
 html+='<div class="inext-pro-pills">'+(date?'<span>'+e(date)+'</span>':'')+(d.runtime?'<span>'+Math.round(d.runtime)+' min</span>':'')+(tv&&d.number_of_seasons!=null?'<span>'+d.number_of_seasons+' season(s)</span>':'')+(certification?'<span>'+e(certification)+'</span>':'')+'</div>';
 if(rating)html+='<p class="inext-pro-rating">★ '+e(rating)+'</p>';
 if(genres.length)html+='<p class="inext-pro-genres">'+genres.map(e).join(' · ')+'</p>';
 if(leads.length)html+='<p><strong>'+(tv?'Created by':'Directed by')+':</strong> '+unique(leads).map(e).join(', ')+'</p>';
 if(d.overview)html+='<p class="inext-hero-overview">'+e(d.overview)+'</p>';
 if(heroTrailer)html+='<div class="inext-hero-actions"><a class="inext-hero-trailer" href="https://www.youtube.com/watch?v='+heroTrailer.key+'" target="_blank" rel="noopener noreferrer">▶ Play official '+e(heroTrailer.type.toLowerCase())+'</a></div>';
 html+='</div></div></div>';
 html+='<div class="inext-detail-layout"><div class="inext-detail-main">';
 html+='<nav class="inext-pro-jump" aria-label="Movie details"><a href="#inext-overview">Overview</a><a href="#inext-cast">Cast</a><a href="#inext-facts">Facts</a><a href="#inext-crew">Crew</a><a href="#inext-gallery">Gallery</a><a href="#inext-media">Trailers</a><a href="#inext-related">Related</a></nav>';
 if(d.overview)html+='<section class="inext-pro-section" id="inext-overview"><h3>Story Overview</h3><p>'+e(d.overview)+'</p></section>';
 html+='<section class="inext-pro-section" id="inext-cast"><h3>Cast &amp; Characters'+((credit.cast||[]).length>cast.length?' ('+cast.length+' of '+credit.cast.length+')':' ('+cast.length+')')+'</h3><div class="inext-pro-cast-grid">';
 for(const p of cast){
   if(!p.name)continue;
   const internal=item.people[String(p.id)]||'',photo=img(p.profile_path,'w185');
   html+='<div class="inext-pro-person" data-inext-person-id="'+e(p.id||'')+'">';
   if(photo)html+='<img src="'+e(photo)+'" alt="'+e(p.name)+'" loading="lazy" width="92" height="138"/>';
   else html+='<div class="inext-pro-avatar" aria-hidden="true">●</div>';
   html+='<div>'+(internal?'<a href="'+e(inextInternalHref_(internal))+'" class="inext-pro-person-name">'+e(p.name)+'</a>':'<strong class="inext-pro-person-name">'+e(p.name)+'</strong>')+
    (p.character?'<small>as '+e(p.character)+'</small>':'')+'</div></div>';
 }
 html+='</div></section>';
 const runtime=tv?'':d.runtime?Math.round(d.runtime)+' minutes':'';
 html+='<section class="inext-pro-section" id="inext-facts"><h3>Movie &amp; Production Facts</h3><dl class="inext-pro-info-grid">';
 html+=tile('Status',d.status)+tile('Original title',tv?d.original_name:d.original_title)+tile(tv?'First air date':'Release date',date)+tile('Runtime',runtime)+
 tile('Original language',language.toUpperCase())+tile('Director',unique(directors).join(', '))+tile('Writer',unique(writers).join(', '))+
 tile('Genres',genres.join(', '))+tile('Production countries',countries.join(', '))+
 tile('Production companies',companies.join(', '))+tile('Budget',tv?'':money(d.budget))+
 tile('Revenue',tv?'':money(d.revenue))+tile('US certification',certification)+
 (tv?tile('Seasons',String(d.number_of_seasons==null?'':d.number_of_seasons))+tile('Episodes',String(d.number_of_episodes==null?'':d.number_of_episodes)):'');
 html+='</dl></section>';
 if(keywords.length)html+='<section class="inext-pro-section"><h3>Topics &amp; Keywords</h3><p>'+keywords.map(e).join(' · ')+'</p></section>';
 html+='<section class="inext-pro-section" id="inext-media"><h3>Official Videos</h3>';
 if(videos.length){html+='<div class="inext-video-cards">';videos.forEach(v=>{html+='<a class="inext-video-card" href="https://www.youtube.com/watch?v='+v.key+'" target="_blank" rel="noopener noreferrer"><img src="https://i.ytimg.com/vi/'+v.key+'/hqdefault.jpg" alt="'+e(v.name||'Official video')+' thumbnail" loading="lazy" width="320" height="180"/><span class="inext-video-play" aria-hidden="true">▶</span><strong>'+e(v.name||'Official video')+'</strong><small>'+e(v.type)+'</small></a>';});html+='</div>';}
 else html+='<p>No verified official trailer was returned by the API for this record.</p>';
 html+='</section>';
 if(tv)html+=professionalTvSeasonsHtml_(d);
 html+=professionalVerifiedEditorial_(d,type);
 html+=professionalSupplementHtml_(d,type,item);
 const currentKey=type+':'+d.id;
 // Reuse the verified first-party related-post graph; never create fake links.
 html+='<div id="inext-related">'+dbRelated_(currentKey,item)+'</div>';
 html+='<p class="inext-media__source">Movie and television metadata: TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. <a href="https://www.themoviedb.org/'+type+'/'+d.id+'" target="_blank" rel="noopener noreferrer">Source record</a>.</p>';
 html+='</div>'+professionalDetailsSidebar_(d,type)+'</div>';
 html+='</article>';
 return html;
}
/**
 * Read-only preview and explicit one-post upgrade.
 * Backup MUST succeed before modifying a previously published article.
 */
function previewDogStarsProfessionalUpgrade(){
 const idx=dbIndex_(),target=idx.posts.find(p=>/\/the-dog-stars-2026-movie-details\.html(?:[?#]|$)/.test(p.url||''));
 if(!target)throw new Error('The Dog Stars published URL is not in the current Blogger inventory.');
 const detail=tmdb_('movie/1384216?append_to_response=credits,videos,keywords,release_dates,images,alternative_titles,recommendations,similar,reviews&include_image_language=en,null');
 const html=professionalMediaHtml_(detail,'movie',idx);
 const result={postId:target.id,url:target.url,title:target.title,
   oldHtmlCharacters:String(target.content||'').length,newHtmlCharacters:html.length,
   castCount:(detail.credits&&detail.credits.cast||[]).length,
   productionCompanies:(detail.production_companies||[]).length,
   trailerCount:(detail.videos&&detail.videos.results||[]).filter(v=>v.official&&v.type==='Trailer').length,
   warning:'Read-only. Applying will replace old body after backing it up; review your existing custom editorial text first.'};
 Logger.log(JSON.stringify(result,null,2));return result;
}
function applyDogStarsProfessionalUpgrade(){
 if(props_().getProperty('TMDB_RIGHTS_REVIEWED')!=='yes')throw new Error('Commercial rights gate not enabled.');
 const lock=LockService.getScriptLock();
 if(!lock.tryLock(5000))throw new Error('Movie update already running.');
 try{
  const idx=dbIndex_(),post=idx.posts.find(p=>/\/the-dog-stars-2026-movie-details\.html(?:[?#]|$)/.test(p.url||''));
  if(!post||!post.id||!post.url)throw new Error('Exact published The Dog Stars post not found.');
  const detail=tmdb_('movie/1384216?append_to_response=credits,videos,keywords,release_dates,images,alternative_titles,recommendations,similar,reviews&include_image_language=en,null');
  if(detail.id!==1384216)throw new Error('TMDB ID mismatch');
  const updatedHtml=professionalMediaHtml_(detail,'movie',idx);
  if(updatedHtml.length<1300)throw new Error('Unexpected article HTML');
  const backupId=inextBackupPublishedPost_(idx,post);
  const response=UrlFetchApp.fetch(idx.root+'/posts/'+encodeURIComponent(post.id),{
    method:'put',contentType:'application/json',
    headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},
    payload:JSON.stringify({kind:'blogger#post',id:post.id,title:post.title,content:updatedHtml,labels:post.labels||[]}),
    muteHttpExceptions:true,followRedirects:false
  });
  if(response.getResponseCode()!==200)throw new Error('Blogger update HTTP '+response.getResponseCode());
  const updated=JSON.parse(response.getContentText());
  const result={status:'updated',url:updated.url||post.url,backupDraftId:backupId,
    note:'Previous HTML saved as private Blogger draft. Original editorial additions may need restoring from the backup.'};
  Logger.log(JSON.stringify(result,null,2));return result;
 }finally{lock.releaseLock();}
}

/**
 * Supplemental TMDB detail modules: media, full crew, titles, regional release
 * details, vetted reviews count and only REAL internal recommendations.
 * This is source-attributed data, not original user reviews or fake votes.
 */
function professionalSupplementHtml_(d,type,index){
 const e=esc_,img=(p,size)=>p&&/^\/[a-z0-9/_-]+\.(jpg|png|webp)$/i.test(p)?'https://image.tmdb.org/t/p/'+size+p:'';
 const crew=(d.credits&&d.credits.crew)||[],selected=[];
 const roles=['Director','Screenplay','Writer','Story','Producer','Executive Producer','Director of Photography','Original Music Composer','Editor'];
 const seen={};
 for(const role of roles){
  for(const p of crew.filter(x=>x.job===role).slice(0,8)){
   const key=role+':'+p.id;if(seen[key]||!p.name)continue;seen[key]=true;
   selected.push({person:p,role:role});
  }
 }
 let html='';
 if(selected.length){
  html+='<section class="inext-pro-section" id="inext-crew"><h3>Key Crew</h3><div class="inext-pro-crew-grid">';
  selected.slice(0,24).forEach(x=>{
   const inside=index.people[String(x.person.id)];
   html+='<div class="inext-pro-crew-member">'+(inside?'<a href="'+e(inextInternalHref_(inside))+'">'+e(x.person.name)+'</a>':'<strong>'+e(x.person.name)+'</strong>')+
    '<small>'+e(x.role)+'</small></div>';
  });
  html+='</div></section>';
 }
 const titles=(d.alternative_titles&&(d.alternative_titles.titles||d.alternative_titles.results)||[]);
 if(titles.length){
  const unique={},alternative=[];
  for(const t of titles){
   const name=String(t.title||'').trim();
   if(!name||unique[name.toLowerCase()])continue;
   unique[name.toLowerCase()]=true;
   alternative.push({title:name,country:t.iso_3166_1||''});
   if(alternative.length===8)break;
  }
  if(alternative.length){
   html+='<section class="inext-pro-section" id="inext-alt-titles"><h3>Alternative Titles</h3><ul class="inext-pro-simple-list">';
   for(const item of alternative)html+='<li>'+e(item.title)+(item.country?' <small>('+e(item.country)+')</small>':'')+'</li>';
   html+='</ul></section>';
  }
 }
 const dates=(d.release_dates&&d.release_dates.results||[]).filter(r=>['US','GB','BD'].includes(r.iso_3166_1||''));
 if(dates.length){
  html+='<section class="inext-pro-section" id="inext-release-dates"><h3>Regional Release Dates</h3><div class="inext-pro-release-list">';
  for(const region of dates){
   const entries=(region.release_dates||[]).filter(x=>x.release_date).slice(0,5);
   for(const item of entries){
    const iso=String(item.release_date||'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))continue;
    html+='<div><strong>'+e(region.iso_3166_1)+'</strong> <span>'+e(iso)+'</span>'+
      (item.certification?'<span>'+e(item.certification)+'</span>':'')+'</div>';
   }
  }
  html+='</div><p class="inext-pro-caption">Availability and release formats vary by region; confirm current listings with official distributors.</p></section>';
 }
 const photos=d.images||{},posters=(photos.posters||[]).slice(0,4),backdrops=(photos.backdrops||[]).slice(0,6);
 const allImages=[...backdrops.map(x=>({file:x.file_path,size:'w780',kind:'Backdrop'})),
  ...posters.map(x=>({file:x.file_path,size:'w342',kind:'Poster'}))].filter(x=>img(x.file,x.size));
 if(allImages.length){
  html+='<section class="inext-pro-section" id="inext-gallery"><h3>Media Gallery</h3><div class="inext-pro-gallery">';
  for(const [i,item] of allImages.entries()){
   const url=img(item.file,item.size);
   html+='<figure><img src="'+e(url)+'" loading="lazy" decoding="async" alt="'+e((d.title||d.name||'Movie')+' '+item.kind+' '+(i+1))+
    '" width="'+(item.kind==='Backdrop'?'400':'250')+'" height="'+(item.kind==='Backdrop'?'225':'375')+'"/><figcaption>'+item.kind+'</figcaption></figure>';
  }
  html+='</div></section>';
 }
 // Actual user review content is not reproduced. Show count only when supported.
 if(d.reviews&&Number.isSafeInteger(d.reviews.total_results)&&d.reviews.total_results>0){
  html+='<section class="inext-pro-section" id="inext-reviews"><h3>TMDB Community Reviews</h3>'+
   '<p>TMDB currently reports '+d.reviews.total_results.toLocaleString('en-US')+
   ' community review(s). INEXTGROUP does not present those as original INEXTGROUP reviews.</p></section>';
 }
 const suggested=(d.recommendations&&d.recommendations.results||[]).concat(d.similar&&d.similar.results||[]);
 const shown={},links=[];
 for(const m of suggested){
  const key=type+':'+m.id,internal=index.media[key];
  if(!internal||!internal.url||shown[key]||m.id===d.id)continue;
  shown[key]=true;links.push({url:internal.url,title:internal.title||m.title||m.name||''});
  if(links.length===8)break;
 }
 if(links.length){
  html+='<section class="inext-pro-section" id="inext-recommendations"><h3>You May Also Like on INEXTGROUP</h3><ul class="inext-related-list">';
  links.forEach(x=>{html+='<li><a href="'+e(inextInternalHref_(x.url))+'">'+e(x.title)+'</a></li>';});
  html+='</ul></section>';
 }
 return html;
}


/**
 * Backup a live post as a PRIVATE Blogger draft and verify it exists.
 * Never overwrite a published post unless the backup has been persisted.
 */
/**
 * Blogger sometimes rejects posts.get for DRAFT posts (404/403) even when the
 * draft was created successfully. Use ADMIN view first, then verify via
 * posts.list?status=draft, which is also used by the site's other draft flows.
 * This function NEVER updates a live post without a separate, read-back
 * verified private backup draft.
 */
function inextBackupPublishedPost_(index,p){
  const marker='INEXT_PRO_BACKUP_'+p.id;
  const props=props_();
  const expectedTitle='INTERNAL BACKUP — '+String(p.title||'Untitled').slice(0,100)+' — '+p.id;
  const original=String(p.content||'');
  if(original.length<100)throw new Error('Refusing to back up an unexpectedly empty published post '+p.id);
  const root=index.root+'/posts';
  // Existing draft list allows recovery if previous run created a backup,
  // but failed immediately afterwards on an unsupported posts.get request.
  const drafts=bloggerListAudit_(root+'?status=draft&maxResults=100&fetchBodies=true',300);
  if(drafts.truncated)throw new Error('Draft listing truncated. Cannot verify original backup safely.');
  const priorId=props.getProperty(marker);
  const matches=drafts.items.filter(d=>
    (priorId&&String(d.id)===String(priorId))||
    (String(d.title||'')===expectedTitle&&(d.labels||[]).indexOf('INEXT Backup')!==-1)
  );
  let draft=matches[0]||null;
  if(!draft){
    const created=bloggerInsertDraft_({
      kind:'blogger#post',title:expectedTitle,content:original,labels:['INEXT Backup']
    });
    if(!created||!created.id)throw new Error('Backup draft not created; live post unchanged.');
    const verified=bloggerListAudit_(root+'?status=draft&maxResults=100&fetchBodies=true',300);
    if(verified.truncated)throw new Error('Draft inventory truncated after creation; live post unchanged.');
    draft=verified.items.find(d=>String(d.id)===String(created.id));
    if(!draft)throw new Error('Backup created but not visible in Blogger draft list; live post unchanged. Draft ID '+created.id);
  }
  // Blogger can rewrite harmless HTML whitespace/attribute formatting on save.
  // Confirm meaningful body data, media identity, and labels survived.
  const stored=String(draft.content||'');
  const before=stripHtmlAudit_(original),after=stripHtmlAudit_(stored);
  const compact=x=>x.replace(/\s+/g,' ').trim();
  if((draft.labels||[]).indexOf('INEXT Backup')===-1||
     String(draft.title||'')!==expectedTitle||
     stored.length<100||
     compact(before)!==compact(after)){
    throw new Error('Backup data differs after Blogger normalization; live post unchanged. Inspect private backup draft '+draft.id);
  }
  props.setProperty(marker,String(draft.id));
  Logger.log('Verified private Blogger backup for '+p.title+': '+draft.id);
  return String(draft.id);
}

/**
 * One run updates up to 6 existing published MOVIE/TV pages.
 * Starts with The Dog Stars if found, then other media records.
 * Uses private verified Blogger draft backups before every overwrite;
 * preserves title, labels and original post URL. Updates metadata from API.
 * Existing custom editorial additions must be restored from backup if needed.
 */
function upgradePublishedMovieDetailsBatch(){
  if(props_().getProperty('TMDB_RIGHTS_REVIEWED')!=='yes')
    throw new Error('Owner commercial permission flag is not enabled.');
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(5000))throw new Error('Already upgrading movie details.');
  try{
    const idx=dbIndex_();
    const keys=Object.keys(idx.media).sort((a,b)=>a==='movie:1384216'?-1:b==='movie:1384216'?1:0);
    const result=[];
    const query='?append_to_response=credits,videos,keywords,release_dates,images,alternative_titles,recommendations,similar,reviews&include_image_language=en,null';
    for(const key of keys.slice(0,6)){
      const p=idx.media[key],parts=key.split(':'),type=parts[0],id=Number(parts[1]);
      if(!p.url)continue;
      const detail=tmdb_(type+'/'+id+query);
      if(Number(detail.id)!==id)throw new Error('Wrong TMDB detail ID for '+key);
      const newBody=professionalMediaHtml_(detail,type,idx);
      if(!newBody.includes('inext-pro-banner')||newBody.length<1300)throw new Error('Unexpected detail HTML for '+key);
      if(newBody===p.content){result.push({title:p.title,status:'unchanged',url:p.url});continue;}
      const backup=inextBackupPublishedPost_(idx,p);
      const response=UrlFetchApp.fetch(idx.root+'/posts/'+encodeURIComponent(p.id),{
        method:'put',contentType:'application/json',
        headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},
        payload:JSON.stringify({kind:'blogger#post',id:p.id,title:p.title,
          content:newBody,labels:p.labels||[]}),
        muteHttpExceptions:true,followRedirects:false
      });
      if(response.getResponseCode()!==200){
        result.push({title:p.title,status:'failed',httpStatus:response.getResponseCode(),backupDraftId:backup});
        Logger.log(JSON.stringify(result,null,2));
        throw new Error('Stopped batch at '+key+' after '+result.length+' item(s).');
      }
      const updated=JSON.parse(response.getContentText());
      result.push({title:p.title,status:'updated',url:updated.url||p.url,
        backupDraftId:backup,castCount:((detail.credits||{}).cast||[]).length,
        photoCount:((detail.images||{}).backdrops||[]).length});
      Utilities.sleep(1250);
    }
    Logger.log('PROFESSIONAL MOVIE/TV UPGRADE COMPLETE');
    Logger.log(JSON.stringify(result,null,2));
    return result;
  }finally{lock.releaseLock();}
}


/**
 * Independent editorial fact box only when checked against a primary source.
 * This does NOT override TMDB data or assume worldwide release timing.
 * Studio reference: 20th Century Studios, The Dog Stars movie page.
 */
function professionalVerifiedEditorial_(detail,type){
 if(type!=='movie'||Number(detail.id)!==1384216)return '';
 return '<section class="inext-pro-section inext-verified" id="inext-verified">'+
  '<h3>Official Studio-Verified Information</h3>'+
  '<p><strong>The Dog Stars</strong> is a Ridley Scott-directed post-apocalyptic thriller adapted from Peter Heller’s novel. The film follows a pilot who sets out after receiving a mysterious radio transmission in a devastated world.</p>'+
  '<dl class="inext-pro-info-grid">'+
  '<div class="inext-info-tile"><dt>US theatrical release</dt><dd>August 28, 2026</dd></div>'+
  '<div class="inext-info-tile"><dt>Studio-listed runtime</dt><dd>1 hour 58 minutes</dd></div>'+
  '<div class="inext-info-tile"><dt>US rating</dt><dd>R</dd></div>'+
  '<div class="inext-info-tile"><dt>Director</dt><dd>Ridley Scott</dd></div>'+
  '<div class="inext-info-tile"><dt>Screenplay</dt><dd>Mark L. Smith</dd></div>'+
  '</dl><p class="inext-pro-caption">These are US studio details, not a guarantee of release dates in other countries. '+
  '<a href="https://www.20thcenturystudios.com/movies/the-dog-stars" target="_blank" rel="noopener noreferrer">Official 20th Century Studios source</a>.</p>'+
  '</section>';
}


/**
 * INEXTGROUP complete launch pass (manual, owner-triggered).
 * 1. Inventory published movie/TV titles and person pages.
 * 2. Create/publish up to 12 missing first-party cast biographies.
 * 3. Re-read published URLs, then upgrade up to 8 Movie/TV pages.
 * 4. Verify private backup before changing any pre-existing post.
 * 5. Return real URLs for Search Console; no fabricated local links.
 *
 * This single run uses API/data/media permissions affirmed by the owner.
 * Avoid using triggers or running it in parallel. Later reruns can fill
 * additional inventory, subject to Blogger and Apps Script quotas.
 */
function launchInextgroupMovieDatabase() {
  if(props_().getProperty('TMDB_RIGHTS_REVIEWED')!=='yes'){
    throw new Error('Review owner commercial TMDB permission, including people images, and set TMDB_RIGHTS_REVIEWED=yes first.');
  }
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(3000))throw new Error('INEXTGROUP database launch already running.');
  const outcome={startedAt:new Date().toISOString(),publishedPeople:[],updatedMovies:[],errors:[],note:'Existing editorial text is retained in verified private Blogger backup drafts.'};
  try{
    let idx=dbIndex_();
    const movieKeys=Object.keys(idx.media).sort((a,b)=>a==='movie:1384216'?-1:b==='movie:1384216'?1:a.localeCompare(b)).slice(0,8);
    if(!movieKeys.length)throw new Error('No published TMDB movie/TV posts found. Publish source movie drafts first.');
    const draftInventory=bloggerListAudit_(idx.root+'/posts?status=draft&maxResults=100',300);
    if(draftInventory.truncated)throw new Error('Draft inventory incomplete. Avoid duplicate profiles.');
    const existingDraftIds=new Set();
    draftInventory.items.forEach(p=>{
      const m=String(p.content||'').match(/data-inext-person-id=["'](\d{1,14})["']/);
      if(m)existingDraftIds.add(m[1]);
    });
    const detailed=[];
    const qs='?append_to_response=credits,videos,keywords,release_dates,images,alternative_titles,recommendations,similar,reviews&include_image_language=en,null';
    for(const key of movieKeys){
      const [type,id]=key.split(':');
      try{
        const detail=tmdb_(type+'/'+id+qs);
        if(String(detail.id)!==id)throw new Error('TMDB record mismatch for '+key);
        detailed.push({key:key,type:type,detail:detail});
      }catch(err){outcome.errors.push({item:key,step:'fetch',message:String(err.message||err)});}
    }
    const wanted=[],seen=new Set();
    for(const movie of detailed){
      for(const p of (movie.detail.credits&&movie.detail.credits.cast||[]).slice(0,8)){
        if(!Number.isSafeInteger(p.id)||seen.has(p.id)||idx.people[String(p.id)]||existingDraftIds.has(String(p.id)))continue;
        seen.add(p.id);
        wanted.push(p.id);
        if(wanted.length>=12)break;
      }
      if(wanted.length>=12)break;
    }
    for(const personId of wanted){
      try{
        const p=tmdb_('person/'+personId+'?append_to_response=combined_credits');
        if(Number(p.id)!==personId||!p.name)continue;
        const biography=String(p.biography||'').trim();
        const credits=((p.combined_credits&&p.combined_credits.cast)||[])
          .filter(c=>c.media_type==='movie'||c.media_type==='tv').slice(0,24);
        if(biography.length<120&&credits.length<3){
          outcome.errors.push({item:personId,step:'person',message:'Not enough profile data; skipped'});continue;
        }
        const photo=p.profile_path&&/^\/[a-z0-9/_-]+\.(jpg|png|webp)$/i.test(p.profile_path)?
          'https://image.tmdb.org/t/p/w342'+p.profile_path:'';
        let body='<article class="inext-person-profile" data-inext-person-id="'+personId+'">'+
          '<h2>'+esc_(p.name)+' — Biography and Filmography</h2>'+
          (photo?'<img src="'+esc_(photo)+'" alt="'+esc_(p.name)+' photograph" width="230" height="345" loading="lazy"/>':'')+
          '<p><strong>Profession:</strong> '+esc_(p.known_for_department||'Entertainment')+'</p>'+
          (biography?'<h3>Biography</h3><p>'+esc_(biography)+'</p>':'')+
          '<h3>Selected Movies and TV Shows</h3><ul>';
        for(const c of credits){
          const known=idx.media[c.media_type+':'+c.id],name=esc_(c.title||c.name||'Untitled');
          body+='<li>'+(known?'<a href="'+esc_(inextInternalHref_(known.url))+'">'+name+'</a>':name)+
            (c.character?' <small>as '+esc_(c.character)+'</small>':'')+'</li>';
        }
        body+='</ul><p class="inext-media__source">Biography and credits sourced from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p></article>';
        // One POST per profile, no automatic external TMDB navigation.
        const published=inextBloggerWriteWithRetry_(idx.root+'/posts',{
          kind:'blogger#post',title:p.name+' — Biography and Filmography',
          content:body,labels:['People','TMDB']
        },'post');
        if(!published.id||!published.url)throw new Error('Blogger did not return a published People URL.');
        outcome.publishedPeople.push({tmdbId:personId,name:p.name,url:published.url});
        idx.people[String(personId)]=published.url;
        Utilities.sleep(1200);
      }catch(err){
        outcome.errors.push({item:'person:'+personId,step:'publish_person',message:String(err.message||err).slice(0,240)});
        if(/HTTP 429|quota|rateLimit/i.test(String(err.message||err)))break;
      }
    }
    // Refresh first-party graph after people posts are published.
    idx=dbIndex_();
    for(const entry of detailed){
      const old=idx.media[entry.key];
      if(!old||!old.id||!old.url)continue;
      try{
        const html=professionalMediaHtml_(entry.detail,entry.type,idx);
        if(html.length<1300)throw new Error('Invalid generated detail HTML');
        if(html===old.content){
          outcome.updatedMovies.push({title:old.title,url:old.url,status:'unchanged'});continue;
        }
        const backup=inextBackupPublishedPost_(idx,old);
        const updated=inextBloggerWriteWithRetry_(idx.root+'/posts/'+encodeURIComponent(old.id),{
          kind:'blogger#post',id:old.id,title:old.title,content:html,labels:old.labels||[]
        },'put');
        outcome.updatedMovies.push({title:old.title,url:updated.url||old.url,status:'updated',backupDraftId:backup});
        Utilities.sleep(1200);
      }catch(err){
        outcome.errors.push({item:entry.key,step:'update_movie',message:String(err.message||err).slice(0,240)});
        if(/HTTP 429|quota|rateLimit/i.test(String(err.message||err)))break;
      }
    }
    outcome.finishedAt=new Date().toISOString();
    Logger.log('INEXTGROUP FULL MOVIE DATABASE LAUNCH RESULTS');
    Logger.log(JSON.stringify(outcome,null,2));
    return outcome;
  }finally{lock.releaseLock();}
}
function inextBloggerWriteWithRetry_(url,body,method){
  const options={method:method,contentType:'application/json',
    headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},
    payload:JSON.stringify(body),muteHttpExceptions:true,followRedirects:false};
  for(let attempt=0;attempt<3;attempt++){
    const res=UrlFetchApp.fetch(url,options);
    const status=res.getResponseCode();
    if(status===200||status===201)return JSON.parse(res.getContentText());
    if((status===429||status>=500)&&attempt<2){
      Utilities.sleep((attempt+1)*2500);continue;
    }
    throw new Error('Blogger API HTTP '+status+' '+res.getContentText().slice(0,120));
  }
  throw new Error('Blogger API unavailable');
}


/** Three people-first movie reference guides, no invented film facts. */
function inextAdditionalEditorialGuides_(){
 const guides=[
  {slug:'cast_vs_crew',title:'Movie Cast and Crew Explained: Who Does What on a Film?',
   labels:['Movies','Viewing Guides','People'],
   intro:'A practical explanation of on-screen performers, behind-the-scenes creative teams and the credits that appear on a movie detail page.',
   sections:[
    ['Cast: actors and the characters they play','The cast list identifies performers associated with a production. A credit may include a character name, but that does not always mean the actor appears in every version or sequence. Some performers provide voices, make cameo appearances or are listed for a particular episode. When you browse a movie database, look for the character field as well as the performer name. Credits may change as a project is completed and later corrected by publishers.'],
    ['What the director does','The director guides the artistic interpretation of the film. Working with performers and department heads, the director makes choices about blocking, performances, pace and how scenes work together. That does not mean the director personally operates the camera, writes every line or creates the music. A film is the work of numerous collaborators, and the credits distinguish those contributions.'],
    ['Screenwriter, story and screenplay','A writer credit is not always interchangeable with a story or screenplay credit. The story describes the underlying narrative contribution, while the screenplay is the written structure of scenes, action and dialogue. Films adapted from novels may also credit the original author separately. Different countries and professional guilds may use different credit categories. Avoid assuming that a source novel author wrote the finished film script unless the credits establish that fact.'],
    ['Producers and executive producers','A producer may help organize development, financing, scheduling, personnel and delivery of the finished film. An executive producer credit can reflect different contributions depending on the production. A single title can involve many producers. Looking only at one prominent name can obscure the wider team. Credits are best interpreted as published production information, not as an exhaustive description of each person’s daily responsibilities.'],
    ['Photography, editing and sound','A director of photography collaborates with the director and lighting and camera teams on the visual language. Editors shape the recorded material into a coherent sequence. Composers create original score material; sound editors and mixers work on the soundtrack and final sound presentation. These specialists strongly influence the experience, even when their names are less visible than the lead cast.'],
    ['How to use cast and crew information','When exploring INEXTGROUP, start with the movie overview and then check the cast, character names and key crew. A connected actor profile can help you discover other movies or television credits, but only the titles that have their own published INEXTGROUP page appear as internal links. Treat missing links as gaps in our editorial catalogue, not proof that a performer has no other work. Cross-check unusual or disputed credits with the official film studio or production company.']
   ]},
  {slug:'movie_release_dates',title:'Why Movie Release Dates Differ Between Countries and Platforms',
   labels:['Movies','Viewing Guides'],
   intro:'An accessible guide to theatrical release dates, festivals, digital rentals and regional availability for movie fans in the USA, UK and beyond.',
   sections:[
    ['One film can have several valid dates','A movie may first screen at a festival, open in limited theatres, receive a wider national release and arrive later on digital platforms. These events can happen in different years. Therefore, a date on a movie database may describe a particular territory or format rather than a single global premiere. Before sharing a release date, identify what event and market it refers to.'],
    ['Theatrical windows are not universal','Studios and distributors choose release windows that reflect local cinema schedules, marketing and rights agreements. A film can open in the United States before the United Kingdom or vice versa. A festival screening does not guarantee general public ticket availability. Promotional articles should not imply a worldwide release when the official source only announces a domestic theatrical date.'],
    ['Digital rental, purchase and subscription','A digital release can mean rental, purchase or inclusion in a subscription library. Those are distinct arrangements. A movie may become available to buy digitally before it appears on a subscription service. A library listing may be visible in one region and absent in another. The authorized provider’s own title page is the appropriate place to confirm the current viewing option.'],
    ['Why dates on databases change','Release dates are sometimes preliminary, and distributors may revise plans. Regional records may reflect information supplied by different contributors. An entertainment website should show the source, region and date of last review where practical. A future listing does not prove a release occurred. An empty release-date field should remain empty rather than being filled with a guess.'],
    ['Ratings and certifications are local','Content classifications such as the US MPA rating and the UK BBFC classification arise from different national systems. One cannot be substituted for the other. Some classification records are published before release, while others appear later. Check the market specified beside the certificate and do not imply the classification applies worldwide.'],
    ['A sensible release-date checklist','Identify the exact title and year, then the country, screening or viewing format, and official distributor. For time-sensitive reports, compare the latest studio announcement with the current cinema or platform listing. If they disagree, date the sources and explain the distinction. INEXTGROUP movie pages may show multiple regional records when that data is available. For current purchase or subscription availability, always confirm at the authorized provider.']
   ]},
  {slug:'movie_filmography',title:'How to Explore an Actor Filmography Without Missing Key Credits',
   labels:['People','Movies','Viewing Guides'],
   intro:'A movie discovery guide to lead roles, supporting parts, television appearances, voice credits and release-year differences.',
   sections:[
    ['A filmography is a record, not a ranking','A performer’s filmography brings together credited films and television projects. Order by release year can help you follow a career, but an earlier production may be released after a later one. Some databases sort by popularity rather than chronology. Neither method should be mistaken for an assessment of which performance is best.'],
    ['Lead, supporting and guest roles','The same performer may headline one movie and appear briefly in another. A television credit can refer to a recurring character, a guest episode or an entire series. Character names can be incomplete for future productions. Where reliable role details are unavailable, it is better to display only the credit than to invent a character, episode count or billing position.'],
    ['Film, television and voice work','An actor may appear in cinema, television, animation and video games. A movie and television database usually covers only some of those categories. Voice roles can be essential even when the performer never appears on screen. Documentary appearances and self-credits may also be listed, but do not automatically belong in a list of fictional acting performances.'],
    ['Distinguish works with similar names','Titles are frequently reused. An actor may appear in a remake, franchise sequel or television adaptation that shares words with an earlier production. Compare the release year, format and character. A link to a specific movie page is more useful than a generic search result because it identifies the exact work.'],
    ['How internal profile links should behave','On INEXTGROUP, actor pages connect to published movie and TV profiles only when those exact records exist on our site. A missing internal link is not a broken filmography entry: it means we have not yet published a standalone page. We keep the title readable and avoid directing browsing clicks to an unrelated external database. Source attribution and official videos may still use clearly identified external links.'],
    ['Use credits carefully','Treat community-maintained credit records as a starting point and consider official studio, broadcaster or production sources for confirmation. A project marked in production may change before release. Avoid inferring a performer’s personal life, health or career plans from a credit entry. Filmography data is most valuable when the project, character and production status are clear and current.']
   ]}
 ];
 return guides.map(g=>{
  const html='<article class="inext-editorial-guide"><p><strong>INEXTGROUP Editorial Guide</strong> · Independent educational information</p><p>'+esc_(g.intro)+'</p>'+
   g.sections.map(x=>'<section><h2>'+esc_(x[0])+'</h2><p>'+esc_(x[1])+'</p></section>').join('')+
   '<p><strong>Editorial note:</strong> Credits and availability can change. Confirm disputed details using official production and distributor materials. INEXTGROUP does not provide movie streaming or downloads.</p></article>';
  return {slug:g.slug,title:g.title,html:html,labels:g.labels};
 });
}

/**
 * One entry point for all already-prepared site content and first-party movie
 * links. This publishes seven independent guides, linked people pages and
 * upgrades the existing published TMDB media, then performs a read-only
 * inventory. It does not claim indexing, AdSense or custom-domain activation.
 */
function finishInextgroupWebsiteLaunch(){
 const outcome={startedAt:new Date().toISOString(),guides:[],database:null,inventory:null,errors:[]};
 try{outcome.guides=publishOriginalEditorialGuides();}
 catch(err){outcome.errors.push({phase:'editorial_guides',message:String(err.message||err)});}
 try{outcome.database=launchInextgroupMovieDatabase();}
 catch(err){outcome.errors.push({phase:'movie_and_people_database',message:String(err.message||err)});}
 try{
  const index=dbIndex_();
  outcome.inventory={publishedPosts:index.posts.length,movieTvPosts:Object.keys(index.media).length,
    actorProfiles:Object.keys(index.people).length,
    postUrls:index.posts.filter(p=>p.url).slice(0,30).map(p=>({title:p.title,url:p.url}))};
 }catch(err){outcome.errors.push({phase:'inventory',message:String(err.message||err)});}
 try{outcome.quality=inextLaunchQualityAudit_();}
 catch(err){outcome.errors.push({phase:'quality_audit',message:String(err.message||err)});}
 outcome.finishedAt=new Date().toISOString();
 Logger.log('INEXTGROUP SITE LAUNCH SUMMARY');
 Logger.log(JSON.stringify(outcome,null,2));
 return outcome;
}

/**
 * Produce a safe same-site relative link from an existing Blogger or future
 * inextgroup.cloud post URL. Internal hrefs survive custom-domain migration.
 * A foreign host cannot be silently converted into an on-site link.
 */
function inextInternalHref_(source){
 const raw=String(source||'').trim();
 const match=raw.match(/^https?:\/\/([^\/?#]+)(\/[^?#]*)?(?:[?#].*)?$/i);
 if(!match)throw new Error('Not an absolute published Blogger URL: '+raw.slice(0,100));
 const host=match[1].toLowerCase();
 if(host!=='inextcloud.blogspot.com'&&host!=='inextgroup.cloud'&&host!=='www.inextgroup.cloud')
   throw new Error('External host rejected for internal link: '+host);
 const path=match[2]||'/';
 if(path.indexOf('//')===0||/[<>"']/.test(path))throw new Error('Unsafe published URL path');
 return path;
}


/** Post-launch read-only quality assurance based on authoritative Blogger data. */
function inextLaunchQualityAudit_(){
 const idx=dbIndex_(),warnings=[],counts={movie:0,tv:0,people:0,guides:0,internalMediaLinks:0,profileLinks:0};
 const homeNames={};
 for(const p of idx.posts){
  const h=String(p.content||''),labels=(p.labels||[]).map(x=>String(x).toLowerCase());
  const isMedia=h.includes('inext-pro-media')||h.includes('inext-media__hero');
  const isPeople=h.includes('inext-person-profile');
  const isGuide=labels.includes('viewing guides');
  const type=(h.match(/data-inext-media-type="(movie|tv)"/)||[])[1];
  if(type==='movie')counts.movie++;
  if(type==='tv')counts.tv++;
  if(isPeople)counts.people++;
  if(isGuide)counts.guides++;
  const title=String(p.title||'').trim().toLowerCase();
  if(homeNames[title])warnings.push({type:'duplicate_title',title:p.title,url:p.url||''});
  homeNames[title]=true;
  if(/Editorial review required before publishing|This is an unreviewed metadata draft/i.test(h))
    warnings.push({type:'review_notice_live',title:p.title,url:p.url||''});
  if(/INTERNAL BACKUP/i.test(p.title||'')||labels.includes('inext backup'))
    warnings.push({type:'backup_accidentally_published',title:p.title,url:p.url||''});
  if(isMedia && !/<img\b/.test(h))
    warnings.push({type:'no_images',title:p.title,url:p.url||''});
  if(isMedia && !h.includes('inext-pro-media'))
    warnings.push({type:'legacy_movie_layout',title:p.title,url:p.url||''});
  if(isMedia){
    const internal=h.match(/href="\/(?:20\d{2}\/\d{2}\/[^"]+|search\/label\/[^"]+)"/g)||[];
    counts.internalMediaLinks+=internal.length;
  }
  if(isPeople){
    const internal=h.match(/href="\/20\d{2}\/\d{2}\/[^"]+"/g)||[];
    counts.profileLinks+=internal.length;
  }
 }
 const result={counts:counts,warnings:warnings.slice(0,50),
   warningTotal:warnings.length,checkedPostCount:idx.posts.length,
   note:'Checks published Blogger inventory only; does not certify live appearance, AdSense, permissions, DNS, indexing, or user experience.'};
 Logger.log('INEXTGROUP QUALITY AUDIT '+JSON.stringify(result,null,2));
 return result;
}

/**
 * TMDB-style seasonal discovery, only verified season data in the TV API.
 * Avoids fabricated episode/permalink pages; each card expands locally.
 */
function professionalTvSeasonsHtml_(d){
 if(!Array.isArray(d.seasons)||!d.seasons.length)return '';
 const e=esc_;
 const img=p=>p&&/^\/[a-z0-9/_-]+\.(jpg|png|webp)$/i.test(p)?'https://image.tmdb.org/t/p/w342'+p:'';
 // Fetch the most recently listed regular season details when running in Apps Script.
 // A failed API call leaves the other season cards intact.
 let selected=null;
 const regular=d.seasons.filter(x=>Number.isSafeInteger(x.season_number)&&x.season_number>0);
 if(regular.length)selected=regular.sort((a,b)=>b.season_number-a.season_number)[0];
 let seasonDetail=null;
 if(selected && typeof UrlFetchApp!=='undefined'){
  try{seasonDetail=tmdb_('tv/'+encodeURIComponent(d.id)+'/season/'+selected.season_number);}
  catch(err){if(typeof Logger!=='undefined')Logger.log('Season episode details unavailable: '+String(err.message||err));}
 }
 let html='<section id="inext-seasons" class="inext-pro-section"><h3>Seasons &amp; Episodes</h3><p class="inext-pro-caption">Episode titles and air dates reflect available TMDB records; upcoming schedules can change. INEXTGROUP does not provide streaming.</p><div class="inext-seasons-grid">';
 for(const season of d.seasons.slice(0,24)){
  if(!Number.isSafeInteger(season.season_number))continue;
  const name=String(season.name||'Season '+season.season_number),poster=img(season.poster_path);
  const episodeCount=Number.isSafeInteger(season.episode_count)?season.episode_count:null;
  const date=/^\d{4}-\d{2}-\d{2}$/.test(season.air_date||'')?season.air_date:'';
  const isSelected=!!(selected && selected.season_number===season.season_number);
  html+='<details class="inext-season-card"'+(isSelected?' open="open"':'')+'><summary>'+
    (poster?'<img src="'+e(poster)+'" alt="'+e(name)+' poster" width="95" height="142" loading="lazy"/>':'<span class="inext-season-fallback" aria-hidden="true">TV</span>')+
    '<span><strong>'+e(name)+'</strong>'+
    (date?'<small>First aired: '+e(date)+'</small>':'')+
    (episodeCount!==null?'<small>'+episodeCount+' episode(s)</small>':'')+
    '</span><span class="inext-season-expander" aria-hidden="true">+</span></summary>'+
    '<div class="inext-season-description">'+
    (season.overview?'<p>'+e(season.overview)+'</p>':'<p>No season summary is currently available.</p>');
  const episodes=isSelected&&seasonDetail&&Array.isArray(seasonDetail.episodes)?seasonDetail.episodes.slice(0,24):[];
  if(episodes.length){
    html+='<div class="inext-episode-list">';
    for(const episode of episodes){
      if(!Number.isSafeInteger(episode.episode_number))continue;
      const image=img(episode.still_path),air=/^\d{4}-\d{2}-\d{2}$/.test(episode.air_date||'')?episode.air_date:'';
      html+='<article class="inext-episode-card">'+
        (image?'<img src="'+e(image)+'" alt="'+e(episode.name||'Episode')+' still image" width="150" height="85" loading="lazy"/>':'')+
        '<div><strong>E'+episode.episode_number+' · '+e(episode.name||'Episode '+episode.episode_number)+'</strong>'+
        '<small>'+[air,Number.isFinite(episode.runtime)&&episode.runtime>0?episode.runtime+' min':''].filter(Boolean).map(e).join(' · ')+'</small>'+
        (episode.overview?'<p>'+e(episode.overview)+'</p>':'')+'</div></article>';
    }
    html+='</div>';
  }
  html+='</div></details>';
 }
 html+='</div></section>';
 return html;
}

/** Desktop-right/mobile-below details rail modelled on TMDB information hierarchy. */
function professionalDetailsSidebar_(d,type){
 const e=esc_,tv=type==='tv';
 const info=[
  ['Status',d.status||''],
  [tv?'Type':'Original title',tv?d.type||'':d.original_title||''],
  ['Original language',d.original_language?String(d.original_language).toUpperCase():''],
  ['Original network',tv?(d.networks||[]).map(n=>n.name).join(', '):''],
  ['Created by',tv?(d.created_by||[]).map(p=>p.name).join(', '):''],
  ['Episodes',tv&&d.number_of_episodes!=null?String(d.number_of_episodes):''],
  ['Seasons',tv&&d.number_of_seasons!=null?String(d.number_of_seasons):''],
  ['Last air date',tv?d.last_air_date||'':''],
  ['Homepage',/^https:\/\/[^\s"'<>]+$/i.test(d.homepage||'')?d.homepage:'']
 ];
 let html='<aside class="inext-detail-sidebar" aria-label="Title information">'+
  '<h3>Facts &amp; Details</h3><dl class="inext-sidebar-facts">';
 for(const pair of info){
  if(!pair[1])continue;
  const value=pair[0]==='Homepage'?'<a href="'+e(pair[1])+'" target="_blank" rel="noopener noreferrer">Official website</a>':e(pair[1]);
  html+='<div><dt>'+e(pair[0])+'</dt><dd>'+value+'</dd></div>';
 }
 html+='</dl>';
 const keywords=((d.keywords&&(d.keywords.results||d.keywords.keywords))||[]).map(x=>x.name).filter(Boolean).slice(0,14);
 if(keywords.length){
  html+='<h4>Keywords</h4><div class="inext-keyword-cloud">';
  for(const word of keywords)html+='<span>'+e(word)+'</span>';
  html+='</div>';
 }
 const networks=tv?(d.networks||[]):[];
 if(networks.length)html+='<h4>Networks</h4><p class="inext-network-list">'+networks.map(n=>e(n.name)).join(' · ')+'</p>';
 html+='<p class="inext-sidebar-note">Information is provided for discovery. Check current regional release and availability with official distributors.</p>';
 return html+'</aside>';
}


/**
 * Ongoing INEXTGROUP TMDB -> Blogger publishing.
 * Runs via one installable Apps Script time trigger; not a hosted scraper.
 * Owner MUST explicitly install this task after granting commercial TMDB rights.
 * The requested 5000/day is a CONFIGURED CEILING, not achievable throughput
 * on this single hourly Apps Script trigger (theoretical max is 240/day at 10/run).
 * Actual quota, runtime, content validity, and Blogger inventory further limit output.
 * Uses bounded writes, and duplicate checks against reachable published/draft posts.
 */
const INEXT_AUTO=Object.freeze({
 triggerHours:1,maxPerRun:10,maxPerDay:5000,
 sources:['trending/movie/week','trending/tv/week','movie/popular','tv/popular'],
 minimumOverview:180,minimumCast:2
});
function inextAutoRecordKey_(type,id){return 'INEXT_AUTO_'+type+'_'+id;}
function inextAutoDate_(){return Utilities.formatDate(new Date(),'Asia/Dhaka','yyyy-MM-dd');}
function inextAutoPublishStatus(){
 const p=props_(),triggers=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='inextScheduledTmdbSync');
 const output={installedTriggers:triggers.length,enabled:p.getProperty('INEXT_AUTO_ENABLED')==='yes',
  mode:p.getProperty('INEXT_AUTO_MODE')||'draft',scheduleHours:INEXT_AUTO.triggerHours,
  maxPerRun:INEXT_AUTO.maxPerRun,maxPerDay:INEXT_AUTO.maxPerDay,
  upperBoundPerDayAtScheduledRate:24*INEXT_AUTO.maxPerRun,
  warning:'5000 is a ceiling, NOT a publishing guarantee; actual limits depend on source candidates, API quotas, execution time and Blogger per-account limits.',
  lastResult:p.getProperty('INEXT_AUTO_LAST_REPORT')||'Never run',
  lastDate:p.getProperty('INEXT_AUTO_LAST_DAY')||'',
  todayCount:Number(p.getProperty('INEXT_AUTO_DAY_COUNT')||0),
  licenceGate:p.getProperty('TMDB_RIGHTS_REVIEWED')==='yes'};
 Logger.log(JSON.stringify(output,null,2));return output;
}
/**
 * Install once from Apps Script editor; does not silently schedule on save.
 * Explicitly enables publish mode because site owner requested real articles.
 * Calling it twice replaces an existing trigger to prevent duplicates.
 */
function installInextAutoPublisher(){
 if(props_().getProperty('TMDB_RIGHTS_REVIEWED')!=='yes')
  throw new Error('Confirm your commercial TMDB authorization includes API metadata and images before enabling publishing.');
 required_('TMDB_READ_TOKEN');required_('BLOGGER_BLOG_ID');
 const old=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='inextScheduledTmdbSync');
 for(const t of old)ScriptApp.deleteTrigger(t);
 ScriptApp.newTrigger('inextScheduledTmdbSync').timeBased().everyHours(INEXT_AUTO.triggerHours).create();
 const p=props_();p.setProperties({'INEXT_AUTO_ENABLED':'yes','INEXT_AUTO_MODE':'publish'});
 Logger.log('INEXTGROUP TMDB Auto Publisher installed. Every '+INEXT_AUTO.triggerHours+' hours; up to '+INEXT_AUTO.maxPerDay+' posts/day; no silent bulk backfill.');
 return inextAutoPublishStatus();
}
/** Disable future runs without touching existing published Blogger posts. */
function stopInextAutoPublisher(){
 for(const t of ScriptApp.getProjectTriggers()){
  if(t.getHandlerFunction()==='inextScheduledTmdbSync')ScriptApp.deleteTrigger(t);
 }
 props_().setProperty('INEXT_AUTO_ENABLED','no');
 Logger.log('TMDB scheduled publishing disabled. Published posts remain unchanged.');
 return inextAutoPublishStatus();
}
/**
 * Scheduled entry point. May also be run manually for a single bounded batch.
 * New posts appear publicly only in publish mode. No auto-generated actor
 * profiles, and no external cast-link redirects are emitted.
 */
function inextScheduledTmdbSync(){
 const p=props_();
 if(p.getProperty('INEXT_AUTO_ENABLED')!=='yes')return {status:'disabled'};
 if(p.getProperty('TMDB_RIGHTS_REVIEWED')!=='yes')throw new Error('TMDB rights setting not confirmed.');
 const mode=p.getProperty('INEXT_AUTO_MODE')==='publish'?'publish':'draft';
 const lock=LockService.getScriptLock();
 if(!lock.tryLock(1000))return {status:'skipped_concurrent'};
 const report={date:inextAutoDate_(),mode:mode,created:[],skipped:[],errors:[]};
 try{
  const day=report.date;
  if(p.getProperty('INEXT_AUTO_LAST_DAY')!==day){
   p.setProperties({'INEXT_AUTO_LAST_DAY':day,'INEXT_AUTO_DAY_COUNT':'0'});
  }
  let count=Number(p.getProperty('INEXT_AUTO_DAY_COUNT')||0);
  if(count>=INEXT_AUTO.maxPerDay){report.status='daily_limit';return report;}
  const id=required_('BLOGGER_BLOG_ID'),root=SETTINGS.bloggerBase+'/blogs/'+encodeURIComponent(id);
  const pub=bloggerListAudit_(root+'/posts?status=live&maxResults=100',500);
  const drafts=bloggerListAudit_(root+'/posts?status=draft&maxResults=100',500);
  if(pub.truncated||drafts.truncated)throw new Error('Blog inventory exceeded safe duplicate-check range. Pause auto publishing and implement pagination.');
  const existingKeys=new Set(),existingTitles=new Set();
  for(const post of pub.items.concat(drafts.items)){
   existingTitles.add(String(post.title||'').trim().toLowerCase());
   const html=String(post.content||'');
   const rich=html.match(/data-inext-media-id=["'](\d+)["'][^>]*data-inext-media-type=["'](movie|tv)["']/i);
   if(rich)existingKeys.add(rich[2].toLowerCase()+':'+rich[1]);
   const source=html.match(/themoviedb\.org\/(movie|tv)\/(\d+)/i);
   if(source)existingKeys.add(source[1].toLowerCase()+':'+source[2]);
  }
  const index={root:root,media:{},people:{},posts:pub.items};
  for(const post of pub.items){
   const h=String(post.content||'');
   const match=h.match(/data-inext-media-id=["'](\d+)["'][^>]*data-inext-media-type=["'](movie|tv)["']/i);
   if(match&&post.url)index.media[match[2].toLowerCase()+':'+match[1]]=post;
   const person=h.match(/data-inext-person-id=["'](\d+)["']/);
   if(person&&post.url)index.people[person[1]]=post.url;
  }
  const candidates=[],seen=new Set();
  for(const source of INEXT_AUTO.sources){
   let data;
   try{data=tmdb_(source);}catch(err){report.errors.push({source:source,error:String(err.message||err)});continue;}
   const type=source.indexOf('/tv/')>=0||source.indexOf('tv/')===0?'tv':'movie';
   for(const m of (data.results||[]).slice(0,20)){
    if(!Number.isSafeInteger(m.id))continue;
    const key=type+':'+m.id;
    if(seen.has(key))continue;
    seen.add(key);
    if(existingKeys.has(key)||p.getProperty(inextAutoRecordKey_(type,m.id)))continue;
    if(!approved_(m,type)||String(m.overview||'').length<INEXT_AUTO.minimumOverview)continue;
    candidates.push({type:type,record:m});
   }
  }
  let created=0;
  for(const candidate of candidates){
   if(created>=INEXT_AUTO.maxPerRun||count>=INEXT_AUTO.maxPerDay)break;
   const type=candidate.type,m=candidate.record,key=type+':'+m.id;
   try{
    const d=tmdb_(type+'/'+m.id+'?append_to_response=credits,videos,keywords,release_dates,images,alternative_titles,recommendations,similar,reviews&include_image_language=en,null');
    const title=String(type==='tv'?d.name:d.title||'').trim();
    const date=String(type==='tv'?d.first_air_date:d.release_date||'');
    if(!title||Number(d.id)!==m.id||!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
    if(String(d.overview||'').trim().length<INEXT_AUTO.minimumOverview)continue;
    if(((d.credits||{}).cast||[]).filter(p=>p.name).length<INEXT_AUTO.minimumCast)continue;
    if(!/^\/[a-z0-9/_-]+\.(jpg|png|webp)$/i.test(d.poster_path||''))continue;
    const postTitle=title+' ('+date.slice(0,4)+') — '+(type==='tv'?'TV show':'Movie')+' details';
    if(existingTitles.has(postTitle.toLowerCase())){report.skipped.push({key:key,reason:'title_exists'});continue;}
    const content=professionalMediaHtml_(d,type,index);
    if(!content.includes('data-inext-media-id="'+m.id+'"')||content.length<1500)
      throw new Error('Unexpected generated article HTML');
    // Draft mode is supported for a more conservative publication workflow.
    const labels=[type==='tv'?'TV Shows':'Movies','TMDB','Automated Metadata']
      .concat((d.genres||[]).map(x=>x.name).filter(Boolean).slice(0,4));
    const body={kind:'blogger#post',title:postTitle,content:content,labels:labels};
    const target=root+'/posts'+(mode==='draft'?'?isDraft=true':'');
    // Never retry a POST that may have succeeded remotely without a response.
    // If interrupted, next run checks live/draft inventories before posting.
    const response=UrlFetchApp.fetch(target,{method:'post',contentType:'application/json',
      headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},
      payload:JSON.stringify(body),muteHttpExceptions:true,followRedirects:false});
    const status=response.getResponseCode();
    if(status!==200&&status!==201){
      report.errors.push({key:key,status:status,detail:response.getContentText().slice(0,140)});
      if(status===429||status>=500)break;
      continue;
    }
    const post=JSON.parse(response.getContentText());
    if(!post.id)throw new Error('Blogger created post but did not return an ID for '+key);
    // Confirm that the new post is actually LIVE, not just accepted as DRAFT.
    // Blogger may return a draft when a legacy insert setting is still active.
    const confirmed=mode==='publish'?inextEnsurePublished_(root,post):post;
    if(mode==='publish'&&String(confirmed.status||'').toUpperCase()!=='LIVE')
      throw new Error('Post '+post.id+' did not confirm LIVE status; do not count as published.');
    p.setProperty(inextAutoRecordKey_(type,m.id),String(post.id));
    existingTitles.add(postTitle.toLowerCase());existingKeys.add(key);
    if(confirmed.url)index.media[key]=confirmed;
    count++;created++;
    p.setProperty('INEXT_AUTO_DAY_COUNT',String(count));
    report.created.push({type:type,tmdbId:m.id,title:postTitle,postId:post.id,url:confirmed.url||null,status:mode});
    Utilities.sleep(1350);
   }catch(err){
    report.errors.push({key:key,error:String(err.message||err).slice(0,200)});
    if(/quota|429/i.test(String(err.message||err)))break;
   }
  }
  report.status=report.errors.length?'partial':'completed';
  return report;
 }finally{
  p.setProperty('INEXT_AUTO_LAST_REPORT',JSON.stringify({
   at:new Date().toISOString(),status:report.status||'error',published:report.created.length,
   errors:report.errors.length
  }));
  Logger.log('INEXT AUTO TMDB SYNC '+JSON.stringify(report,null,2));
  lock.releaseLock();
 }
}


/**
 * After creation, insist on verified LIVE status in publish mode.
 * In draft mode no publication endpoint is called.
 */
function inextEnsurePublished_(root,post){
  if(!post||!/^\d+$/.test(String(post.id||'')))throw new Error('Invalid new Blogger post ID');
  let current=post;
  let status=String(current.status||'').toUpperCase();
  if(!status){
    // Some Blogger list responses omit status; use the caller's verified
    // draft inventory only for explicit existing-draft publication.
    status='DRAFT';
  }
  if(status!=='LIVE'){
    if(status!=='DRAFT')throw new Error('Unexpected Blogger post status: '+status);
    const response=UrlFetchApp.fetch(root+'/posts/'+encodeURIComponent(post.id)+'/publish',{
      method:'post',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},
      muteHttpExceptions:true,followRedirects:false
    });
    if(![200,201].includes(response.getResponseCode()))
      throw new Error('Could not publish Blogger draft '+post.id+': HTTP '+response.getResponseCode()+
        ' '+response.getContentText().slice(0,150));
    current=JSON.parse(response.getContentText());
  }
  // Use the official Blogger post GET to ensure public status, not merely a URL field.
  const verify=UrlFetchApp.fetch(root+'/posts/'+encodeURIComponent(post.id),{
    headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},
    muteHttpExceptions:true,followRedirects:false
  });
  if(verify.getResponseCode()===200){
    const readback=JSON.parse(verify.getContentText());
    if(String(readback.status||'').toUpperCase()!=='LIVE')
      throw new Error('Blogger post '+post.id+' not LIVE after publication');
    return readback;
  }
  if(String(current.status||'').toUpperCase()!=='LIVE')
    throw new Error('Blogger could not confirm LIVE post '+post.id);
  return current;
}
/**
 * Publish only qualified TMDB Movie/TV drafts, not backups, People profiles,
 * editorial guide drafts, or drafts containing explicit editorial-review notes.
 * Useful for records that were created as drafts by an older automation.
 */
function publishExistingTmdbDraftBatch(){
 if(props_().getProperty('TMDB_RIGHTS_REVIEWED')!=='yes')
   throw new Error('TMDB commercial rights flag must be yes');
 const lock=LockService.getScriptLock();
 if(!lock.tryLock(3000))throw new Error('A Blogger write is already running');
 try{
  const root=SETTINGS.bloggerBase+'/blogs/'+encodeURIComponent(required_('BLOGGER_BLOG_ID'));
  const inventory=bloggerListAudit_(root+'/posts?status=draft&maxResults=100',500);
  if(inventory.truncated)throw new Error('Too many drafts; stop rather than publishing the wrong post');
  const result=[];
  for(const draft of inventory.items){
   if(result.filter(x=>x.status==='published').length>=6)break;
   const labels=(draft.labels||[]).map(x=>String(x).toLowerCase());
   if(!labels.includes('tmdb')||(!labels.includes('movies')&&!labels.includes('tv shows')))continue;
   if(labels.includes('inext backup'))continue;
   if(!/inext-pro-media/.test(draft.content||''))continue;
   if(/Editorial review required before publishing|This is an unreviewed TMDB metadata draft/i.test(draft.content||''))continue;
   try{
    const live=inextEnsurePublished_(root,draft);
    result.push({status:'published',title:draft.title,url:live.url||null,id:draft.id});
   }catch(err){
    result.push({status:'failed',title:draft.title,error:String(err.message||err)});
    break;
   }
   Utilities.sleep(1100);
  }
  Logger.log('PUBLISH EXISTING REVIEWED TMDB DRAFTS '+JSON.stringify(result,null,2));
  return result;
 }finally{lock.releaseLock();}
}
/** Diagnose installable triggers including older draft-only jobs. */
function auditInextPublishingTriggers(){
 const status=inextAutoPublishStatus();
 status.allTriggers=ScriptApp.getProjectTriggers().map(t=>({
  handler:t.getHandlerFunction(),eventType:String(t.getEventType())
 }));
 Logger.log(JSON.stringify(status,null,2));return status;
}
