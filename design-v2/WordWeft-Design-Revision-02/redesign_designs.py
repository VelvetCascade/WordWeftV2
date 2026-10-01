from pathlib import Path
import json, re, shutil, html
from PIL import Image

ROOT=Path(__file__).parent
exec(compile((ROOT/'revision_base.py').read_text(),str(ROOT/'revision_base.py'),'exec'))
# Preserve the content corrections from the first review pack.
original=(ROOT/'build_designs.py').read_text()
cleanup=original[original.index('\nfor p in PAGES:\n'):original.index("    cls='navigationmenu'")]
exec(compile(cleanup,'content-corrections','exec'))
OUT=ROOT/'WordWeft-Design-Revision-02'
Image.open(ROOT/'upload/IMG_9144(1).jpeg').crop((876,370,909,405)).save(OUT/'assets/google-mark.png')
for filename in ['Rubik-OFL.txt','Lucide-LICENSE.txt']:
    source=ROOT/'WordWeft-Complete-Design-Pack/assets'/filename
    if source.exists():shutil.copy(source,OUT/'assets'/filename)

def asset(name,cls='',alt='Supplied WordWeft artwork'):
    return f'<img class="{cls}" src="../assets/{name}" alt="{alt}">'
def brand():return '<span class="brand">'+asset('brand-mark.jpg','brandmark','WordWeft mark')+'WordWeft</span>'
def nav(active='Read',signed=True,studio=False,library=False):
    links=['Read','Write','Community']+([] if signed else ['About'])
    navitems=''.join(f'<span class="{"active" if x==active else ""}">{x}</span>' for x in links)
    if signed:
        right=f'<span class="navlibrary {"selected" if library else ""}">{ic("library-big")}Your library</span><span class="navicon navsearch">{ic("search")}</span><span class="navicon">{ic("bell")}<span class="notificationdot"></span></span>'+avatar('YM' if studio else 'SB')
    else:right=f'<span class="navicon navsearch">{ic("search")}</span><span class="desktop-only">Sign in</span>'+btn('Start reading','primary small','arrow-right')
    return f'<header class="nav {"studiobar" if studio else ""}">{brand()}<div class="navlinks">{navitems}</div><div class="navright">{right}</div></header>'
def footer():
    return '<footer class="footer"><div>'+brand()+'<small class="muted">A home for readers and writers.</small></div><div class="footerlinks"><span>Read</span><span>Write</span><span>Community</span><span>About</span><span>Help</span><span>Terms</span><span>Privacy</span></div></footer>'
def appbottom(active='Read'):
    return '<div class="appbottom">'+''.join(f'<div class="{"active" if n==active else ""}">{ic(i)}{t}</div>' for n,t,i in [('Read','Explore','compass'),('Library','Library','library-big'),('Community','Community','messages-square'),('Write','Write','square-pen')])+'</div>'
def studiobottom(active='Overview'):
    return '<div class="mobilebottom">'+''.join(f'<div class="{"active" if t==active else ""}">{ic(i)}{t}</div>' for t,i in [('Overview','layout-dashboard'),('Stories','notebook-pen'),('Comments','message-circle'),('More','menu')])+'</div>'
def studio(body,active='Overview'):
    side='<aside class="studioside"><div class="studioidentity">'+avatar('YM')+'<div><strong>Yuna Mori</strong><small>WRITER STUDIO</small></div></div><div class="eyebrow">Your writing</div>'
    for t,i in [('Overview','layout-dashboard'),('My stories','notebook-pen'),('Reader comments','message-circle'),('Statistics','chart-no-axes-combined'),('Story guide','users-round')]:
        side+=f'<div class="item {"active" if t==active else ""}">{ic(i)}{t}</div>'
    side+='<div class="eyebrow">Account</div><div class="item">'+ic('settings')+'Settings</div><div class="item">'+ic('circle-help')+'Writing help</div><div class="bottom"><small>Your work stays yours.</small><p class="hint">Private until you publish.<br>Always yours to keep.</p></div></aside>'
    return nav('Write',True,True)+'<div class="studio">'+side+'<main class="studiomain">'+body+'</main></div>'+studiobottom('Stories' if active=='My stories' else 'Comments' if active=='Reader comments' else 'More' if active in ['Statistics','Story guide'] else active)
def wrap(body,active='Read',signed=True,library=False):
    return nav(active,signed,library=library)+'<main class="page">'+body+'</main>'+footer()+(appbottom('Library' if library else active) if signed else '')
def replace(slug,body,note='',layout='page',active='Read',signed=True):
    p=next(p for p in PAGES if p['slug']==slug)
    p['body']=studio(body,active) if layout=='studio' else wrap(body,active,signed,slug.startswith('14-') or slug.startswith('15-')) if layout=='page' else body
    if note:p['notes']=note
def card(s):
    return '<article class="storycard"><div class="cardtop">'+cover(s)+'<span class="savebook">'+ic('bookmark')+'</span></div><div class="genrelabel">'+s['g']+'</div><h3>'+s['t']+'</h3><p class="meta">'+s['a']+'</p><p class="desc">'+s['d']+'</p><div class="cardfoot"><span>'+ic('star')+' 4.8 · '+('24' if s is STORIES[0] else '12')+' chapters</span><span>Read '+ic('arrow-right')+'</span></div></article>'
def cards(indices=[0,1,2,3]):return '<div class="grid g4 cards">'+''.join(card(STORIES[i]) for i in indices)+'</div>'
def storyrow(s,progress=False):
    count=24 if s['t']=='Spring Under the Bridge' else 16 if s['t']=='The Waterfall Road' else 12
    current=3 if count==16 else 4 if count==12 else 7
    percent=18 if count==16 else 31 if count==12 else 29
    progresshtml='<div style="margin-top:12px">'+prog(percent)+'<p class="hint">Chapter '+str(current)+' of '+str(count)+' · '+str(percent)+'% read</p></div>' if progress else ''
    return '<div class="storyrow">'+img(s['img'])+'<div class="copy"><h3>'+s['t']+'</h3><div class="meta">'+s['a']+' · '+s['g']+' · '+s['status']+'</div><p class="desc">'+s['d']+'</p>'+progresshtml+'</div><div class="rowmeta">'+ic('star')+' 4.8<br><small>'+str(count)+' chapters</small></div>'+arrow()+'</div>'
STORIES[0].update(a='Yuna Mori',g='Historical fiction',d='An old letter. A familiar town. A summer remembered differently.')
STORIES[4]['a']='Yuna Mori'
CHAPTERS[:]=['The first train','A letter never sent','Under the plum trees','The bridge at dusk','The house of paper walls','A borrowed name','When the lanterns go out','A map of old promises','The long way home','The letter’s last line']
def timeline(returning=False,all=False):
    start=3 if returning and not all else 0
    end=9 if returning and not all else 10 if all else 6
    rows=''
    for i in range(start,end):
        done=returning and i<6;current=returning and i==6
        status='Finished' if done else 'Continue' if current else 'Start here' if i==0 and not returning else ''
        point=ic('check') if done else ic('circle-dot') if current else str(i+1)
        rows+=f'<div class="timerow {"done" if done else "active" if current else ""}"><span class="timepoint">{point}</span><div class="timemeta"><span>CHAPTER {i+1:02}</span><span class="{"" if current else "muted"}">{status}</span></div><h3>{CHAPTERS[i]}</h3><small>{ic("heart")} {184-i*13} likes &nbsp; · &nbsp; {6+i%3} min</small></div>'
    return '<div class="timeline">'+rows+'</div>'
