from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from reportlab.lib.colors import HexColor
from pypdf import PdfReader
import json, io, base64, html, textwrap, shutil, zipfile, concurrent.futures, re

ROOT=Path(__file__).parent
PACK=ROOT/'WordWeft-Design-Revision-02'
PAGES=json.loads((PACK/'manifest.json').read_text())
qa=json.loads((PACK/'qa-render.json').read_text())
assert len(qa)==120
assert not [q for q in qa if q['scrollWidth']>q['width'] or q['missingImages'] or q['outside'] or not q['font']]
NOTES=(ROOT/'revision_notes.md').read_text()
for p in PAGES:
    NOTES+=f'### {p["slug"][:2]} {p["title"]}\n\n{p["notes"]}\n\nDesktop: desktop/{p["slug"]}.png\nMobile: mobile/{p["slug"]}.png\n\n'
(PACK/'Design-notes.md').write_text(NOTES)
for name in ['Artwork-sources.json','Artwork-sources.md']:
    shutil.copy(ROOT/'WordWeft-Complete-Design-Pack'/name,PACK/name)
with (PACK/'Artwork-sources.md').open('a') as f:
    f.write('\n\n## Supplied reference imagery\n\nThe eight reference images supplied in this conversation are preserved under reference/. The home cover composition, underline, genre crops, search covers, mark and Google identity crop are reused from those supplied references. These preserve the existing visual direction. The cover examples do not imply production catalogue availability.\n\n## Editorial serif\n\nSource Serif 4 is sourced from Adobe/Google Fonts. The original variable font and SIL Open Font License are included. Static instances at optical size 20 are named WordWeft Serif. Source: https://github.com/adobe-fonts/source-serif\n')
font=ImageFont.truetype(str(PACK/'assets/Rubik-500.ttf'),22)
fontbig=ImageFont.truetype(str(PACK/'assets/Rubik-600.ttf'),45)
fontsmall=ImageFont.truetype(str(PACK/'assets/Rubik-400.ttf'),17)

