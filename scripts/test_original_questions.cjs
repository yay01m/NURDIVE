const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/sa1j0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
 await context.addInitScript(()=>{localStorage.setItem('recare-active-user','original-test');localStorage.setItem('recare-local-accounts',JSON.stringify({'original-test':{name:'original-test'}}))});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765');
 await page.check('[name=questionSource][value=original]');
 const catalog=await page.evaluate(()=>({count:window.ORIGINAL_BANK.length,categories:window.ORIGINAL_BANK.reduce((out,q)=>(out[q.category]=(out[q.category]||0)+1,out),{})}));
 assert.equal(catalog.count,900);assert.equal(Object.keys(catalog.categories).length,9);assert(Object.values(catalog.categories).every(n=>n===100));
 assert((await page.locator('.question-source').innerText()).includes('9分野 · 900問'));
 for(const category of Object.keys(catalog.categories)){
   await page.selectOption('#premiumCategory',category);
   assert((await page.locator('#premiumCategory option:checked').innerText()).endsWith('（100問）'));
   await page.click('#startGame');
   assert.equal(await page.evaluate(()=>QUESTION_BANK.length),20);
   assert(await page.evaluate(category=>QUESTION_BANK.every(q=>q.category===category),category));
   await page.evaluate(()=>showTitle());
 }
 await page.selectOption('#premiumCategory','all');
 assert.equal(await page.locator('#startGame').isEnabled(),true);
 assert.equal(await page.locator('#examYear').isVisible(),false);
 await page.click('#startGame');
 const ids=await page.evaluate(()=>QUESTION_BANK.map(q=>q.id));assert.equal(ids.length,20);assert.equal(new Set(ids).size,20);assert(ids.every(id=>id.startsWith('ORG-')));
 for(let i=0;i<20;i++){
   const q=await page.evaluate(()=>QUESTION_BANK[state.index]);assert.equal(q.notes.length,4);assert(q.notes.every(Boolean));
   await page.locator('#choices .choice').nth(q.acceptedAnswerSets[0][0]).click();await page.click('#submitButton');
   assert.equal(await page.locator('#choiceNotes .choice-rationale').count(),4);
   assert((await page.locator('#sourceBadge').innerText()).includes('オリジナル'));
   if(i===0)await page.screenshot({path:'tmp/original-question-mobile.png',fullPage:true,animations:'disabled'});
   await page.click('#nextButton');
 }
 assert.equal(await page.evaluate(()=>state.score),20);
 await page.click('#resultHomeButton');await page.check('[name=questionSource][value=past]');
 assert.equal(await page.locator('#examYear').isEnabled(),true);await page.selectOption('#examYear','115');await page.click('#startGame');
 assert(await page.evaluate(()=>QUESTION_BANK.every(q=>q.official&&q.exam===115)));
 await page.evaluate(()=>showTitle());await page.check('[name=questionSource][value=original]');await page.selectOption('#premiumCategory','母性看護学');await page.click('#startGame');
 assert.equal(await page.evaluate(()=>QUESTION_BANK.length),20);
 for(let i=0;i<4;i++){
   const answer=await page.evaluate(()=>QUESTION_BANK[state.index].acceptedAnswerSets[0][0]);await page.locator('#choices .choice').nth((answer+1)%4).click();await page.click('#submitButton');await page.click('#nextButton');
 }
 assert.equal(await page.locator('#anatomyJump').isVisible(),false);
 await page.click('#reviewButton');
 assert.equal(await page.evaluate(()=>QUESTION_BANK.length),4);assert(await page.evaluate(()=>QUESTION_BANK.every(q=>q.id.startsWith('ORG-'))));
 let effects=0;
 for(let offset=0;offset<900;offset+=100){
   effects+=await page.evaluate(offset=>{let count=0;for(const q of window.ORIGINAL_BANK.slice(offset,offset+100)){
     QUESTION_BANK=[q];Object.assign(state,fresh());render();
     if(document.querySelectorAll('#choices .choice').length!==4)throw Error('Missing choices '+q.id);
     select((q.acceptedAnswerSets[0][0]+1)%4);submit();
     if(document.querySelectorAll('#choiceNotes .choice-rationale').length!==4)throw Error('Missing notes '+q.id);
     if(state.score!==0)throw Error('Incorrect scored correct '+q.id);
     if(q.effect.disease){
       if(state.anatomyEpisodes.length!==1)throw Error('Missing effect '+q.id);
       const spots=[...document.querySelectorAll('.avatar-stage svg.avatar .clinical-hotspot')];
       if(!spots.length||!spots.some(node=>getComputedStyle(node).animationName.includes('affectedLocationPulse')))throw Error('Missing red pulse '+q.id);
       const selectors={'sim-foot':'.sim-foot-marker','sim-thyroid':'.sim-thyroid-marker','sim-mouth':'.mouth','sim-pelvis':'.pelvis-guide'};
       for(const [key,selector] of Object.entries(selectors))if(q.effect.avatarClasses.split(' ').includes(key)&&!document.querySelector('.avatar-stage svg.avatar '+selector+'.clinical-hotspot'))throw Error('Missing location '+q.id);
       count++;
     }
     Object.assign(state,fresh());render();select(q.acceptedAnswerSets[0][0]);submit();
     if(state.score!==1)throw Error('Correct scored wrong '+q.id);
   }return count},offset);
   console.log(`Verified display/scoring ${offset+100}/900`);
 }
 assert(effects>=6);
 const pelvic=await page.evaluate(()=>{const q=window.ORIGINAL_BANK.find(q=>q.effect.avatarClasses?.includes('sim-pelvis'));if(!q)throw Error('Missing pelvic condition');QUESTION_BANK=[q];Object.assign(state,fresh());render();select((q.acceptedAnswerSets[0][0]+1)%4);submit();return getComputedStyle(document.querySelector('.avatar-stage svg.avatar .pelvis-guide')).animationName});
 assert.equal(pelvic,'affectedLocationPulse');
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.avatar-stage svg.avatar .pelvis-guide').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>showTitle());await page.screenshot({path:'tmp/original-900-mobile.png',fullPage:true,animations:'disabled'});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'tmp/original-900-desktop.png',fullPage:true,animations:'disabled'});
 assert.deepEqual(errors,[]);console.log(`PASS: 900 original questions, 3600 explanations, all-question correct/incorrect scoring, 9 category filters, 20-question session, mobile UI, source/year switching, incorrect-answer review, ${effects} simulator effects; no browser errors.`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
