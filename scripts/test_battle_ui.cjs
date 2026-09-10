const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('C:/Users/sa1j0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});fs.mkdirSync('tmp/battle-ui-v81',{recursive:true});const errors=[],reports=[];try{
 const context=await browser.newContext({serviceWorkers:'block'});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await context.addInitScript(()=>{localStorage.setItem('recare-active-user','battle-ui');localStorage.setItem('recare-local-accounts',JSON.stringify({'battle-ui':{name:'Nurse'}}));localStorage.removeItem('recare-battle-room')});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const fits=async(label)=>assert(await page.locator('#battleScreen').evaluate(e=>e.scrollWidth<=e.clientWidth),label);
 async function capture(name,width){await fits(name+' '+width);if([390,1440].includes(width)){await page.locator('#battleScreen').evaluate(e=>e.scrollTop=0);await page.screenshot({path:`tmp/battle-ui-v81/${name}-${width}.png`})}}
 for(const width of [320,375,390,430,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:8765');
  await page.evaluate(()=>{
   const q=fullBank.find(q=>q.acceptedAnswerSets[0].length===1&&q.choices.length===4&&q.question.length<100);
   window.testQuestion=q;window.testBattle={room_code:'123456',host_username:'battle-ui',phase:'lobby',match_kind:'random',round_index:0,question_id:q.id,max_players:4,players:['battle-ui','友達A','友達B','長い名前のプレイヤー'].map((username,i)=>({username,display_name:username==='battle-ui'?'あなたの名前':username,correct_count:0,total_time_ms:0,rank:i+1}))};
   window.RECARE_CLOUD={enabled:()=>true,session:()=>({username:'battle-ui'}),battle:async(action,args)=>{if(action==='answer'){testBattle.phase='review';testBattle.own_answer={correct:true,selection:args.p_selection};testBattle.correct_answers=testQuestion.acceptedAnswerSets;testBattle.review_until=new Date(Date.now()+60000).toISOString()}return {...testBattle,server_now:new Date().toISOString()}}};
  });
  await page.click('#openBattleButton');await capture('entry',width);
  await page.click('.battle-rules summary');await fits('rules');await page.click('.battle-rules summary');
  await page.click('[data-battle=match]');await page.waitForSelector('#battleMatchTimer');await capture('random-lobby',width);
  await page.click('[data-battle=cancel]');await page.waitForSelector('#battleJoinForm');
  await page.evaluate(()=>{testBattle.match_kind='private'});await page.click('[data-battle=create]');await page.waitForSelector('.battle-code');await capture('friend-lobby',width);
  await page.evaluate(()=>{testBattle.phase='question';testBattle.deadline_at=new Date(Date.now()+150000).toISOString()});await page.waitForSelector('[data-battle-choice]');await capture('question',width);
  const answer=await page.evaluate(()=>testQuestion.acceptedAnswerSets[0][0]);await page.locator(`[data-battle-choice="${answer}"]`).click();assert.equal(await page.locator(`[data-battle-choice="${answer}"]`).getAttribute('aria-pressed'),'true');
  await page.click('[data-battle=answer]');await page.waitForSelector('.battle-review');await page.click('.battle-review summary');await capture('review',width);assert.equal(await page.locator('.battle-option-state').count(),4);
  await page.evaluate(()=>{testBattle.phase='finished';testBattle.players.forEach((p,i)=>{p.correct_count=10-i;p.total_time_ms=20000+i*1000});testBattle.result={winner_username:'battle-ui'};testBattle.reviews=[{question_id:testQuestion.id,round_index:0,correct:true,selection:testQuestion.acceptedAnswerSets[0],correct_answers:testQuestion.acceptedAnswerSets}]});
  await page.waitForSelector('.battle-result');await capture('result',width);assert(await page.locator('[data-battle=new]').evaluate(e=>e.getBoundingClientRect().top<document.querySelector('.battle-history').getBoundingClientRect().top));
  await page.click('.battle-history summary');await fits('history '+width);
  await page.click('[data-battle=new]');assert(await page.locator('#battleJoinForm').isVisible());await page.click('[data-battle=exit]');assert(await page.locator('#titleScreen').isVisible());reports.push(`${width}px: entry, rules, random matching/cancel, friend lobby, question, answer, review, result, replay pass`);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('tmp/battle-ui-v81/verification.txt',reports.join('\n')+'\nJS errors: 0');console.log(reports.join('\n'));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