def readingprogress():
    return '<div class="readingprogress"><div class="between"><span>Your reading progress</span><span>29%</span></div>'+prog(29)+'<p class="hint">6 chapters finished · Chapter 7 in progress</p></div>'

# Global treatment reaches every screen, not only the showcase pages.
for p in PAGES:
    b=p['body']; isstudio='studiobar' in b
    active='Write' if isstudio or p['group']=='Writer studio' else 'Community' if p['group']=='Community' else 'About' if p['slug']=='43-about' else 'Read'
    signed=p['slug'] not in ['01-home','43-about']
    b=re.sub(r'<header class="nav[^>]*>.*?</header>',lambda m:nav(active,signed,isstudio,p['slug'] in ['14-library','15-library-empty']),b,flags=re.S)
    b=re.sub(r'<footer class="footer">.*?</footer>',lambda m:footer(),b,flags=re.S)
    b=b.replace('Aya Mori','Yuna Mori').replace('Aya.','Yuna.').replace('>AM<','>YM<')
    b=b.replace('Hana Watanabe','Hana Mori').replace('Ren Ito','Ren Sato').replace('Yuki Mori','Eiko Mori')
    for old,new in {'A conversation around your work.':'Reader comments','Your stories in numbers.':'Story statistics','A few things, your way.':'Reading &amp; notifications','Make yourself at home.':'Profile settings','Your account, in your hands.':'Privacy &amp; security','The people and places.':'Your story guide','Start with a story.':'Story details','One last look.':'Review &amp; publish','Your people':'Following &amp; followers','Every story starts somewhere.':'Writer studio','A clear way to fix things.':'Feedback &amp; recovery','The moments between pages.':'System states'}.items():b=b.replace(old,new)
    b=b.replace('<span class="gmark">G</span>',asset('google-mark.png','googlemark','Google'))
    b=b.replace('Google mark is a textual placeholder for the official identity asset.','')
    if p['group']=='Settings':b=b.replace('Reading-activity and follower visibility','Reading activity and follower visibility')
    if p['group']=='Information':b=b.replace('This section','This section')
    if '<section class="modal">' in b:b=b.replace('<section class="modal">','<section class="modal"><div class="sheetgrip"></div>')
    if isstudio:
        # Full writer shell and mobile navigation are rebuilt below from the existing contents.
        content=re.search(r'<main class="studiomain">(.*?)</main>',b,re.S).group(1)
        choice='Reader comments' if p['slug']=='38-writer-comments' else 'Statistics' if p['slug']=='37-writer-statistics' else 'Story guide' if p['slug']=='35-story-guide' else 'Overview' if p['slug']=='56-writer-empty' else 'My stories'
        b=studio(content,choice)
    elif signed and '<main class="page">' in b and 'modalstage' not in b:b+=appbottom('Library' if p['slug'] in ['14-library','15-library-empty'] else active)
    p['body']=b

homehero='<section class="hero"><div><div class="eyebrow">A home for readers and writers</div><h1>Read <span class="word">stories</span>.<br>Write your own.</h1>'+asset('home-underline.jpg','underlineasset')+'<p class="lead">Discover stories from real people.<br>Find your next chapter, or write your own.</p><div class="actions">'+btn('Read stories','primary','arrow-right')+btn('Start writing','','arrow-right')+'</div></div>'+asset('home-covers.jpg','heroasset')+'</section>'
deck='<div class="featuredeck"><article class="featurewide">'+asset('hobbit-art.jpg')+'<div class="featurecopy"><div class="eyebrow">Fantasy · Chapter 1</div><h3>The Hobbit</h3><small>J.R.R. Tolkien</small><p>A reluctant hero, an unexpected journey, and a world far bigger than home.</p><div class="cardfoot"><span>'+ic('heart')+' 24.8k &nbsp; '+ic('message-circle')+' 612</span><span>Read '+ic('arrow-right')+'</span></div></div></article>'
for name,t,a,g,likes in [('1984-art.jpg','1984','George Orwell','Dystopia','18.1k'),('prince-art.jpg','The Little Prince','Antoine de Saint-Exupéry','Poetry','12.4k')]:
    deck+='<article class="featuresmall">'+asset(name)+'<div class="featurecopy"><div class="eyebrow">'+g+'</div><h3>'+t+'</h3><div class="meta">'+a+'</div><div class="cardfoot"><span>'+ic('heart')+' '+likes+'</span>'+arrow()+'</div></div></article>'
deck+='</div>'
genrespec=[('Classics','classics'),('Fantasy','fantasy'),('Romance','romance'),('Sci-Fi','scifi'),('Mystery','mystery'),('Poetry','poetry'),('Slice of Life','life'),('Essays','essays')]
strip='<div class="genrestrip">'+''.join('<div class="genretile">'+asset('genre-'+file+'.jpg')+'<span>'+name+'</span></div>' for name,file in genrespec)+'</div>'
homesection=lambda eye,t,content,action:'<section class="section"><div class="sectionhead between"><div><div class="eyebrow">'+eye+'</div><h2>'+t+'</h2></div>'+btn(action,'plain small','arrow-right')+'</div>'+content+'</section>'
replace('01-home',homehero+homesection('Story discovery','Find a story. Stay for a chapter.',deck,'Browse stories')+homesection('Explore','Stories across genres.',strip,'All genres'),'Your supplied hero art, dark Stories treatment, hand-drawn underline and asymmetric story discovery are restored. Mobile preserves the composition and reflows discovery into one lead story and two smaller stories. Covers and catalogue content remain illustrative.',signed=False)

