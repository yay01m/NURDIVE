const assert=require('assert');
const {chromium}=require('C:/Users/sa1j0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
const page=await browser.newPage({serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await page.route('**/cloud-config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.RECARE_CLOUD_CONFIG={url:"",publishableKey:""};'}));
await page.addInitScript(()=>{localStorage.setItem('recare-active-user','nurse');localStorage.setItem('recare-local-accounts',JSON.stringify({nurse:{name:'Nurse'}}))});
const fits=async label=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label);
for(const width of [320,390,768,1440]){
await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:8765');await fits('Title '+width);assert(!(await page.locator('#anatomyJump').isVisible()));
assert.equal(await page.locator('.title-top #titleMyPageButton').count(),1);
await page.click('#titleMyPageButton');assert(await page.locator('[data-panel="summary"]').isVisible());await fits('My Page '+width);await page.keyboard.press('Escape');assert(!(await page.locator('#mypage').isVisible()));assert(await page.locator('#titleMyPageButton').evaluate(e=>e===document.activeElement));
await page.click('#howButton');assert(await page.locator('#howPanel').isVisible());await page.locator('.usage-notice p').last().scrollIntoViewIfNeeded();await page.keyboard.press('Escape');assert(!(await page.locator('#howPanel').isVisible()));
await page.locator('#shiftSetup>summary').click();await page.locator('.mode-card[data-length="10"]').click();assert.equal(await page.locator('.mode-card[data-length="10"]').getAttribute('aria-pressed'),'true');
await page.click('#startGame');await fits('Game '+width);if(width<761)assert(await page.locator('#anatomyJump').isVisible());
await page.evaluate(()=>{QUESTION_BANK[0].acceptedAnswerSets[0].forEach(select);submit()});await fits('Feedback '+width);assert(await page.locator('#choiceNotes').isVisible());
await page.click('#reportButton');assert(await page.locator('#reportModal').isVisible());await fits('Report '+width);await page.keyboard.press('Escape');assert(!(await page.locator('#reportModal').isVisible()));
if(width===390){await page.evaluate(()=>showTitle());await page.screenshot({path:'tmp/ui-title-final-mobile.png',fullPage:true});await page.click('#titleMyPageButton');await page.screenshot({path:'tmp/ui-mypage-final-mobile.png'})}
if(width===1440){await page.evaluate(()=>showTitle());await page.screenshot({path:'tmp/ui-title-final-desktop.png',fullPage:true})}
}
assert.deepEqual(errors,[]);console.log('PASS: 320/390/768/1440px layouts, title shortcuts, dialog Escape/focus, mode state, answering and report.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});


