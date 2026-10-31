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
  source: 'trending/movie/week',
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
function approved_(movie) {
  return movie && Number.isSafeInteger(movie.id) &&
    movie.title && movie.overview && movie.overview.trim().length>=SETTINGS.minimumOverviewLength &&
    /^\d{4}-\d{2}-\d{2}$/.test(movie.release_date||'') &&
    /^\/[a-zA-Z0-9/_-]+\.(jpg|png|webp)$/.test(movie.poster_path||'');
}
function movieHtml_(m) {
  const url='https://www.themoviedb.org/movie/'+encodeURIComponent(m.id);
  const poster='https://image.tmdb.org/t/p/w500'+m.poster_path;
  const year=m.release_date.slice(0,4);
  const avg=Number(m.vote_average);
  const rating=Number.isFinite(avg)?avg.toFixed(1)+'/10':'Not rated';
  // Data is credited to its source. No misleading reviews or download/watch buttons.
  return '<article class="inext-movie"><figure><img alt="'+esc_(m.title)+' poster" loading="lazy" src="'+esc_(poster)+'"/></figure>'+
    '<p><strong>Release:</strong> '+esc_(m.release_date)+' | <strong>TMDB user rating:</strong> '+esc_(rating)+'</p>'+
    '<h2>Overview</h2><p>'+esc_(m.overview)+'</p>'+
    '<p>Source: <a href="'+esc_(url)+'" rel="noopener noreferrer" target="_blank">TMDB movie details</a></p>'+
    '<p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p></article>';
}
function gather_() {
  const page=tmdb_(SETTINGS.source);
  return (page.results||[]).filter(approved_).slice(0,SETTINGS.maxDraftsPerRun);
}
function previewImport() {
  const list=gather_().map(m=>({id:m.id,title:m.title,releaseDate:m.release_date,eligible:!props_().getProperty('tmdb_movie_'+m.id)}));
  Logger.log(JSON.stringify(list,null,2));
  return list;
}
function importDrafts() {
  // Stop until explicit source licensing approval has been recorded by owner.
  if (props_().getProperty('TMDB_RIGHTS_REVIEWED')!=='yes') throw new Error('Rights check not complete. Read README and obtain required TMDB permissions.');
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('An import is already running.');
  try {
    const movies=gather_(), outcomes=[];
    for (const m of movies) {
      const key='tmdb_movie_'+m.id;
      if (props_().getProperty(key)) {outcomes.push({id:m.id,status:'skipped_existing'});continue;}
      const draft=bloggerInsertDraft_({
        kind:'blogger#post',
        title:m.title+' ('+m.release_date.slice(0,4)+') — Movie details',
        content:movieHtml_(m),
        labels:['Movies','TMDB']
      });
      // Only store a successful Blogger draft mapping.
      props_().setProperty(key,String(draft.id));
      outcomes.push({id:m.id,bloggerDraftId:draft.id,status:'created_draft'});
    }
    Logger.log(JSON.stringify(outcomes));
    return outcomes;
  } finally { lock.releaseLock(); }
}