genretiles='<div class="genretiles">'+''.join('<div class="cover">'+asset('genre-'+f+'.jpg')+'<div class="overlay"><h3>'+n+'</h3><small>'+str(412+i*63)+' stories</small></div></div>' for i,(n,f) in enumerate(genrespec))+'</div>'
discover='<div class="discoverhero"><div><div class="eyebrow">Explore stories</div><h1>Find something<br>worth reading.</h1><p class="lead">Stories, poems and essays from writers around the world.</p><div style="margin-top:25px">'+search(placeholder='Search stories, writers, genres or topics…')+'</div></div><div class="starter"><div class="between"><h3>Start somewhere</h3><small>Explore more '+ic('arrow-right')+'</small></div>'+storylist([3,0,2])+'</div></div>'
replace('02-browse',discover+section('Featured this week',cards([3,0,1,2]),'View all featured')+section('Browse by genre',genretiles,'View all genres')+section('All stories',catalogue(),'')+section('Curated collections',cards([2,5,4,1]),'All collections'),'Preserves the supplied editorial browse order: introduction, featured, genres, catalogue, collections. Saved controls live on each cover. Mobile offers a dedicated filter sheet and two readable feature columns.')
replace('03-genre',breadcrumb('Historical fiction')+header('Historical fiction','Other times. Familiar feelings.','Browse by genre')+'<div class="notice green">Start with Spring Under the Bridge, a quiet mystery set around one summer that no one remembers the same way.</div><div style="margin-top:25px">'+tabs(['All stories','Updated','Complete'])+'</div>'+cards([0,4,1,3])+section('Related genres',genretiles,''),'A genre-specific editorial introduction helps readers choose. The story grid and filters reuse the discovery language; mobile keeps the genre context above results.')
collection='<div class="collectionhero"><div><div class="eyebrow">Curated collection · 6 reads</div><h1>A little time<br>to get lost.</h1><p class="lead">Poems and short stories for the space between things. A train ride, a late lunch, an evening at home.</p><div class="actions">'+btn('Start with a poem','primary','arrow-right')+badge('Under 30 minutes','green')+'</div></div><div class="cover">'+img(436535)+'</div></div>'
replace('04-collection',breadcrumb('Collections')+collection+section('Inside this collection',storylist([2,5,1,0]),''),'The collection has a clear editorial premise, duration cue and suggested first read. The art colour informs its olive-paper introduction. Mobile places the introduction before art and the reading list.')
landing='<div class="searchlanding"><div class="eyebrow">Find your next read</div><h1>What are you looking for?</h1><p class="lead">Search stories, writers, genres and collections in one place.</p>'+search(placeholder='Search a title, writer, genre or theme…')+'<p class="hint" style="margin-top:27px">Not sure where to begin?</p><div class="chips">'+''.join('<span class="chip">'+t+'</span>' for t in ['Romance','Mystery','Short reads','Poetry'])+'</div><div class="surface"><h3>Or browse the stories</h3><p class="lead" style="font-size:13px;margin:12px 0 23px">A few starting points from across WordWeft.</p>'+btn('Explore all stories','','arrow-right')+'</div>'+''.join(asset(f'search-cover-{i}.png',f'searchdecor decor{i}') for i in range(1,9))+'<div class="mobilecoverrow mobile-only">'+''.join(asset(f'search-cover-{i}.png') for i in [1,2,6,7])+'</div></div>'
replace('05-search-empty',landing,'Restores your supplied search-cover assets around the central search task. Mobile keeps a short artwork row below the main choices rather than surrounding the input. Suggestions remain selectable and keyboard access is specified.')
resultbox='<div class="resultsbox"><div class="between"><h2>Results for “Jane”</h2><small>Enter ↵</small></div>'+''.join('<div class="personrow">'+avatar(initial)+'<div class="copy"><div class="eyebrow" style="font-size:8px;margin:0 0 4px">'+kind+'</div><h3 class="serif">'+title+'</h3><small>'+meta+'</small></div>'+arrow()+'</div>' for initial,kind,title,meta in [('JE','Story','Jane Eyre','Charlotte Brontë · Classic fiction'),('JA','Writer','Jane Austen','Stories in romance and classic fiction'),('P&P','Story','Pride and Prejudice','Jane Austen · Romance')])+'</div>'
related='<aside class="relatedbox"><div class="eyebrow">Explore further</div><h2>Explore related</h2><p class="hint" style="margin-top:12px">A related genre and collection.</p>'+''.join('<div class="relatedcard between"><div><div class="eyebrow">'+kind+'</div><h3>'+title+'</h3></div>'+arrow()+'</div>' for kind,title in [('Genre','Classic fiction'),('Collection','Essential classics')])+'</aside>'
replace('06-search-results',header('Search','Find stories and the people who write them.','Search WordWeft')+search('Jane')+tabs(['All','Stories 12','Writers 3','Genres 0','Collections 1'])+'<div class="sectionhead between"><div class="eyebrow" style="margin:0">Top matches</div>'+btn('View all results','plain small','arrow-right')+'</div><div class="twocol">'+resultbox+related+'</div><p class="safe" style="margin-top:25px">Press Enter for the full results page.</p>','Retains the supplied search hierarchy and distinguishes story and writer matches. Related items are separate from results. Query, scope counts and clear control remain visible; all counts are sample data.')

def detail_new(returning=False):
    left='<div class="detailart"><div class="cover">'+img(53681)+'</div><div><div class="eyebrow">The story at a glance</div><p class="artquote">“Some places remember us before we remember them.”</p><div class="chips"><span class="chip">Historical fiction</span><span class="chip">Literary</span><span class="chip">Ongoing</span></div></div></div>'
    main='<div class="detailmain"><div class="eyebrow">A WordWeft story · Updated weekly</div><h1>Spring Under<br>the Bridge</h1><div class="storybyline row">'+avatar('YM')+'<div><strong>Yuna Mori</strong><small>Writer · 2 stories</small></div></div><p class="storydek">An old letter. A familiar town.<br>A summer remembered differently.</p><p class="synopsis">Hana returns to her grandmother’s town to sort through an old archive.<br>There she finds letters addressed to someone who never existed.<br>Each one points to a different version of the summer she remembers.</p>'
    if returning:main+=readingprogress()
    main+='<div class="actions">'+btn('Continue reading' if returning else 'Read from beginning','primary','arrow-right')+btn('In your library' if returning else 'Add to library','','check' if returning else 'plus')+btn('Share','plain small')+'</div><div class="stats">'+''.join('<div class="stat"><strong>'+v+'</strong><span>'+l+'</span></div>' for v,l in [('★ 4.8','128 ratings'),('24.6k','reads'),('1.2k','likes'),('468','comments')])+'</div><p class="detailmeta">24 chapters &nbsp; · &nbsp; Approx. 4 hours &nbsp; · &nbsp; English &nbsp; · &nbsp; All readers</p>'+('' if returning else '<div class="notice" style="margin-top:22px;background:#f2eee7">A quiet historical mystery, updated every Friday.</div>')+'</div>'
    toc='<aside class="chapters"><div class="eyebrow">Table of contents</div><div class="between"><h2>24 chapters</h2><span class="chip" style="padding:5px 12px;min-height:29px;font-size:10px">Oldest first</span></div><p class="hint">Part one · Arrivals</p>'+timeline(returning)+'<div class="railfooter"><span>Scroll chapters independently</span><span style="color:var(--brown)">View all 24 →</span></div></aside>'
    guide='<div class="detailguide">'+tabs(['Characters','Scenes','Author notes','Reviews'])+'<div class="sectionhead between"><div><div class="eyebrow">Inside the story</div><h2>Meet the characters</h2></div><small>Spoiler safe · View all</small></div><div class="grid g3">'+''.join('<div class="guideperson">'+avatar(initial)+'<div class="eyebrow">'+role+'</div><h3>'+n+'</h3><p>'+description+'</p></div>' for initial,role,n,description in [('H','Protagonist','Hana Mori','An archivist returning home.'),('R','The stranger','Ren Sato','Knows the old letters.'),('E','Family','Eiko Mori','Keeper of a difficult history.')])+'</div>'+section('Reader conversation',comment('Alice L.','AL','The opening is quiet, and then that letter changes everything. I’m looking forward to the next chapter.','Read through chapter 8 · 2 days ago'),'See all reviews')+'</div>'
    return breadcrumb('Historical fiction / Spring Under the Bridge')+'<div class="detailgrid">'+left+main+toc+'</div>'+guide
