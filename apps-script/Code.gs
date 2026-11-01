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
