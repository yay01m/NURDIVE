const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const context=vm.createContext({window:{}});
for(const name of ['official-questions.js','official-bank.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context);
vm.runInContext(`for(const q of QUESTION_BANK){for(const set of q.acceptedAnswerSets){if(!isCorrectAnswer(q,set))throw Error(q.id);if(isCorrectAnswer(q,[]))throw Error('empty');if(isCorrectAnswer(q,[999]))throw Error('bounds');if(set.length>1&&isCorrectAnswer(q,set.slice(1)))throw Error('partial');}}const alt=QUESTION_BANK.find(q=>q.id==='115-AM-080');if(!isCorrectAnswer(alt,3)||!isCorrectAnswer(alt,4)||isCorrectAnswer(alt,[3,4]))throw Error('alternate answers');`,context);
for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(root,name),'utf8'),{filename:name});
const {chromium}=require('C:/Users/sa1j0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const ctx=await browser.newContext();
 await ctx.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await ctx.addInitScript(()=>{localStorage.setItem('recare-active-user','test');localStorage.setItem('recare-local-accounts',JSON.stringify({test:{name:'test'}}));localStorage.setItem('recare-profile-v1:test',JSON.stringify({xp:0,answered:0,correct:0,stats:{},bookmarks:[],achievements:[],history:[{id:'old-original',category:'旧分類',question:'旧問題'}]}))});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765');
 await page.locator('#shiftSetup').evaluate(e=>e.open=true);await page.waitForSelector('#premiumCategory');
 let dailyId;
 assert.equal(await page.locator('.premium-setup #startDailyChallenge').count(),0);
 for(const exam of ['111','114','115']){
   await page.selectOption('#examYear',exam);await page.selectOption('#premiumCategory',exam==='114'?'required':'all');
   await page.click('#startDailyChallenge');
   const ids=await page.evaluate(()=>QUESTION_BANK.map(q=>q.id));assert.equal(ids.length,1);if(dailyId)assert.equal(ids[0],dailyId);dailyId=ids[0];
   await page.evaluate(()=>showTitle());
 }
 await page.selectOption('#examYear','all');await page.selectOption('#premiumCategory','all');
 await page.evaluate(()=>{
   for(const q of fullBank){
     const holder=document.createElement('div');holder.innerHTML=explanationReferences(q);
     if(holder.querySelector('a'))throw Error('Reference link remains: '+q.id);
   }
   QUESTION_BANK=[fullBank.find(q=>q.exam===115&&q.hasExplanation)];reset();
   QUESTION_BANK[0].acceptedAnswerSets[0].forEach(select);submit();
   if(el.sourceBadge.querySelector('a'))throw Error('Exam PDF after submission');
   showTitle();
 });
 const counts=await page.evaluate(()=>({total:fullBank.length,required:window.REQUIRED_BANK.length,categories:[...new Set(fullBank.map(q=>q.category))]}));assert.equal(counts.total,1125);
 for(const [exam,count] of [['111',224],['112',227],['113',221],['114',225],['115',228]]){
   await page.selectOption('#examYear',exam);
   assert.equal(await page.evaluate(()=>window.recareExamPool(fullBank).length),count);
   if(process.argv.includes('--complete')){
     const banner=await page.locator('#yearPublicationNote').innerText();
     assert(banner.includes(`${count}問中${count}問`),'Year banner must show complete explanation coverage');
     assert(await page.evaluate(()=>window.recareExamPool(fullBank).every(q=>q.hasExplanation&&q.notes.length===q.choices.length&&q.notes.every(n=>n.trim()))),'Year contains incomplete explanations');
   }
   await page.click('#startGame');
   assert(await page.evaluate(exam=>QUESTION_BANK.every(q=>String(q.exam)===exam),exam));
   assert.equal(await page.evaluate(()=>el.sourceBadge.querySelectorAll('a').length),0);
   if(exam!=='115'){
     const pending=await page.evaluate(()=>{QUESTION_BANK[0].acceptedAnswerSets[0].forEach(select);submit();return {score:state.score,answersOnly:QUESTION_BANK[0].answersOnly,explanation:QUESTION_BANK[0].explanation,simulator:QUESTION_BANK[0].simulatorStatus,hasExplanation:QUESTION_BANK[0].hasExplanation,notes:QUESTION_BANK[0].notes}});
     assert.equal(pending.score,1);assert(pending.answersOnly);if(pending.hasExplanation){assert(pending.notes.every(n=>n.trim()));assert.equal(await page.evaluate(()=>el.detailBox.querySelector('summary').textContent),'選択肢ごとの解説');}else{assert(pending.explanation.includes('準備中'));}assert(['effect','none'].includes(pending.simulator));
   }
   await page.evaluate(()=>showTitle());
 }
 for(const exam of ['111','112','113','114']){
   await page.selectOption('#examYear',exam);
   const categories=await page.locator('#premiumCategory option').evaluateAll(options=>options.map(o=>o.value).filter(v=>!['all','required'].includes(v)));
   assert.equal(categories.length,11);assert(!categories.includes('分類準備中'));
   for(const category of categories){
     await page.selectOption('#premiumCategory',category);await page.click('#startGame');
     assert(await page.evaluate(({exam,category})=>QUESTION_BANK.length>0&&QUESTION_BANK.every(q=>String(q.exam)===exam&&q.category===category),{exam,category}));
     await page.evaluate(()=>showTitle());
   }
 }
 await page.selectOption('#examYear','all');await page.selectOption('#premiumCategory','all');
 await page.click('#startGame');
 const result=await page.evaluate(()=>{
   const multi=fullBank.find(q=>q.acceptedAnswerSets[0].length>1);QUESTION_BANK=[multi];reset();
   select(multi.acceptedAnswerSets[0][0]);submit();if(state.answered||!el.submit.disabled)throw Error('partial submission allowed');
   multi.acceptedAnswerSets[0].slice(1).forEach(select);submit();if(state.score!==1)throw Error('multi scoring');
   const history=JSON.parse(localStorage.getItem('recare-profile-v1:test')).history[0];if(!history.correct||history.selected.includes('undefined'))throw Error('multi history');
   QUESTION_BANK=[fullBank.find(q=>q.id==='115-AM-080')];reset();select(4);submit();if(state.score!==1)throw Error('alternative scoring');
   QUESTION_BANK=[fullBank[0]];reset();const wrong=QUESTION_BANK[0].choices.findIndex((_,i)=>!isCorrectOption(QUESTION_BANK[0],i));select(wrong);submit();if(state.score!==0||state.review.length!==1)throw Error('wrong scoring');
   return {multi:multi.id,sourceLinks:el.sourceBadge.querySelectorAll('a').length};
 });assert.equal(result.sourceLinks,0);
 await page.click('#endShiftButton');
 // Exercise required pool through the actual selector and start control.
 await page.evaluate(()=>showTitle());await page.selectOption('#premiumCategory','required');await page.click('#startGame');
 assert(await page.evaluate(()=>QUESTION_BANK.every(q=>q.questionType==='必修問題')));
 await page.click('#accountMenuButton');await page.click('[data-page="history"]');assert(!(await page.locator('[data-panel="history"]').innerText()).includes('旧問題'));
 await page.click('#mypageClose');await page.evaluate(()=>showTitle());await page.screenshot({path:path.join(root,'data/work/qa/official-game-title.png'),fullPage:true});
 await page.click('#startGame');await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'data/work/qa/official-game-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,...counts,...result,browserErrors:errors},null,2));
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

