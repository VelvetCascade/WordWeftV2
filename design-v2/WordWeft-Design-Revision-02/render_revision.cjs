const fs=require('fs'),path=require('path');
const puppeteer=require('/workspace/scratch/6656f1c30f16/wordweft/node_modules/puppeteer');
const root='/workspace/scratch/f9ad6fd6d1db/WordWeft-Design-Revision-02';
const pages=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const polyfill=`
.row,.between,.actions,.btn,.navlinks,.navright,.brand,.tabs,.chips,.metrics,.check,.storyrow,.personrow,.commentactions,.readerbar,.readingdock,.notification,.profilecounts,.composer,.attachment,.formatbar,.settingrow,.footerlinks,.seg,.polloption,.chapterrow,.mobilebottom,.breadcrumb{gap:0!important}
.row>*+*{margin-left:14px}.between>*+*{margin-left:20px}.actions>*+*{margin-left:12px}.btn>*+*{margin-left:10px}.navlinks>*+*{margin-left:30px}.navright>*+*{margin-left:18px}.brand>*+*{margin-left:10px}.tabs>*+*{margin-left:28px}.chips>*{margin-right:9px;margin-bottom:9px}.metrics>*+*{margin-left:15px}.check>*+*{margin-left:9px}.storyrow>*+*{margin-left:20px}.personrow>*+*{margin-left:16px}.commentactions>*+*{margin-left:24px}.chapterrow>*+*{margin-left:12px}.readerbar>*+*{margin-left:15px}.readingdock>*+*{margin-left:14px}.notification>*+*{margin-left:15px}.profilecounts>*+*{margin-left:30px}.composer>*+*{margin-left:16px}.composer .btn{margin-left:auto}.attachment>*+*{margin-left:16px}.formatbar>*+*{margin-left:23px}.settingrow>*+*{margin-left:20px}.footerlinks>*+*{margin-left:22px}.seg>*+*{margin-left:3px}.breadcrumb>*+*{margin-left:7px}.artstrip{grid-gap:8px}.readeraside .row>*+*{margin-left:8px}
@media(max-width:700px){.row>*+*{margin-left:12px}.actions>*+*{margin-left:10px}.between>*+*{margin-left:12px}.navright>*+*{margin-left:14px}.brand>*+*{margin-left:8px}.tabs>*+*{margin-left:24px}.storyrow>*+*{margin-left:13px}.personrow>*+*{margin-left:12px}.metrics>*+*{margin-left:8px}.notification>*+*{margin-left:12px}.profilecounts>*+*{margin-left:21px}.composer>*+*{margin-left:10px}.composer .btn{margin-left:auto}.formatbar>*+*{margin-left:20px}.artstrip{gap:0}.artstrip img+img{margin-left:5px}.footerlinks>*+*{margin-left:17px}.footerlinks>*{margin-top:8px}.readingdock>*+*{margin-left:8px}.mobilebottom>*+*{margin-left:10px}.draftcontinue>.btn{margin-left:0}.editortop .actions>*+*{margin-left:8px}.readerbar .actions>*+*{margin-left:8px}}
`;
(async()=>{
 const b=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 let selected=pages;
 if(process.argv[2])selected=pages.filter(p=>process.argv[2].split(',').some(s=>p.slug.startsWith(s)));
 const qaPath=path.join(root,'qa-render.json');
 const qa=fs.existsSync(qaPath)?JSON.parse(fs.readFileSync(qaPath,'utf8')).filter(x=>!selected.some(p=>p.slug===x.screen)):[];
 for(const p of selected){
  for(const [type,width,height] of [['desktop',1440,1024],['mobile',390,844]]){
   const page=await b.newPage();await page.setViewport({width,height,deviceScaleFactor:2});
   await page.goto('file://'+path.join(root,'screens',p.slug+'.html'),{waitUntil:'load'});
   await page.evaluate(()=>document.fonts.ready);
   
   const issues=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,missingImages:Array.from(document.images).filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src),font:document.fonts.check('15px Rubik'),outside:Array.from(document.querySelectorAll('h1,h2,h3,.field,.btn,.cover,.storyrow,.chaptertext,.modal,.chaptermanage')).filter(e=>{const r=e.getBoundingClientRect();return r.width>0 &&(r.left< -1||r.right>innerWidth+1)}).map(e=>({class:e.className,text:e.textContent.slice(0,60),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))}));
   await page.screenshot({path:path.join(root,type,p.slug+'.png'),fullPage:true});qa.push({screen:p.slug,type,...issues});await page.close();
  }
  console.log('Rendered '+p.slug);
 }
 fs.writeFileSync(path.join(root,'qa-render.json'),JSON.stringify(qa,null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