# Compact visual overviews, with all pages visible in each device set.
for type,cols,cellw,cellh in [('desktop',3,660,615),('mobile',6,330,1090)]:
    for start in range(0,len(PAGES),12):
        part=PAGES[start:start+12];rows=(len(part)+cols-1)//cols
        sheet=Image.new('RGB',(cols*cellw+48,rows*cellh+145),'#e9e3d9');d=ImageDraw.Draw(sheet)
        d.text((28,24),'WordWeft',font=fontbig,fill='#4b2b1e')
        d.text((28,85),f'{type.title()} page designs  {start+1:02} to {start+len(part):02}',font=font,fill='#4a433c')
        for i,p in enumerate(part):
            im=Image.open(PACK/type/f'{p["slug"]}.png').convert('RGB');im.thumbnail((cellw-26,cellh-75),Image.Resampling.LANCZOS)
            x=24+i%cols*cellw;y=140+i//cols*cellh
            lines=textwrap.wrap(f'{p["slug"][:2]}  {p["title"]}',width=43 if type=='desktop' else 27)
            for k,line in enumerate(lines[:2]):d.text((x+8,y+k*23),line,font=fontsmall,fill='#4a433c')
            sheet.paste(im,(x+(cellw-im.width)//2,y+55))
        name=f'{type}-overview-{start//12+1:02}.jpg'
        sheet.save(PACK/'overviews'/name,quality=92,optimize=True)

# Two curated boards for the main chat, each showing full designs.
for name,type,slugs,cols,cellw,cellh in [
    ('WordWeft-Revision-02-Desktop-Preview.jpg','desktop',['01-home','09-story-returning','14-library','26-community','30-writer-dashboard','34-chapter-editor'],2,860,920),
    ('WordWeft-Revision-02-Mobile-Preview.jpg','mobile',['09-story-returning','14-library','11-reader-thread','26-community','30-writer-dashboard','34-chapter-editor'],3,430,1660)]:
    rows=(len(slugs)+cols-1)//cols;board=Image.new('RGB',(cols*cellw+48,rows*cellh+150),'#e9e3d9');d=ImageDraw.Draw(board)
    d.text((30,26),'WordWeft',font=fontbig,fill='#4b2b1e');d.text((30,91),f'{type.title()} designs',font=font,fill='#4a433c')
    for i,slug in enumerate(slugs):
        p=next(p for p in PAGES if p['slug']==slug);im=Image.open(PACK/type/f'{slug}.png').convert('RGB');im.thumbnail((cellw-32,cellh-75),Image.Resampling.LANCZOS)
        x=24+i%cols*cellw;y=150+i//cols*cellh;d.text((x+10,y),p['title'],font=fontsmall,fill='#4a433c');board.paste(im,(x+(cellw-im.width)//2,y+45))
    board.save(ROOT/name,quality=94,optimize=True)

# A local gallery. Thumbnails are embedded; full images are read from the extracted pack.
gallery=[]
for p in PAGES:
    record={k:v for k,v in p.items()}
    for type in ['desktop','mobile']:
        im=Image.open(PACK/type/f'{p["slug"]}.png').convert('RGB');im.thumbnail((800,1600),Image.Resampling.LANCZOS)
        b=io.BytesIO();im.save(b,format='JPEG',quality=87,optimize=True)
        record[type+'Thumb']='data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode()
    gallery.append(record)
gcss='''*{box-sizing:border-box}body{margin:0;background:#fbfaf7;color:#171817;font:15px/1.5 Arial,sans-serif}header,main{max-width:1440px;margin:auto;padding:30px}header{padding-top:55px}h1{font:42px Georgia,serif;margin:0 0 15px}p{color:#77726e;max-width:850px}button,select,input{font:inherit;padding:11px 15px;border:1px solid #d7cdc1;background:#fffefd;border-radius:7px;color:#6b432f}button.active{background:#6b432f;color:white}nav{display:flex;gap:12px;flex-wrap:wrap;margin:30px 0}#grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:30px}.card{border-bottom:1px solid #e7e1d9;padding-bottom:25px}.card h2{font-size:18px;font-weight:500;margin:14px 0 8px}.card p{font-size:12px}.preview{display:flex;align-items:flex-start;justify-content:center;height:380px;overflow:hidden;background:#ede7dc;padding:12px;border-radius:7px;cursor:zoom-in}.preview img{max-width:100%;max-height:100%;object-fit:contain}.mobile .preview{height:680px}.links{display:flex;gap:15px;font-size:12px;margin-top:14px}a{color:#6b432f}#lightbox{display:none;position:fixed;inset:0;background:#27221de8;z-index:10;overflow:auto;padding:25px}#lightbox.open{display:block}#lightbox img{display:block;max-width:100%;height:auto;margin:60px auto 25px;background:white}#close{position:fixed;top:15px;right:24px;z-index:12}#count{font-size:12px;color:#77726e}@media(max-width:700px){header,main{padding:25px}h1{font-size:32px}#grid{grid-template-columns:1fr}.preview{height:350px}.mobile .preview{height:750px}}'''
gscript='''let device='desktop';const data=DATA;const grid=document.getElementById('grid');function render(){const group=document.getElementById('group').value;const q=document.getElementById('find').value.toLowerCase();const shown=data.filter(p=>(!group||p.group===group)&&(!q||(p.title+' '+p.notes).toLowerCase().includes(q)));grid.className=device;grid.innerHTML=shown.map(p=>`<article class="card"><div class="preview" data-slug="${p.slug}"><img src="${p[device+'Thumb']}" alt="${p.title}"></div><h2>${p.slug.slice(0,2)} ${p.title}</h2><p>${p.notes}</p><div class="links"><a href="desktop/${p.slug}.png">Desktop PNG</a><a href="mobile/${p.slug}.png">Mobile PNG</a><a href="screens/${p.slug}.html">Editable layout</a></div></article>`).join('');document.getElementById('count').textContent=shown.length+' of '+data.length+' screens';document.querySelectorAll('.preview').forEach(el=>el.onclick=()=>{document.getElementById('large').src=device+'/'+el.dataset.slug+'.png';document.getElementById('lightbox').classList.add('open')});document.querySelectorAll('[data-device]').forEach(el=>el.classList.toggle('active',el.dataset.device===device))}document.querySelectorAll('[data-device]').forEach(el=>el.onclick=()=>{device=el.dataset.device;render()});document.getElementById('group').onchange=render;document.getElementById('find').oninput=render;document.getElementById('close').onclick=()=>document.getElementById('lightbox').classList.remove('open');document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('lightbox').classList.remove('open')});render();'''
groups=list(dict.fromkeys(p['group'] for p in PAGES))
gdoc='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WordWeft design gallery</title><style>'+gcss+'</style></head><body><header><h1>WordWeft page designs</h1><p>Design revision 02: 60 screens and states, with desktop and mobile views for each. Click a preview to open the full image. The supplied references are preserved, and this revision remains a review proposal.</p><nav><button data-device="desktop">Desktop</button><button data-device="mobile">Mobile</button><select id="group"><option value="">All page groups</option>'+''.join('<option>'+html.escape(g)+'</option>' for g in groups)+'</select><input id="find" placeholder="Find a page"><span id="count"></span></nav><div class="links"><a href="Design-notes.md">Detailed design notes</a><a href="Artwork-sources.md">Artwork sources</a></div></header><main id="grid"></main><div id="lightbox"><button id="close">Close</button><img id="large" alt="Full page design"></div><script>'+gscript.replace('DATA',json.dumps(gallery))+'</script></body></html>'
(PACK/'index.html').write_text(gdoc)

# The PDF has eight introductory/index pages, 120 full views and two handoff pages.
pdfmetrics.registerFont(TTFont('UI',str(PACK/'assets/Rubik-400.ttf')))
pdfmetrics.registerFont(TTFont('UIMedium',str(PACK/'assets/Rubik-500.ttf')))
pdfmetrics.registerFont(TTFont('UIBold',str(PACK/'assets/Rubik-700.ttf')))
pdfmetrics.registerFont(TTFont('Literary',str(PACK/'assets/WordWeftSerif-400.ttf')))
pdfmetrics.registerFont(TTFont('LiteraryBold',str(PACK/'assets/WordWeftSerif-700.ttf')))
PDF=ROOT/'WordWeft-Design-Revision-02.pdf'
c=canvas.Canvas(str(PDF),pagesize=(1080,1440),pageCompression=1)
c.setTitle('WordWeft - Design revision 02 - All 120 views')
c.setAuthor('WordWeft design review')
INK='#191c1c';PAPER='#fbfaf7';MUTED='#716f6b';TEAL='#28675e';BLUE='#344e83';GOLD='#b88a43';PLUM='#72566f';BROWN='#6b432f'
def para(t,x,y,width,font='UI',size=14,leading=23,color=MUTED):
    c.setFillColor(HexColor(color));c.setFont(font,size)
    for paragraph in t.split('\n'):
        line=''
        for word in paragraph.split():
            trial=(line+' '+word).strip()
            if pdfmetrics.stringWidth(trial,font,size)>width and line:
                c.drawString(x,y,line);y-=leading;line=word
            else:line=trial
        if line:c.drawString(x,y,line);y-=leading
    return y
def rect(x,y,w,h,color,r=0):
    c.setFillColor(HexColor(color))
    if r:c.roundRect(x,y,w,h,r,fill=1,stroke=0)
    else:c.rect(x,y,w,h,fill=1,stroke=0)
def background(w=1080,h=1440):rect(0,0,w,h,PAPER)
def label(t,x,y,color=BROWN,size=11):
    c.setFillColor(HexColor(color));c.setFont('UIMedium',size);c.drawString(x,y,t)
def intro(t,sub='',tag='DESIGN REVISION 02',color=BROWN):
    c.setPageSize((1080,1440));background();label('WORDWEFT  /  '+tag,65,1365,color)
    para(t,65,1289,950,font='UIBold',size=43,leading=49,color=INK)
    if sub:para(sub,65,1216,950,size=16,leading=26)
def foot():
    label('WordWeft  /  Design revision 02  /  1 October 2026',65,38,MUTED,10)
    c.setFont('UI',10);c.drawRightString(1015,38,str(c.getPageNumber()))
def fit_image(path,x,y,w,h,crop=None):
    im=Image.open(path).convert('RGB')
    if crop:im=im.crop(crop)
    scale=min(w/im.width,h/im.height);iw=im.width*scale;ih=im.height*scale
    b=io.BytesIO();im.save(b,format='JPEG',quality=94,optimize=True);b.seek(0)
    c.drawImage(ImageReader(b),x+(w-iw)/2,y+(h-ih)/2,width=iw,height=ih)
def block(t,body,x,y,w,color=TEAL):
    label(t,x,y,color,12)
    return para(body,x,y-28,w,size=14,leading=23)
def table(headers,rows,widths,x,y,rowh=83,color=TEAL):
    w=sum(widths);rect(x,y-43,w,43,color,7);xx=x
    for h,cw in zip(headers,widths):para(h,xx+16,y-28,cw-28,font='UIMedium',size=11,leading=15,color='#ffffff');xx+=cw
    yy=y-43
    for n,row in enumerate(rows):
        rect(x,yy-rowh,w,rowh,'#f0f2ed' if n%2==0 else PAPER)
        xx=x
        for value,cw in zip(row,widths):para(str(value),xx+16,yy-24,cw-28,size=12,leading=18,color=INK);xx+=cw
        yy-=rowh
    return yy

# 1. Cover.
background();c.bookmarkPage('cover');c.addOutlineEntry('Design revision 02','cover',0)
label('WORDWEFT  /  COMPLETE DESIGN REVIEW',65,1365,BROWN,12)
para('Design revision 02',65,1265,950,font='LiteraryBold',size=58,leading=65,color=INK)
para('60 screens. 120 desktop and mobile views.',65,1206,950,font='UIMedium',size=20,leading=30,color=INK)
para('Your visual references restored, with a more deliberate application around them.',65,1158,900,size=16,leading=25)
fit_image(PACK/'desktop/01-home.png',65,365,950,735)
label('READING',65,280,GOLD);label('WRITING',395,280,BLUE);label('COMMUNITY',725,280,PLUM)
para('A saved place, a clear next chapter, and a quiet reading surface.',65,249,270,size=13,leading=22)
para('A manuscript, private notes, and confidence in saved work.',395,249,270,size=13,leading=22)
para('Conversations with context, around stories and the people writing them.',725,249,280,size=13,leading=22)
para('Review proposal. Original references remain preserved. Sample content and still interaction states.',65,115,930,size=12,leading=20)
foot();c.showPage()

# 2. The supplied references are visibly documented.
intro('Your designs are the foundation.','The distinctive parts of the supplied pages are restored and carried through the application.','THE FOUNDATION')
c.bookmarkPage('foundation');c.addOutlineEntry('The supplied foundation','foundation',0)
refs=[('2B8D528D-0BB1-401C-8841-E0BF3E6666FB(1).jpeg','Home','Dark Stories shape, supplied covers and underline.'),('IMG_9144(1).jpeg','Account access','The artwork strip, bold heading and open form.'),('6CF38432-EE23-4A64-8741-1709084C68C1.png','Story details','The connected gold timeline and current chapter.'),('19745404-754A-43A2-AB7C-704E584356A6.png','Search','Your supplied colourful covers around the search task.')]
for i,(file,t,note) in enumerate(refs):
    x=65+(i%2)*490;y=756 if i<2 else 345
    rect(x,y,460,318,'#eeeee8',9);fit_image(PACK/'reference'/file,x+12,y+12,436,294)
    label(t.upper(),x,y-28,BROWN,11);para(note,x,y-50,460,size=12,leading=19)
block('WHAT CHANGES AROUND THEM','Navigation, reading continuity, manuscript tools, context in community posts, and the treatment of mobile sheets. The aim is an application with recognisable places and useful detail.',65,183,950)
foot();c.showPage()

# 3. The system, with exact colour and type roles.
intro('Colour and type with a purpose.','Artwork supplies richness. Interface colour communicates place, progress and state.','THE VISUAL SYSTEM')
c.bookmarkPage('system');c.addOutlineEntry('Visual system','system',0)
palette=[('Paper','#FBFAF7','Reading and discovery'),('Ink','#191C1C','Titles, prose and primary information'),('Umber','#6B432F','Brand actions and supplied reference language'),('Gold','#B88A43','Reading progress and chapter completion'),('Teal','#28675E','Resume, saved work and published states'),('Ink blue','#344E83','Studio navigation, draft actions and writer tools'),('Plum','#72566F','Community context and conversation identity'),('Red','#A5403B','Errors and a deliberate destructive action')]
for i,(name,hexcode,use) in enumerate(palette):
    y=1135-i*68;rect(65,y-28,42,42,hexcode,6);label(name,130,y-1,INK,13);label(hexcode,325,y-1,MUTED,11);para(use,465,y-1,520,size=12,leading=19,color=MUTED)
rect(65,410,950,135,'#edf1f8',11)
para('The writing has room to breathe.',88,498,895,font='LiteraryBold',size=31,leading=39,color=INK)
para('Rubik for the interface. A consistent literary serif for story titles, headings and prose.',88,454,895,size=14,leading=23,color=BLUE)
block('READING SCALE','Desktop prose: 19 px. Mobile prose: 18 px. The calm desktop reader uses a 680 px column; mobile keeps a comfortable margin. Controls and metadata sit outside the prose.',65,340,450,GOLD)
block('SURFACE DETAIL','Fine borders, modest corners, careful alignment and short button contact shadows. Art is flat and sourced. Colour has a defined role instead of filling every available surface.',565,340,450,TEAL)
para('Serif source: Adobe Source Serif 4. The pack includes renamed static instances, the original font and its licence.',65,119,950,size=11,leading=18)
foot();c.showPage()

# 4. Flows and their screen mapping.
intro('An obvious place for the next step.','Each task has a visible entry, a focused path and a clear result.','NAVIGATION & FLOWS')
c.bookmarkPage('flows');c.addOutlineEntry('Navigation and flows','flows',0)
rows=[('Find a story','Read / Explore','Browse 02 > Details 08 > Reader 10','Start at Chapter 1'),('Return to a story','Your library','Library 14 > Progress 09 > Reader 10','Resume the saved paragraph'),('Talk about a passage','Paragraph marker','Reader 10 > Thread 11','Discussion stays beside its passage'),('Write a chapter','Write / Writer studio','Studio 30 > Workspace 33 > Editor 34','A saved private draft'),('Publish','Publish in the editor','Editor 34 > Review 36 > Success 47','A reader-visible chapter'),('Join a conversation','Community','Feed 26 > Circle 27 > Post 28','A contextual reply or post'),('Adjust preferences','Profile / Settings','Settings 39-41 > Reader preferences 12','A clear, reversible choice')]
table(['TASK','VISIBLE ENTRY','PATH / SCREEN NUMBER','RESULT'],rows,[185,160,385,220],65,1154,rowh=83,color=TEAL)
block('MOBILE APP NAVIGATION','Explore, Library, Community and Write are the four main destinations. The account menu adds Profile, Notifications, Settings and Help. The current destination is always visible.',65,452,450,TEAL)
block('WRITER NAVIGATION','The studio uses Overview, Stories, Comments and More on mobile. Desktop gives chapter work, reader comments, statistics and the story guide their own named places.',565,452,450,BLUE)
block('FOCUSED SURFACES','The reader keeps chapter controls and preferences close to the prose. The manuscript editor keeps saved status, preview and publish within reach. Each returns to its story context.',65,246,950,BROWN)
foot();c.showPage()

# 5. Reading and return, using clear viewport details.
intro('Returning should feel effortless.','The story, saved chapter and conversation remain connected.','READING & CONTINUITY',GOLD)
c.bookmarkPage('reading-direction');c.addOutlineEntry('Reading continuity','reading-direction',0)
for i,(slug,title,crop) in enumerate([('09-story-returning','CONNECTED CHAPTER PROGRESS',(0,410,780,2098)),('14-library','A USEFUL PLACE TO RESUME',(0,0,780,1688)),('11-reader-thread','A PASSAGE WITH CONTEXT',(0,780,780,2468))]):
    x=65+i*320;rect(x,520,300,651,'#eeeae1',10);fit_image(PACK/'mobile'/f'{slug}.png',x+9,530,282,630,crop);label(title,x,490,GOLD,9)
block('PROGRESS THAT EXPLAINS ITSELF','Finished, current and unread chapters have separate symbols and words. The example shows six finished chapters, Chapter 7 in progress and 29% overall progress. Continue reading opens the saved paragraph.',65,420,450,GOLD)
block('THE PROSE HAS PRIORITY','Paragraph discussion is optional and anchored. Chapter conversation follows the prose. Spoiler-marked reviews and guide details stay closed until the reader chooses or reaches them.',565,420,450,TEAL)
para('Viewport details above. The complete full-page desktop and mobile images follow in the screen inventory.',65,118,950,size=11,leading=19)
foot();c.showPage()

# 6. Writing and measured motion.
intro('Tools that feel dependable.','A stable manuscript, private notes and clear feedback do more than decorative animation.','WRITING & FEEDBACK',BLUE)
c.bookmarkPage('writing-direction');c.addOutlineEntry('Writing and motion','writing-direction',0)
fit_image(PACK/'desktop/34-chapter-editor.png',65,680,950,500)
rows=[('Hero word','Stories / Novels / Poems / Essays','180 ms vertical replacement; fixed word in reduced motion'),('Save / autosave','Confirm that the latest action is safe','120 ms label and icon transition; instant alternative'),('Thread / sheet','Explain where a panel comes from','180 ms entrance; preserve the passage and focus'),('Theme change','Apply a reading preference','120 ms colour transition; no prose reflow'),('Publish result','Confirm the completed action','160 ms transition to a stable confirmation')]
table(['MOMENT','PURPOSE','SPECIFIED BEHAVIOUR'],rows,[165,285,500],65,620,rowh=70,color=BLUE)
para('Still states are shown in this PDF. Timings are proposed implementation specifications. Motion is optional, brief and attached to an action. Loading uses stable geometry; no shimmer, floating cover loops or automatic page turning is required.',65,169,950,size=12,leading=20)
foot();c.showPage()

# 7 and 8. Clickable inventories with exact physical page mapping.
for start in [0,30]:
    intro('Screen inventory','Each desktop view is followed by its mobile view. Select a row or use the PDF bookmarks.','ALL 120 VIEWS')
    if start==0:c.bookmarkPage('inventory');c.addOutlineEntry('Screen inventory','inventory',0)
    label('SCREEN',65,1148,MUTED,10);label('PAGE GROUP',700,1148,MUTED,10);label('DESKTOP / MOBILE',884,1148,MUTED,10)
    y=1101
    for i,p in enumerate(PAGES[start:start+30],start):
        if i%2==0:rect(55,y-13,970,35,'#f0f2ed',4)
        para(f'{i+1:02}  {p["title"]}',65,y,615,size=13,leading=18,color=INK)
        label(p['group'],700,y,MUTED,10)
        label(f'{9+2*i} / {10+2*i}',945,y,MUTED,10)
        c.linkRect('',p['slug']+'-desktop',(55,y-13,1025,y+22),relative=0,thickness=0)
        y-=32
    foot();c.showPage()

# Each full screenshot gets its own natural-proportion page and individual bookmark.
for i,p in enumerate(PAGES):
    for device in ['desktop','mobile']:
        im=Image.open(PACK/device/f'{p["slug"]}.png').convert('RGB')
        maxw=1920 if device=='desktop' else 780
        if im.width>maxw:im=im.resize((maxw,round(im.height*maxw/im.width)),Image.Resampling.LANCZOS)
        b=io.BytesIO();im.save(b,format='JPEG',quality=94,optimize=True);b.seek(0)
        naturalw=1440 if device=='desktop' else 390
        screenh=im.height/im.width*naturalw
        margin=40 if device=='desktop' else 24;W=naturalw+margin*2;H=screenh+220
        c.setPageSize((W,H));background(W,H)
        bookmark=p['slug']+'-'+device;c.bookmarkPage(bookmark)
        if i==0 and device=='desktop':c.addOutlineEntry('All screen designs',bookmark,0)
        if device=='desktop':c.addOutlineEntry(f'{i+1:02} {p["title"]}',bookmark,1)
        c.addOutlineEntry(device.title(),bookmark,2)
        accent=BLUE if p['group']=='Writer studio' else PLUM if p['group']=='Community' else TEAL if p['group'] in ['Reader account','Settings'] else BROWN
        label(f'{p["slug"][:2]} / {device.upper()} / {p["group"]}',margin,H-31,accent,12 if device=='desktop' else 9)
        titlebottom=para(p['title'],margin,H-68,naturalw,font='UIMedium',size=23 if device=='desktop' else 16,leading=24 if device=='desktop' else 21,color=INK)
        assert titlebottom>=H-103,(p['slug'],device,'title overflow')
        c.drawImage(ImageReader(b),margin,130,width=naturalw,height=screenh)
        bottom=para(p['notes'],margin,101,naturalw,size=12 if device=='desktop' else 9,leading=17 if device=='desktop' else 13)
        assert bottom>35,(p['slug'],device,'caption overflow',bottom)
        label('WordWeft / Review proposal / '+p['slug'],margin,22,MUTED,10 if device=='desktop' else 8)
        c.setFont('UI',10 if device=='desktop' else 8);c.drawRightString(W-margin,22,str(c.getPageNumber()))
        c.showPage()

# 129. Product and implementation boundaries, after all images.
intro('A clear handoff.','The images define an experience to review and implement.','PRODUCT CONTRACTS')
c.bookmarkPage('handoff');c.addOutlineEntry('Handoff and sources','handoff',0)
items=[('WHAT IS COMPLETE','All 60 named screens have desktop and mobile layouts. The pack includes 120 PNGs, editable HTML/CSS, a filterable image gallery, artwork references, licenses and individual design notes.'),('WHAT THE FILES DO','The PDF and page HTML are static design references. The gallery supports device selection, group filtering, text search and opening the full images. Product forms and buttons are visual examples.'),('READING & WRITING CONTRACTS','Saved paragraph positions, offline draft persistence, revision conflicts and spoiler reveal rules need storage and backend validation before these designs become production behaviour. Messages must only promise recovery after it has been verified.'),('ACCOUNT & CONTENT CONTROLS','Blocking, follower visibility, account deletion and mature-content access must match the actual platform rules. The content notice is a disclosure surface, not an age-verification system.'),('POLICIES & SAMPLE CONTENT','Terms, privacy excerpts and deletion copy are layout examples. Final policies must use reviewed production text. Names, chapter prose, counts, reviews and analytics are illustrative. Supplied covers do not imply catalogue availability.'),('MOBILE & ACCESS','Sheets preserve the reading or manuscript position. A focused sheet needs focus management, a visible close action and focus restoration. Icon controls need a comfortable activation area. The proposed minimum is 44 px; visible icons may be smaller.'),('REVIEW STATUS','This revision is a proposal. The supplied eight images and the original DOCX are preserved. Nothing in this pack marks a new direction as approved or publishes changes to the live application.')]
y=1136
for t,body in items:y=block(t,body,65,y,950,TEAL)-30
foot();c.showPage()

# 130. Human-readable sources and reference mapping.
intro('Sources and reference map.','Existing artwork, supplied assets, real type and icon systems.','SOURCE NOTES')
refsrows=[('Home','2B8D528D-0BB1-401C-8841-E0BF3E6666FB(1).jpeg'),('Create account','IMG_9144(1).jpeg'),('Sign in','IMG_9145(1).jpeg'),('Browse','7034B66E-8D91-4ADB-AE1F-3A51FE23016D(1).jpeg'),('Returning details','6CF38432-EE23-4A64-8741-1709084C68C1.png'),('New-reader details','EAA4F1B0-DCFF-43AB-A3DE-23C850C745A7.png'),('Search initial','19745404-754A-43A2-AB7C-704E584356A6.png'),('Search results','3118147D-20A6-444E-98F6-B4F485EE0092.png')]
table(['SUPPLIED REFERENCE','PRESERVED FILENAME'],refsrows,[230,720],65,1152,rowh=43,color=BROWN)
y=720
for title,body,url in [
 ('Artwork and identity','The supplied cover composition, underline, genre imagery, search covers and mark are reused. Additional archival artworks are from The Met Open Access; source records and object links are in Artwork-sources.md.','https://www.metmuseum.org/hubs/open-access'),
 ('Typography and icons','Rubik and Source Serif 4 use the SIL Open Font License. Source Serif static instances are named WordWeft Serif. Lucide supplies actual icon paths under the ISC License. Licences are included in assets/.','https://github.com/adobe-fonts/source-serif'),
 ('Visual and UX research','NN/G guidance on hierarchy, intentional colour, useful imagery and recognition informed the design decisions. These are design interpretations, not measured retention findings.','https://www.nngroup.com/articles/good-visual-design/'),
 ('Motion reference','Apple guidance informed brief action feedback and an optional motion experience. The PDF shows still states and documents proposed timing.','https://developer.apple.com/design/human-interface-guidelines/motion')]:
    y=block(title.upper(),body,65,y,950,TEAL)
    y=para(url,65,y-7,950,size=11,leading=18,color=BLUE)-27
foot();c.showPage();c.save()
assert len(PdfReader(PDF).pages)==130
print('PDF created:',PDF.name,PDF.stat().st_size,flush=True)

# Preserve source and references together with the full image set.
for name in ['revision_base.py','redesign_designs.py','revision.css','render_revision.cjs','package_revision.py','revision_notes.md']:
    shutil.copy(ROOT/name,PACK/name)
shutil.copy(ROOT/'references/WordWeft-Website-Design-Reference-Updated-with-New-Browse-Image.docx',PACK/'reference/WordWeft-Existing-Design-Reference.docx')
(PACK/'README.txt').write_text('WordWeft design revision 02\n\n60 screens and states. 120 PNGs at 2x export scale.\n\nExtract the ZIP and open index.html for the image gallery. Choose Desktop or Mobile, filter by group, or search for a screen. Click a preview to open its full image.\n\nRead Design-notes.md for the visual system, flows, motion and individual screen notes. Sources and licences are included. The eight supplied references and the original DOCX are preserved under reference/.\n\nThe page HTML is editable static design source. Only the gallery controls are wired. These designs are review proposals with illustrative content. The updated PDF is supplied separately.\n')
for device in ['desktop','mobile']:
    files=list((PACK/device).glob('*.png'));assert len(files)==60
    for f in files:
        with Image.open(f) as im:assert im.width==(2880 if device=='desktop' else 780)
def compress(f):
    with Image.open(f) as im:im.convert('RGB').save(f,optimize=True,compress_level=9)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for i,_ in enumerate(pool.map(compress,list((PACK/'desktop').glob('*.png'))+list((PACK/'mobile').glob('*.png'))),1):
        if i%30==0:print('Optimized',i,'images',flush=True)
ZIP=ROOT/'WordWeft-Design-Revision-02-All-Images.zip'
with zipfile.ZipFile(ZIP,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for f in sorted(PACK.rglob('*')):
        if f.is_file():z.write(f,Path(PACK.name)/f.relative_to(PACK))
with zipfile.ZipFile(ZIP) as z:assert z.testzip() is None
print('ZIP created:',ZIP.name,ZIP.stat().st_size,flush=True)
print('Verified 120 images and 130 PDF pages.',flush=True)