replace('08-story-new',detail_new(False),'Restores your three-column story detail composition, author identity, serif title, artwork quote and connected contents timeline. New readers start at Chapter 1. Mobile retains the artwork and quote, then the synopsis and contents.')
replace('09-story-returning',detail_new(True),'Restores the coloured completion timeline: gold completed markers, a gold-ring current chapter and neutral unread markers. Six chapters are finished, Chapter 7 is current, overall reading progress is 29%. Continue reading opens the saved paragraph.')

def new_reader(mode):
    b=reader(mode)
    b=b.replace('Spring Under the Bridge','Spring Under the Bridge').replace('Aya Mori','Yuna Mori').replace('>AM<','>YM<')
    b=b.replace('CHAPTER 8 OF 24','CHAPTER 7 OF 24').replace('Literary fiction · Chapter 8 · 7 min read','Historical fiction · Chapter 7 · 6 min read').replace('8 of 24 chapters','7 of 24 chapters').replace('Chapter 8 complete','Chapter 7 complete').replace('Chapter 9 · Things left unsaid','Chapter 8 · A map of old promises')
    if mode in ['thread','preferences']:b=b.replace(chapters(7,10),chapters(6,10))
    if mode=='end':b=b.replace('Continue here · ','Up next · ')
    b=re.sub(r'<header class="readerbar">.*?</header>',lambda m:'<header class="readerbar"><div class="row">'+brand()+'<div class="bookdetails">'+ic('arrow-left')+'<span class="bookname"> Spring Under the Bridge</span></div></div><div class="chaptertitle">CHAPTER 7 OF 24<br><strong>When the lanterns go out</strong></div><div class="actions">'+btn(ic('bookmark'),'plain small')+btn('Aa','plain small')+btn(ic('maximize'),'plain small desktop-only')+btn(ic('list'),'plain small')+'</div></header>',b,flags=re.S)
    b=b.replace('<div style="margin:0 40px">','<div class="readerline">')
    b=b.replace('</main>','<div class="readerbottommeta"><span>'+ic('check')+' Your place is saved</span><span>2 min left in this chapter</span></div></main>')
    if mode=='end':b=b.replace('2 min left in this chapter','Chapter 7 finished')
    if mode in ['thread','preferences']:b=b.replace('<aside class="readeraside">','<aside class="readeraside"><div class="sheetgrip"></div>')
    return b
for slug,mode in [('10-reader-paper','quiet'),('11-reader-thread','thread'),('12-reader-night','preferences'),('13-reader-end','end')]:
    replace(slug,new_reader(mode),'Reading uses a generous literary column, unobtrusive paragraph markers and visible saved-position feedback. '+('The paragraph stays anchored when its discussion opens; mobile uses a contextual bottom sheet.' if mode=='thread' else 'Theme controls include Paper, Sepia and Night, with type size, width and spacing; mobile keeps them in a sheet.' if mode=='preferences' else 'Chapter completion offers one clear next-chapter action, then the discussion.' if mode=='end' else 'The default reading surface keeps progress at the margin and chapter controls within reach.'),'raw')

libraryhero='<div class="libraryhero">'+img(53681)+'<div class="librarybody"><div class="libraryheadline"><div class="eyebrow">Pick up where you left off</div><h2>Spring Under<br>the Bridge</h2><p class="lead">Yuna Mori · Chapter 7<br>When the lanterns go out</p></div>'+readingprogress()+'<div class="actions">'+btn('Continue chapter 7','primary','arrow-right')+btn('Story details','plain small')+'</div></div></div>'
replace('14-library',header('Your library','Your next chapter is right where you left it.','Your reading space')+tabs(['Reading 3','Saved 6','Finished 2'])+libraryhero+section('Also on your shelf',storylist([1,4],True),'')+section('Saved for later',cards([2,5]),'View all saved'),'The first reading item becomes a clear resume panel with actual chapter context and saved progress. Reading, Saved and Finished remain separate. Mobile uses a compact cover and full-width resume action; only started books show progress.')
replace('15-library-empty',header('Your library','Keep a story. Find your place. Return whenever you like.')+tabs(['Reading 0','Saved 0','Finished 0'])+'<div class="empty">'+img(436535,'emptyart')+'<h2>A story for your shelf.</h2><p>Save a story or start reading. Your library will keep your place for next time.</p>'+btn('Explore stories','primary','arrow-right')+'</div>','A real artwork makes the first-use reading space welcoming. The empty shelf explains what will appear and offers one direct path to discovery. No invented activity or statistics.')

identity='<div class="profilehero"><div class="profilebanner">'+img(45294)+'</div><div class="profileidentity">'+avatar('YM',True)+'<div class="profilecopy"><h1>Yuna Mori</h1><p class="muted" style="font-size:11px;margin-top:7px">@yunamori · Writer</p><p class="bio">I write about places we leave and the things that bring us back. Currently working on a story about a river town, and a summer nobody remembers the same way.</p><div class="profilecounts"><span><strong>2</strong> stories</span><span><strong>428</strong> followers</span><span><strong>86</strong> following</span></div></div><div class="actions">'+btn('Follow','primary','plus')+btn(ic('share-2'),'small')+btn(ic('ellipsis'),'plain small')+'</div></div></div>'
replace('16-writer-profile',identity+'<div class="profileabout"><div>'+tabs(['Stories','Activity','About'])+cards([0,4])+'</div><aside><div class="eyebrow">About the writing</div><h3>Historical fiction &amp; adventure</h3><p>Stories about home, memory and the roads in between.</p><h3>Publishing weekly</h3><p>New chapters of Spring Under the Bridge arrive on Fridays.</p><div class="rule"></div><p>Joined September 2026</p></aside></div>','A bridge artwork gives the public writer profile its own identity. Follow stays beside the name; biography, cadence and published stories are easy to scan. Mobile retains the banner, profile and labeled story tabs.')
replace('17-my-profile',header('Your profile','Your public page, as other readers see it.','Your account',btn('Edit profile','small','pencil'))+'<div class="profilehero"><div class="profilebanner">'+img(436535)+'</div><div class="profileidentity">'+avatar('SB',True)+'<div class="profilecopy"><h1>Srijib Bose</h1><p class="muted" style="font-size:11px;margin-top:7px">@srijib</p><p class="bio">Reader, occasional writer. Always looking for a story that stays with me.</p><div class="profilecounts"><span><strong>12</strong> followers</span><span><strong>26</strong> following</span></div></div></div></div><div class="section">'+tabs(['Stories','Activity','About'])+'<div class="empty" style="margin:45px auto"><h2>Your writing belongs here.</h2><p>Published stories appear on your profile. Drafts stay in your studio.</p>'+btn('Open writer studio','primary','arrow-right')+'</div></div>','Owner profile keeps Edit profile separate from public content. Personal library and drafts stay private; the empty published-story area leads directly to the studio.')
p=next(p for p in PAGES if p['slug']=='19-notifications');p['body']=p['body'].replace(notifs,notifs) # existing event structure, new visual hierarchy
p['body']=p['body'].replace('<div class="notification unread">','<div class="notification unread">',1).replace('published Chapter 9','published Chapter 24').replace('>AM<','>YM<').replace('Aya Mori','Yuna Mori').replace('Today · 9:20 am','Today · 10:20 am')
p['body']=p['body'].replace('<div class="notification unread">','<div class="notificationgroup">New since your last visit</div><div class="notification unread">',1)

