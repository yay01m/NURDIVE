const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('C:/Users/sa1j0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const errors=[],report=[];fs.mkdirSync('tmp/ui-v76',{recursive:true});
 try{
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await context.route('**/cloud-config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.RECARE_CLOUD_CONFIG={url:"",publishableKey:""};'}));
 await context.addInitScript(()=>{localStorage.setItem('recare-active-user','ui-review');localStorage.setItem('recare-local-accounts',JSON.stringify({'ui-review':{name:'UI Review'}}))});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const fits=async label=>{const bad=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length&&!e.closest('.title-visual,.title-glow,.title-grid,.avatar-stage')&&getComputedStyle(e).position!=='fixed').filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.left<-.5||r.right>innerWidth+.5)}).slice(0,12).map(e=>`${e.tagName}.${e.className}:${Math.round(e.getBoundingClientRect().width)}`));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${label}: ${bad}`);};
 async function answer(correct){
   const indices=await page.evaluate(correct=>{const q=QUESTION_BANK[state.index],set=[...q.acceptedAnswerSets[0]];if(!correct)set[0]=q.choices.findIndex((_,i)=>!set.includes(i));return set},correct);
   for(const index of indices)await page.locator('#choices .choice').nth(index).click();
   await page.click('#submitButton');await page.waitForTimeout(100);
 }
 for(const width of [320,375,390,430,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:8765');await fits('title '+width);
  assert.equal(await page.locator('#shiftSetup').getAttribute('open'),null);
  if([390,1440].includes(width))await page.screenshot({path:`tmp/ui-v76/title-${width}.png`,fullPage:true});
  await page.click('#shiftSetup>summary');await page.click('.mode-card[data-length="10"]');await fits('settings '+width);
  assert.equal(await page.locator('.mode-card[data-length="10"]').getAttribute('aria-pressed'),'true');
  if(width===390)await page.screenshot({path:'tmp/ui-v76/settings-390.png',fullPage:true});
  await page.click('#startGame');await fits('question '+width);
  if([390,1440].includes(width))await page.screenshot({path:`tmp/ui-v76/question-${width}.png`,fullPage:true});
  // Keyboard activation must submit once, not both submit and advance.
  await answer(true);assert.equal(await page.evaluate(()=>state.index),0);assert.equal(await page.evaluate(()=>state.score),1);
  assert.equal(await page.locator('#choices .choice-state').count(),await page.locator('#choices .choice').count());
  await fits('correct '+width);assert(await page.locator('#choiceNotes').isVisible());
  if(width===390)await page.screenshot({path:'tmp/ui-v76/explanation-390.png',fullPage:true});
  await page.click('.trust-link');assert(await page.locator('#howPanel').isVisible());await fits('notice '+width);await page.keyboard.press('Escape');assert(!(await page.locator('#howPanel').isVisible()));
  await page.click('#reportButton');await fits('report '+width);await page.keyboard.press('Escape');
  await page.click('#nextButton');await answer(false);await fits('incorrect '+width);
  for(let i=2;i<10;i++){await page.click('#nextButton');await answer(true)}
  await page.click('#nextButton');await page.waitForTimeout(50);assert(await page.locator('#resultModal').isVisible());assert.equal(await page.locator('#resultAccuracy').innerText(),'90%');assert.equal(await page.locator('#resultStreak').innerText(),'8問');await fits('result '+width);
  if([390,1440].includes(width))await page.screenshot({path:`tmp/ui-v76/result-${width}.png`});
  await page.click('#reviewButton');assert.equal(await page.evaluate(()=>QUESTION_BANK.length),1);await answer(true);await page.click('#nextButton');assert(await page.locator('#resultModal').isVisible());await page.click('#resultHomeButton');
  await page.click('#titleMyPageButton');await fits('mypage '+width);
  for(const panel of ['history','ranking','account','summary']){await page.click(`[data-page="${panel}"]`);await fits(panel+' '+width)}
  if(width===390)await page.screenshot({path:'tmp/ui-v76/mypage-390.png'});
  await page.keyboard.press('Escape');await page.click('#openBattleButton');await fits('battle '+width);
  if(width===390)await page.screenshot({path:'tmp/ui-v76/battle-390.png'});
  report.push(`${width}px: title/settings/question/correct/incorrect/notice/report/result/review/profile/battle pass`);
 }
 await page.goto('http://127.0.0.1:8765');await page.setViewportSize({width:390,height:844});await page.click('#startGame');
 await page.locator('#choices .choice').first().focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>state.answered),false);await page.locator('#submitButton').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>state.index),0);assert.equal(await page.evaluate(()=>state.answered),true);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.title-glow').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.evaluate(()=>{document.querySelector('#question').textContent='長い状況設定問題の表示を確認します。'.repeat(60);document.querySelector('#choices .choice>span:last-child').append('長い選択肢の内容。'.repeat(100))});await fits('long copy');
 // Fresh authentication screen, no account operations or remote writes.
 const freshContext=await browser.newContext({serviceWorkers:'block'});await freshContext.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const fresh=await freshContext.newPage();await fresh.goto('http://127.0.0.1:8765');await fresh.setViewportSize({width:320,height:700});assert(await fresh.locator('#authGate').isVisible());assert(await fresh.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await fresh.screenshot({path:'tmp/ui-v76/auth-320.png',fullPage:true});
 assert.deepEqual(errors,[]);report.push('Keyboard Enter, long content, reduced motion, 320px authentication: pass; JS errors: 0');fs.writeFileSync('tmp/ui-v76/verification.txt',report.join('\n'));console.log(report.join('\n'));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

