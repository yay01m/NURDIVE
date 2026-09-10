const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/sa1j0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.route('**/cloud-config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.RECARE_CLOUD_CONFIG={url:"",publishableKey:""};'}));
  await page.addInitScript(()=>{localStorage.setItem('recare-active-user','nurse');localStorage.setItem('recare-local-accounts',JSON.stringify({nurse:{name:'Nurse'}}));localStorage.setItem('recare-profile-v1:nurse',JSON.stringify({xp:0,answered:0,correct:0,stats:{},bookmarks:[],achievements:[],dailyStreak:3,dailyLastDate:'2026-01-01'}))});
  await page.goto('http://127.0.0.1:8765');
  await page.evaluate(()=>{window.RECARE_CLOUD.enabled=()=>true;window.RECARE_CLOUD.leaderboard=async()=>[];window.RECARE_CLOUD.challengeLeaderboard=async()=>[];window.RECARE_CLOUD.save=()=>{}});
  await page.click('#titleRankingButton');await page.click('[data-rank="daily"]');
  assert.match(await page.locator('#rankingPersonal').innerText(),/3日/);
  assert.match(await page.locator('#rankingList').innerText(),/まだランキング対象/);
  await page.click('[data-rank="required"]');await page.click('#rankingPlay');
  assert.equal(await page.locator('#mypage').isVisible(),false);
  for(let i=0;i<2;i++){
   await page.evaluate(()=>{QUESTION_BANK[state.index].acceptedAnswerSets[0].forEach(select);submit()});
   if(i===0)await page.evaluate(()=>next());
  }
  let p=await page.evaluate(()=>JSON.parse(localStorage.getItem('recare-profile-v1:nurse')));
  assert.equal(p.requiredAnswered,2);assert.equal(p.requiredCorrect,2);assert.equal(p.dailyStreak,3);
  await page.evaluate(()=>showTitle());await page.click('#titleRankingButton');await page.click('[data-rank="required"]');
  assert.match(await page.locator('#rankingPersonal').innerText(),/100%/);assert.match(await page.locator('#rankingPersonal').innerText(),/2問回答/);
  await page.evaluate(()=>{window.RECARE_CLOUD.challengeLeaderboard=kind=>new Promise(resolve=>{window['resolve_'+kind]=resolve})});
  await page.click('[data-rank="daily"]');await page.click('[data-rank="required"]');
  await page.evaluate(()=>window.resolve_required([{rank:1,username:'sample',display_name:'必修の記録',score:80,detail:10}]));
  await page.waitForFunction(()=>document.querySelector('#rankingList').textContent.includes('必修の記録'));
  await page.evaluate(()=>window.resolve_daily([{rank:1,username:'sample',display_name:'古いデイリー',score:9,detail:0}]));
  assert.match(await page.locator('#rankingList').innerText(),/必修の記録/);assert.doesNotMatch(await page.locator('#rankingList').innerText(),/古いデイリー/);
  await page.evaluate(()=>{window.RECARE_CLOUD.challengeLeaderboard=async()=>{throw new Error('test failure')}});
  await page.click('[data-rank="daily"]');await page.locator('#rankingRetry').waitFor();
  assert.match(await page.locator('#rankingPersonal').innerText(),/3日/);
  await page.evaluate(()=>{window.RECARE_CLOUD.challengeLeaderboard=async()=>[{rank:1,username:'sample',display_name:'デイリーの記録',score:4,detail:0}]});
  await page.click('#rankingRetry');await page.waitForFunction(()=>document.querySelector('#rankingList').textContent.includes('デイリーの記録'));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.click('#rankingPlay');assert.equal(await page.evaluate(()=>QUESTION_BANK.length),1);
  await page.evaluate(()=>{QUESTION_BANK[state.index].acceptedAnswerSets[0].forEach(select);submit()});
  p=await page.evaluate(()=>JSON.parse(localStorage.getItem('recare-profile-v1:nurse')));assert.equal(p.dailyStreak,1);assert.equal(p.requiredAnswered,2);
  await page.evaluate(()=>{document.querySelector('#bookmarkButton').click()});
  p=await page.evaluate(()=>JSON.parse(localStorage.getItem('recare-profile-v1:nurse')));assert.equal(p.dailyStreak,1);assert.equal(p.requiredAnswered,2);
  assert.deepEqual(errors,[]);console.log('PASS: empty/populated daily and required rankings, personal records, challenge launch, cumulative saving, stale responses, retry, mobile width.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