# Preserve the desktop account references through accurate scale and spacing.
for slug in ['21-sign-in','22-sign-up','23-reset-password','24-email-verification']:
    p=next(p for p in PAGES if p['slug']==slug)
    p['body']=re.sub(r'<span class="brand">.*?</span>',lambda m:brand(),p['body'],count=1,flags=re.S)
    p['notes']='Preserves the supplied 30% artwork strip, Rubik headings and open form composition. Google uses the supplied identity asset. Mobile keeps a short artwork header, permanent field labels and comfortable full-width controls.'
replace('25-onboarding',header('Find your kind of story.','Choose a few interests. You can change them anytime.','Welcome to WordWeft')+'<div class="compact"><div class="genretiles" style="grid-template-columns:repeat(2,1fr)">'+''.join('<div class="cover">'+asset('genre-'+f+'.jpg')+'<div class="overlay between"><h3>'+n+'</h3>'+ic('check' if i in [0,2] else 'plus')+'</div></div>' for i,(n,f) in enumerate([('Classics','classics'),('Fantasy','fantasy'),('Romance','romance'),('Mystery','mystery')]))+'</div><div class="chips" style="margin-top:24px">'+''.join('<span class="chip">'+n+'</span>' for n in ['Poetry','Essays','Short stories','Science fiction'])+'</div><div class="rule"></div><h2>Here to read, write, or both?</h2><div class="actions" style="margin:23px 0 30px">'+btn('Read','primary','book-open')+btn('Write','','square-pen')+btn('Both')+'</div><div class="between">'+btn('Skip for now','plain')+btn('Continue','primary','arrow-right')+'</div></div>','Optional interest selection uses your genre artwork so choices feel tangible. Read, Write and Both steer the next destination; skipping opens discovery immediately. Preference choices can always be edited.')

def new_post(name='Yuna Mori',initials='YM',kind='Release',title='The next chapter is here.',text='Chapter 24 is up. Thank you to everyone who stayed with Hana through the rain. This chapter finally brings her back to the bridge.',attached=True,poll=False):
    b='<article class="feedpost"><div class="between"><div class="row">'+avatar(initials)+'<div><strong>'+name+'</strong><small style="display:block"><span class="formatpill '+kind.lower()+'">'+kind+'</span>'+('New releases' if attached else 'Writing craft')+' · 2 hours ago</small></div></div>'+ic('ellipsis')+'</div><h2>'+title+'</h2><p class="postbody">'+text+'</p>'
    if attached:b+='<div class="attachment row">'+img(53681)+'<div style="flex:1"><small>CHAPTER 24 · NEW RELEASE</small><h3>The long way home</h3><p class="hint">Spring Under the Bridge · 7 min</p></div>'+arrow()+'</div>'
    if poll:
        b+=''.join('<div class="polloption"><div class="fill" style="width:'+str(v)+'%"></div><span>'+t+(ic('check') if i==0 else '')+'</span><span>'+str(v)+'%</span></div>' for i,(t,v) in enumerate([('The river town',52),('The lantern shop',31),('The abandoned station',17)]))+'<p class="hint">84 votes · Your vote: The river town</p>'
    return b+'<div class="commentactions"><span>'+ic('heart')+' 24</span><span>'+ic('message-circle')+' 8 replies</span><span>'+ic('bookmark')+' Save</span><span>'+ic('share-2')+'</span></div></article>'
circles='<aside class="feedaside"><div class="eyebrow">Your circles</div>'+''.join('<div class="item '+('active' if i==0 else '')+'">'+n+'</div>' for i,n in enumerate(['General','New releases','Writing craft','Critique corner','Recommendations']))+'<div class="rule"></div>'+btn('Explore circles','plain small','arrow-right')+'</aside>'
aside='<aside class="feedaside"><h3>Around the stories</h3><p class="hint" style="margin-top:13px">Find company for the writing life.</p><div class="surface"><div class="eyebrow">Circle to explore</div><h3>Writing craft</h3><p>Questions, process notes and generous feedback.</p>'+btn('View circle','small','arrow-right')+'</div><div class="section"><div class="eyebrow">Writer to follow</div><div class="row">'+avatar('MD')+'<div><h3 style="font-size:13px">Mira Das</h3><p class="hint">Short stories</p></div></div><div style="margin-top:17px">'+btn('Follow','small','plus')+'</div></div></aside>'
feed='<div class="feedlayout">'+circles+'<div>'+tabs(['Discover','Following','Circles'])+'<div class="feedmobiletools"><span>'+ic('users-round')+'Explore circles</span><span>All formats '+ic('chevron-down')+'</span></div><div class="composer">'+avatar('SB')+'<span class="copy">What are you reading or writing?</span>'+btn('Post','small','plus')+'</div>'+new_post()+new_post('Dev Sen','DS','Poll','Where do you picture this story?','I’m writing about somebody returning to a place after many years. Which setting would you want to read?',False,True)+'</div>'+aside+'</div>'
replace('26-community',header('Between the chapters.','Updates, conversations, and company for the writing life.','WordWeft community')+feed,'Community gets a distinct but restrained plum accent; Release, Poll and Workshop tags carry context. Desktop circles are always visible; mobile exposes Explore circles above the feed. Saved posts and follow actions remain secondary.',active='Community')
circlehero='<div class="circlehero"><div><div class="eyebrow">Public circle · 1,240 members</div><h1>Writing craft</h1><p class="lead">The things we learn while trying to put a story into words.</p><div class="actions" style="margin-top:23px">'+btn('Joined','','check')+btn('Write a post','primary','plus')+'</div></div>'+img(45294)+'</div>'
replace('27-circle',circlehero+'<div class="twocol"><div>'+tabs(['Discussion','About & rules'])+new_post('Mira Das','MD','Workshop','When is a scene finished?','I keep polishing my opening paragraph when I probably need to move on. What helps you decide a scene has done enough?',False)+'</div><aside class="surface"><div class="eyebrow">How we talk here</div><h3>Be generous. Be specific.</h3><p class="lead" style="font-size:13px">Keep excerpts short. Mark spoilers. Ask before offering a critique.</p><div class="rule"></div><small>Public circle · Open to readers and writers</small></aside></div>','Circle identity, membership and composition are adjacent. Rules are readable alongside discussion. Mobile keeps Joined and Write a post in the circle introduction.',active='Community')
replace('28-community-post',breadcrumb('Community / New releases')+'<div class="compact">'+new_post()+section('The conversation',composer('Write a reply')+comment('Mira K.','MK','Just finished it. That conversation on the bridge was worth the wait.','1 hour ago',True)+'<div style="margin-left:50px;border-left:2px solid #e1e7db;padding-left:20px">'+comment('Yuna Mori','YM','Thank you for reading. I was nervous about that scene.','45 minutes ago')+'</div>','')+'</div>','Post detail keeps the same identity and attachment as the feed. Author replies are nested once with a visible relationship. Reply and spoiler handling remain contextual.',active='Community')

