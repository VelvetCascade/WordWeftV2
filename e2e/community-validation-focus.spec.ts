import { test, expect, type Page } from './fixtures';
import { writeFile } from 'node:fs/promises';
if(process.env.AUDIT_MOBILE || process.env.AUDIT_LANDSCAPE)test.use({viewport:process.env.AUDIT_LANDSCAPE?{width:844,height:390}:{width:390,height:844},isMobile:true,hasTouch:true});
const size = process.env.AUDIT_LANDSCAPE ? '844' : process.env.AUDIT_MOBILE ? '390' : '1440';
const circles=[{id:'circle-update',slug:'updates',name:'Synthetic Updates',description:'Reading updates.',rules:[],accent:'brown',allowedPostTypes:['UPDATE'],memberCount:1,official:true,joined:false},{id:'circle-questions',slug:'questions',name:'Synthetic Questions',description:'Thoughtful questions.',rules:[],accent:'brown',allowedPostTypes:['POLL','WORKSHOP','RELEASE','RECOMMENDATION'],memberCount:1,official:true,joined:false}];
async function composer(page:Page){
 await page.addInitScript(()=>{localStorage.setItem('wordweft_jwt','synthetic-local-token');localStorage.setItem('ww_welcomeJourneyCompleted','true');localStorage.setItem('hasSeenWhatsNewPopup_v1','true')});
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;if(/\.[cm]?[jt]sx?$/.test(path))return route.continue();
  if(path==='/api/users/me')return route.fulfill({json:{id:'composer-reader',username:'Synthetic Reader',email:'composer@example.test',avatarUrl:'/logo.svg',library:[],writtenBooks:[]}});
  if(path==='/api/community/circles')return route.fulfill({json:circles});if(path==='/api/community/me')return route.fulfill({json:{interests:[],badges:[],canModerate:false,canAdmin:false,joinedCircleIds:[]}});
  if(path==='/api/community/feed')return route.fulfill({json:{items:[],nextCursor:null}});if(path==='/api/notifications/unread-count')return route.fulfill({json:0});if(path==='/api/notifications/stream')return route.fulfill({contentType:'text/event-stream',body:''});return route.fulfill({json:[]})});
 await page.goto('/community?compose=1');await expect(page.getByRole('dialog',{name:'Create a post'})).toBeVisible();
}
test('invalid community publication focuses and describes each next blocking field',async({page})=>{
 await composer(page);const dialog=page.getByRole('dialog',{name:'Create a post'});const submit=dialog.getByRole('button',{name:'Publish post',exact:true});
 await submit.focus();await page.keyboard.press('Enter');if(process.env.AUDIT_PROOF_DIR){await page.screenshot({path:`${process.env.AUDIT_PROOF_DIR}/validation-${size}.png`});await writeFile(`${process.env.AUDIT_PROOF_DIR}/focus-${size}.json`,JSON.stringify(await page.evaluate(()=>({activeTag:document.activeElement?.tagName,activeLabel:document.activeElement?.getAttribute('aria-label'),activeText:document.activeElement?.textContent,description:document.activeElement?.getAttribute('aria-describedby'),invalid:document.activeElement?.getAttribute('aria-invalid')})),null,2));}
 const circle=dialog.getByRole('combobox',{name:'Circle',exact:true});await expect(circle).toBeFocused();await expect(dialog.getByRole('alert')).toContainText('Please correct');await expect(circle).toHaveAccessibleDescription('Choose a circle for your conversation.');
 const box=await circle.boundingBox();expect(box?.y).toBeGreaterThanOrEqual((await dialog.locator('header').boundingBox())!.y+(await dialog.locator('header').boundingBox())!.height);expect((box?.y||0)+(box?.height||0)).toBeLessThan(page.viewportSize()!.height);
 await circle.selectOption('circle-update');await submit.click();const body=dialog.getByRole('textbox',{name:/Your post/});await expect(body).toBeFocused();await expect(body).toHaveAccessibleDescription('Write between 1 and 5,000 characters.');await body.fill('A retained synthetic conversation.');
 await circle.selectOption('circle-questions');await submit.click();const title=dialog.getByRole('textbox',{name:'Title',exact:true});await expect(title).toBeFocused();await expect(title).toHaveAccessibleDescription('Use a title between 3 and 140 characters.');await title.fill('A synthetic poll question');
 await submit.click();const option=dialog.getByRole('textbox',{name:'Option 1',exact:true});await expect(option).toBeFocused();await expect(option).toHaveAccessibleDescription('Add 2–6 different options, each between 1 and 100 characters.');await expect(body).toHaveValue('A retained synthetic conversation.');
 await option.fill('First choice');await dialog.getByRole('textbox',{name:'Option 2',exact:true}).fill('Second choice');await dialog.getByRole('button',{name:'Recommendation',exact:true}).click();await submit.click();await expect(dialog.getByRole('searchbox',{name:'Search published stories'})).toBeFocused();await expect(dialog.getByRole('searchbox',{name:'Search published stories'})).toHaveAccessibleDescription('Choose a published story by another author.');
});

// A previously saved draft can retain a format whose circle no longer supports it.
test('unsupported recovered format is announced and focused without losing the draft',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('wordweft:form-draft:v1:composer-reader:community-post',JSON.stringify({version:1,savedAt:Date.now(),value:{circleId:'circle-update',type:'POLL',title:'A retained poll title',body:'A retained body.',pollOptions:['One','Two'],contentWarnings:[]}})));
 await composer(page);const dialog=page.getByRole('dialog',{name:'Create a post'});await dialog.getByRole('button',{name:'Publish post',exact:true}).click();
 const update=dialog.getByRole('button',{name:'Update',exact:true});await expect(update).toBeFocused();await expect(update).toHaveAccessibleDescription(/Choose a format supported by this circle/);
 await expect(dialog.getByRole('group',{name:'Post format',exact:true})).toHaveAttribute('aria-invalid','true');await expect(dialog.getByRole('textbox',{name:'Your post',exact:true})).toHaveValue('A retained body.');
 await update.click();await expect(update).toHaveAttribute('aria-pressed','true');
});