newmetrics='<div class="metricstrip">'+''.join('<div><span class="metricicon">'+ic(icon)+'</span><small>'+label+'</small><strong>'+v+'</strong><small class="trend">'+sub+'</small></div>' for label,v,sub,icon in [('Reads this month','2,184','Across 24 chapters','book-open'),('Followers','428','Your writing community','users-round'),('Comments','64','12 awaiting a reply','message-circle')])+'</div>'
draft='<div class="draftcontinue">'+img(53681)+'<div><div class="eyebrow">Continue your draft · Chapter 25</div><h2>Things left unsaid</h2><p>Spring Under the Bridge · 1,248 words<br>Last edited yesterday</p><div class="savedstate">'+ic('cloud-check')+'All changes saved</div></div>'+btn('Continue writing','primary','arrow-right')+'</div>'
activity='<div class="studioactivity"><div>'+section('Your stories',workrow(STORIES[0])+workrow(STORIES[5],'Draft'),'View all')+'</div><aside style="margin-top:33px"><div class="eyebrow">Reader conversation</div><h3>12 comments to come back to</h3><p>Read a thought from your readers, and reply when you have a moment.</p><div class="rule"></div><div class="row">'+avatar('MK')+'<strong style="font-size:12px">Mira K.</strong></div><p>“The river feels like another character. I keep thinking about the last line.”</p>'+btn('Open comments','plain small','arrow-right')+'</aside></div>'
replace('30-writer-dashboard',header('Writer studio','Welcome back, Yuna. Pick up your draft, or start something new.','Your writing',btn('New story','primary','plus'))+draft+newmetrics+activity,'The studio leads with the actual next draft, not an analytics dashboard. A blue work surface distinguishes creation, and green confirms saved work. Statistics are secondary; reader replies sit alongside the manuscript shelf.','studio','Overview')
work=workrow(STORIES[0])+workrow(STORIES[4])+workrow(STORIES[5],'Draft')
replace('31-writer-stories',header('Your stories','Published chapters and private drafts, in one place.','Writer studio',btn('New story','primary','plus'))+tabs(['All 3','Published 2','Drafts 1'])+'<div class="librarytools"><span class="tiny muted">Recently edited</span>'+btn('Search your stories','plain small','search')+'</div>'+work+'<p class="safe">Drafts are visible only to you. Story menus contain edit, preview and publication actions.</p>','A clear story inventory separates published and draft states. Search and recency help retrieve work. Mobile retains artwork, title, status and menu; it does not shrink a five-column table.','studio','My stories')
workspace=''
for i,t in enumerate(['The station after rain','The unopened letter','A house on the bend','The summer they forgot','What the river kept','The long way home','Things left unsaid'],19):
    workspace+='<div class="chaptermanage"><span class="handle">'+ic('grip-vertical')+'</span><div><h3>'+f'{i:02}'+' · '+t+'</h3><small>'+str(1200+i*17)+' words · '+('Edited yesterday' if i==25 else 'Published 30 Sep 2026')+'</small></div>'+badge('Draft' if i==25 else 'Published','blue' if i==25 else 'green')+'<span class="count muted">'+('Private' if i==25 else str(500-i*7)+' reads')+'</span><span class="last">'+ic('ellipsis')+'</span></div>'
replace('33-story-workspace',header('Spring Under the Bridge','24 published chapters · 1 private draft','Your story',btn('New chapter','primary','plus'))+tabs(['Chapters 25','Story details','Story guide','Statistics'])+'<div class="librarytools"><div class="actions">'+badge('Published','green')+btn('Preview story','plain small','external-link')+'</div><span class="tiny muted">Newest chapters shown</span></div>'+workspace,'The workspace distinguishes 24 published chapters from the new private Chapter 25. Current work appears in a clear chapter list with word counts, status and overflow actions. Drag reordering needs keyboard alternatives in implementation.','studio','My stories')

editorbar='<header class="editortop"><div class="row"><span class="backtool">'+ic('arrow-left')+'</span><div class="editorbook"><strong style="font-size:13px">Spring Under the Bridge</strong><small>Chapter 25 · Private draft</small></div><span class="mobile-only">Chapter 25<small>All changes saved</small></span></div><div class="actions"><span class="editsaved">'+ic('cloud-check')+' All changes saved</span>'+btn('Preview','small')+btn('Publish','primary small','arrow-right')+'</div></header>'
edleft='<aside class="editorside"><div class="eyebrow">Spring Under the Bridge</div><h3>Manuscript</h3>'
for i,t in enumerate(['The station after rain','The unopened letter','A house on the bend','The summer they forgot','What the river kept','The long way home','Things left unsaid'],19):
    edleft+='<div class="chapterrow '+('current' if i==25 else '')+'"><span class="number">'+(str(i) if i==25 else ic('check'))+'</span><div>'+t+'<small>'+('Private draft' if i==25 else 'Published')+'</small></div></div>'
edleft+='<div class="chapteradd">'+ic('plus')+'New chapter</div><div class="keyboardhint"><kbd>⌘</kbd><kbd>J</kbd> Jump to chapter</div></aside>'
formatbar='<div class="formatbar"><span>Paragraph '+ic('chevron-down')+'</span>'+''.join(ic(i) for i in ['bold','italic','underline','list','quote','link','undo-2','redo-2'])+'</div>'
manuscript='<article class="editorpaper"><div class="eyebrow">Chapter 25 · Private draft</div><h1>Things left unsaid</h1>'+''.join('<p>'+t+'</p>' for t in PROSE[1:])+'<p>By morning, she would have to choose.<span class="cursor"></span></p><div class="manuscriptend between"><span>1,248 words · 7 min read</span><span>'+ic('lock-keyhole')+'Only you can see this draft</span></div></article>'
edright='<aside class="editorright">'+tabs(['Details','Notes'],1)+'<h3>Private writing notes</h3><div class="notearea">Hana should notice the envelope before Ren says anything.<br><br>Keep the ending unresolved. The letter has more to say.</div><div class="privatebadge">'+ic('lock-keyhole')+' Only visible to you</div><div class="rule"></div><h3>Chapter details</h3><div style="margin-top:20px">'+field('Author note','Thank you for waiting for this one.',area=True)+field('Content warnings','None '+ic('chevron-down'))+'</div><div class="rule"></div><h3>Revision history</h3><p>Today, 10:14 am · Current<br>Yesterday, 8:52 pm</p>'+btn('View revisions','plain small','history')+'</aside>'
editor=editorbar+'<div class="editorlayout">'+edleft+'<main class="editorcenter">'+formatbar+manuscript+'<div class="keyboardhint"><kbd>⌘</kbd><kbd>Shift</kbd><kbd>F</kbd> Focus mode</div></main>'+edright+'</div><div class="editormobiletools"><span>'+ic('list')+'Chapters</span><span>'+ic('notepad-text')+'Notes</span><span>'+ic('sliders-horizontal')+'Details</span></div>'
replace('34-chapter-editor',editor,'An actual writing surface: chapter navigation at left, a stable manuscript in the middle, private notes and metadata at right. Saved status is always visible. Mobile keeps the manuscript full width with Chapters, Notes and Details in a reachable toolbar.','raw')
publishbody=publish.replace('Chapter 9','Chapter 25').replace('Aya Mori','Yuna Mori').replace('A new chapter','A new chapter')
replace('36-publish-chapter',header('Review &amp; publish','Chapter 25 · Things left unsaid','Spring Under the Bridge')+publishbody,'Publishing is a separate review with content checks, a reader preview and explicit notification options. Private notes are omitted from the preview. Publish now is the only release mode in this proposal.','studio','My stories')
chart='<div class="chartpanel"><div class="between"><h2>Reads over time</h2><span class="tiny muted">Last 7 days '+ic('chevron-down')+'</span></div><div class="chartwrap"><div class="chartaxis"><span>500</span><span>375</span><span>250</span><span>125</span><span>0</span></div><div class="chart">'+''.join('<div class="chartcol"><div class="chartbar '+('active' if i==5 else '')+'" style="height:'+str(v/5)+'%"><span class="chartvalue">'+str(v)+'</span></div><span class="chartlabel">'+day+'</span></div>' for i,(day,v) in enumerate([('25 Sep',172),('26 Sep',241),('27 Sep',217),('28 Sep',326),('29 Sep',308),('30 Sep',414),('1 Oct',291)]))+'</div></div><p class="chartcaption">Chapter reads per day · 1,969 reads in this period</p></div>'
data='<div class="datarow head"><span>Chapter</span><span>Reads</span><span>Likes</span><span>Comments</span></div>'+''.join('<div class="datarow"><span>'+f'{i+1:02}'+' · '+t+'</span><span>'+str(920-i*64)+'</span><span>'+str(54-i*3)+'</span><span>'+str(16-i)+'</span></div>' for i,t in enumerate(CHAPTERS[:5]))
replace('37-writer-statistics',header('Story statistics','Where readers spend time with your work.','Writer studio')+field('Story','Spring Under the Bridge '+ic('chevron-down'))+newmetrics+chart+section('Chapter by chapter',data,''),'Statistics have real numeric axes and bar values, with sample data summing to 1,969 reads in the displayed week. Blue marks data; green confirms public activity. Mobile keeps labels readable and removes only the lowest-priority table column.','studio','Statistics')

# Remaining screens get task-specific refinements on top of the new shell.
for p in PAGES:
    if p['slug']=='20-reviews':p['body']=p['body'].replace('86 ratings · 32 written reviews','128 ratings · 32 written reviews')
    if p['slug']=='29-community-compose':
        p['body']=p['body'].replace('A thought to share?','Create a post').replace('Chapter 9','Chapter 24').replace('A new chapter is here.','The next chapter is here.').replace('Chapter 9 is up.','Chapter 24 is up.')
        p['notes']='Post format and circle remain explicit. Release attaches an owned story or chapter; Poll exposes options; Workshop has excerpt and feedback context. Mobile uses a full editing sheet with visible Cancel and Publish actions.'
    if p['slug']=='32-create-story':p['body']=p['body'].replace('Give readers a title, a little context, and a reason to turn the page.','Add the title, introduction and artwork readers will see.').replace('Literary fiction','Historical fiction')
    if p['slug']=='35-story-guide':p['body']=p['body'].replace('A lantern maker returning to her grandmother’s river town.','An archivist returning to her grandmother’s river town.')
    if p['slug']=='38-writer-comments':p['body']=p['body'].replace('CHAPTER 8 · PARAGRAPH COMMENT','CHAPTER 7 · PARAGRAPH COMMENT').replace('Read, reply, and keep your story discussions welcoming.','Reply with the paragraph or chapter context in view.')
    if p['slug']=='39-settings-profile':p['body']=p['body'].replace('The details you choose to share with other readers.','Choose how you appear to readers and writers.').replace('Reader, occasional writer. Building a little room for stories.','Reader, occasional writer. Always looking for a story that stays with me.')
    if p['slug']=='40-settings-preferences':p['body']=p['body'].replace('<h2>Notifications</h2>','<div class="settingsection">What reaches you</div><h2>Notifications</h2>').replace('<h2>Reading defaults</h2>','<div class="settingsection">How you read</div><h2>Reading defaults</h2>')
    if p['slug']=='41-settings-security':p['body']=p['body'].replace('Delete account','Delete account').replace('Manage access and the information you share.','Manage your sign-in, privacy and account access.')
    if p['slug']=='42-founding-writers':
        body='<div class="twocol"><div class="founderintro">'+founderintro+img(45294,'founderart')+'</div><div class="founderpanel"><h2>Share your story with us.</h2>'+founderform+'</div></div>'
        p['body']=wrap(body)
    if p['slug']=='43-about':p['body']=p['body'].replace('Read a little. Stay awhile.','A good place to read.').replace('Make room for your own work.','A clear place to write.')
    if p['slug']=='44-help-contact':p['body']=p['body'].replace('A little help, when you need it.','How can we help?').replace('Find an answer or send us a note.','Find an answer, or send us a note with the details.')
    if p['slug']=='46-report':p['body']=p['body'].replace('Report this comment','Report this comment').replace('Reports are reviewed before action is taken.','Your report helps the team review this comment.')
    if p['slug']=='47-system-states':p['body']=p['body'].replace('Your chapter is published.','Chapter published.').replace('Your connection paused.','You’re offline.').replace('This page has wandered off.','This story isn’t available.').replace('Things left unsaid is now available to your readers.','Chapter 25 is now available to your readers.')
    if p['slug']=='49-filter-sheet':p['body']=p['body'].replace('Find your kind of story.','Filter stories').replace('Literary fiction','Historical fiction').replace('Show stories','Show 24 stories')
    if p['slug']=='50-mature-gate':p['body']=p['body'].replace('Before you start reading.','Content notes').replace('This story contains mature themes and is intended for adult readers.','This story is for adult readers and contains the following themes.')
    if p['slug']=='51-review-compose':p['body']=p['body'].replace('Leave a thought.','Rate &amp; review').replace('<div class="actions" style="color:#ad8b51">','<div class="actions rating" style="color:#ad8b51">')
    if p['slug']=='53-reader-chapters':
        p['body']=modal('<div class="sheetgrip"></div><div class="sheethead"><h1>Chapters</h1>'+ic('x')+'</div><p class="lead">Spring Under the Bridge</p><p class="hint">6 finished · Chapter 7 in progress</p><div style="margin-top:23px">'+timeline(True,True)+'</div><div class="actions">'+btn('Return to chapter 7','primary wide')+'</div>','Read')
        p['notes']='Connected completed, current and unread chapter states continue into the mobile contents sheet. The return action preserves the saved paragraph. Desktop uses the same vocabulary in its contents rail.'
    if p['slug']=='54-editor-details':p['body']=p['body'].replace('Chapter details','Chapter details &amp; notes').replace('Hana should notice the envelope before Ren says anything.','Hana should notice the envelope before Ren says anything. Keep the ending unresolved.')
    if p['slug']=='55-share-story':p['body']=p['body'].replace('Pass the story on.','Share this story').replace('Literary fiction','Historical fiction')
    if p['slug']=='56-writer-empty':
        content=header('Writer studio','Your first draft starts here.','Your writing')+'<div class="empty">'+img(45294,'emptybook')+'<h2>Give your story a place.</h2><p>Start with a title and a chapter. Your work stays private until you choose to publish.</p>'+btn('Create your first story','primary','arrow-right')+'</div><div class="notice info"><strong>You can change the details as you go.</strong><br>Artwork, title and description can all come later. Start with the words.</div>'
        p['body']=studio(content)
    if p['slug']=='59-unpublish-confirmation':p['body']=p['body'].replace('Chapter 9','Chapter 25')
    if p['slug']=='60-delete-account-confirmation':
        p['body']=p['body'].replace('class="btn primary"','class="btn primary danger"')
    p['body']=p['body'].replace('>HW<','>HM<').replace('>RI<','>RS<').replace('replied to your comment on Chapter 8.','replied to your comment on Chapter 7.')
    if p['slug']=='03-genre':
        for oldlabel in ['Adventure','Mystery','Classic fiction']:p['body']=p['body'].replace('<div class="genrelabel">'+oldlabel+'</div>','<div class="genrelabel">Historical fiction</div>')

menu='<div class="sheetgrip"></div><div class="sheethead">'+brand()+ic('x')+'</div><div class="row" style="margin:22px 0">'+avatar('SB')+'<div><strong style="font-size:13px">Srijib Bose</strong><small style="display:block;font-size:10px">@srijib</small></div></div><div class="menuitems">'
for t,i in [('Read stories','compass'),('Your library','library-big'),('Writer studio','square-pen'),('Community','messages-square'),('Your profile','user-round'),('Notifications','bell'),('Settings','settings'),('Help','circle-help')]:
    menu+='<div class="'+('primarydestination' if t=='Writer studio' else '')+'"><span class="menulabel"><span class="menuicon">'+ic(i)+'</span>'+t+'</span>'+ic('chevron-right')+'</div>'
menu+='</div><div class="rule"></div>'+btn('Sign out','plain small','log-out')
replace('48-mobile-navigation',modal(menu),'Mobile exposes all primary and account destinations in a labeled menu, complementing the four-destination bottom navigation. Desktop account menu is compact. Writer studio is named explicitly and is always one step away.','raw')

contexts={
 '29-community-compose':('Between the chapters.','Updates and conversations around stories.'),
 '46-report':('Reader conversation','Spring Under the Bridge · Chapter 7'),
 '49-filter-sheet':('Find something worth reading.','Explore stories, poems and essays.'),
 '50-mature-gate':('Before the next chapter','Story details · Mature 18+'),
 '51-review-compose':('Reader conversation','Spring Under the Bridge · Ratings and reviews'),
 '53-reader-chapters':('When the lanterns go out','Spring Under the Bridge · Chapter 7 of 24'),
 '54-editor-details':('Things left unsaid','Spring Under the Bridge · Chapter 25 · Private draft'),
 '55-share-story':('Spring Under the Bridge','An old letter. A familiar town. A summer remembered differently.'),
 '59-unpublish-confirmation':('Spring Under the Bridge','Story workspace · Chapter 25'),
 '60-delete-account-confirmation':('Privacy &amp; security','Manage your account and the information you share.')
}
context_sources={'29-community-compose':'26-community','49-filter-sheet':'02-browse','51-review-compose':'20-reviews','55-share-story':'09-story-returning','59-unpublish-confirmation':'33-story-workspace','60-delete-account-confirmation':'41-settings-security'}
source_bodies={p['slug']:p['body'] for p in PAGES}
for p in PAGES:
    if p['slug'] in contexts:
        t,sub=contexts[p['slug']]
        backdrop=header(t,sub)
        if p['slug'] in context_sources:
            context_source=source_bodies[context_sources[p['slug']]]
            backdrop=re.search(r'<main class="(?:page|studiomain)">(.*?)</main>',context_source,re.S).group(1)
        elif p['slug']=='53-reader-chapters':
            backdrop='<article class="chaptertext"><div class="eyebrow">Spring Under the Bridge · Chapter 7 of 24</div><h1>When the lanterns go out</h1><p class="dek">A small light can outlast the rain.</p>'+''.join('<p class="prose">'+t+'</p>' for t in PROSE[:4])+'</article>'
        elif p['slug']=='54-editor-details':
            backdrop=manuscript
        elif p['slug']=='46-report':
            backdrop+=comment('Mira K.','MK','“You were not meant to read that one.” The silence after that line feels louder than the words.','2 hours ago')+comment('Yuna Mori','YM','There is a lot they have not said to each other yet.','1 hour ago')
        p['body']=re.sub(r'<main class="page">.*?</main>',lambda m:'<main class="page">'+backdrop+'</main>',p['body'],count=1,flags=re.S)

seriffaces='@font-face{font-family:"WordWeft Serif";src:url("../assets/WordWeftSerif-400.ttf");font-weight:400}@font-face{font-family:"WordWeft Serif";src:url("../assets/WordWeftSerif-700.ttf");font-weight:700}\n'
css=seriffaces+((OUT/'screens/style.css').read_text()+'\n'+(ROOT/'revision.css').read_text()).replace('Georgia','"WordWeft Serif"')+'\n.danger{background:#a5403b!important;border-color:#a5403b!important}.timerow small .icon{width:11px;height:11px;color:#958b7d}.mobilecoverrow{display:none}@media(max-width:700px){.searchlanding .mobilecoverrow{display:flex}}\n'
(OUT/'screens/style.css').write_text(css)
for p in PAGES:
    groupcls={'Discovery':'discovery','Reading':'readflow','Reader account':'readeraccount','Account access':'access','Community':'community','Writer studio':'writer','Settings':'settings','Information':'information','States':'states'}[p['group']]
    cls=groupcls
    if p['slug']=='01-home':cls+=' home'
    if p['slug'] in ['05-search-empty','06-search-results','07-search-no-results']:cls+=' searchpage'
    if p['slug']=='48-mobile-navigation':cls+=' navigationmenu'
    if p['slug'] not in ['01-home','43-about'] and p['group'] not in ['Account access']:cls+=' signed'
    # Remove stale escaped nesting from a textual Google placeholder.
    p['body']=p['body'].replace('Chapter 9 · New release','Chapter 24 · New release')
    doc='<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>WordWeft · '+p['title']+'</title><link rel="stylesheet" href="style.css"></head><body class="'+cls+'">'+p['body']+'</body></html>'
    (OUT/'screens'/f'{p["slug"]}.html').write_text(doc)
manifest=[{k:v for k,v in p.items() if k!='body'} for p in PAGES]
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('Redesigned',len(PAGES),'screens using supplied references and the new shared system.')
