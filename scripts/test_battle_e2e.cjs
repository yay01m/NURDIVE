const fs=require('fs'),assert=require('assert');
const {PGlite}=require('../tmp/battle-sql-runtime/node_modules/@electric-sql/pglite');
const {chromium}=require('C:/Users/sa1j0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const db=new PGlite(),tokens={alice:'00000000-0000-0000-0000-000000000001',bob:'00000000-0000-0000-0000-000000000002'};
 await db.exec("create role anon;create role authenticated;create table public.recare_users(username text primary key,display_name text,session_token uuid,token_expires_at timestamptz);");
 for(const [name,token] of Object.entries(tokens))await db.query('insert into recare_users values($1,$1,$2,now()+interval \'1 day\')',[name,token]);
 await db.exec(fs.readFileSync('setup/battle-setup.sql','utf8'));await db.exec(fs.readFileSync('setup/battle-question-seed.sql','utf8'));
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),errors=[],offline=new Set();
 try{
 const pages={};
 for(const name of ['alice','bob']){
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:name==='alice'?390:1280,height:844}});
  await context.addInitScript(({name,token})=>{localStorage.setItem('recare-active-user',name);localStorage.setItem('recare-local-accounts',JSON.stringify({[name]:{name}}));localStorage.setItem('recare-cloud-session',JSON.stringify({username:name,displayName:name,token}));},{name,token:tokens[name]});
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.hostname==='127.0.0.1'){await route.continue();return}
   const match=url.pathname.match(/^\/rest\/v1\/rpc\/recare_battle_(create|join|state|start|answer|leave)$/);
   if(!match){await route.abort();return}
   if(offline.has(name)){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'test offline'})});return}
   const body=req.postDataJSON(),action=match[1],args=[body.p_username,body.p_session_token];
   if(!['create'].includes(action))args.push(body.p_room_code);
   if(action==='answer')args.push(body.p_round_index,body.p_selection);
   try{const result=await db.query(`select public.recare_battle_${action}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args);await route.fulfill({contentType:'application/json',body:JSON.stringify(result.rows[0].value)})}catch(error){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:error.message})})}
  });
  const page=pages[name]=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));await page.goto('http://127.0.0.1:8765');await page.click('#openBattleButton');
 }
 const a=pages.alice,b=pages.bob;
 // Reproduce an older cloud bundle remaining in the browser during an update.
 await a.evaluate(()=>{delete window.RECARE_CLOUD.battle});
 await a.click('[data-battle="create"]');await a.waitForSelector('.battle-code');const code=(await a.locator('.battle-code').innerText()).trim();
 assert.equal(await a.evaluate(()=>typeof window.RECARE_CLOUD.battle),'function');
 await b.fill('#battleRoomCode',code);await b.click('#battleJoinForm button');await a.waitForFunction(()=>!document.querySelector('[data-battle="start"]').disabled);
 await a.screenshot({path:'tmp/battle-lobby-mobile.png',fullPage:true});await a.click('[data-battle="start"]');
 for(let round=0;round<10;round++){
  if(round>0){await db.query("update recare_battle_rooms set review_until=clock_timestamp()-interval '1 second' where code=$1",[code]);await a.waitForFunction(round=>document.querySelector('.battle-round')?.textContent.includes(`第 ${round+1} 問`),round);}
  await db.query("update recare_battle_rooms set round_started_at=clock_timestamp()-interval '1 second',deadline_at=clock_timestamp()+interval '119 seconds' where code=$1",[code]);
  await Promise.all([a,b].map(p=>p.waitForSelector('[data-battle-choice]:not([disabled])')));
  assert.equal(await a.locator('.battle-question').innerText(),await b.locator('.battle-question').innerText());
  const row=(await db.query('select q.* from recare_battle_rooms r join recare_battle_questions q on q.id=r.question_ids[r.round_index+1] where r.code=$1',[code])).rows[0];const correct=row.answer_sets[0];
  if(round===0){await a.locator('[data-battle-choice]').first().click();offline.add('alice');await a.waitForFunction(()=>document.querySelector('#battleNotice').textContent.includes('通信を確認'));offline.delete('alice');await a.waitForFunction(()=>document.querySelector('#battleNotice').textContent.includes('再接続'));assert.equal(await a.locator('[data-battle-choice="0"]').getAttribute('aria-pressed'),'true');await a.reload();await a.click('#openBattleButton');await a.waitForSelector('[data-battle-choice]:not([disabled])');}
  for(const i of correct)await a.click(`[data-battle-choice="${i}"]`);
  await a.click('[data-battle="answer"]');await a.waitForFunction(()=>document.querySelector('.battle-answer')?.textContent.includes('回答済み'));
  if(round===1){await a.reload();await a.click('#openBattleButton');await a.waitForFunction(()=>document.querySelector('.battle-answer')?.textContent.includes('回答済み'));assert(await a.locator('[data-battle="answer"]').isDisabled());}
  let selection=correct;
  if(round===0){selection=[...correct];selection[0]=Array.from({length:row.choice_count},(_,i)=>i).find(i=>!correct.includes(i));}
  for(const i of selection)await b.click(`[data-battle-choice="${i}"]`);
  await b.click('[data-battle="answer"]');await Promise.all([a,b].map(p=>p.waitForSelector('.battle-review')));
  if(round===0){await a.screenshot({path:'tmp/battle-review-mobile.png',fullPage:true});assert(await a.locator('#battleScreen').evaluate(e=>e.scrollWidth<=e.clientWidth));}
 }
 await db.query("update recare_battle_rooms set review_until=clock_timestamp()-interval '1 second' where code=$1",[code]);await Promise.all([a,b].map(p=>p.waitForSelector('.battle-result')));
 assert((await a.locator('.battle-result>h2').innerText()).includes('あなたの勝ち'));assert((await b.locator('.battle-result>h2').innerText()).includes('相手の勝ち'));assert.equal(await a.locator('.battle-history>details').count(),10);
 await a.screenshot({path:'tmp/battle-result-mobile.png',fullPage:true});assert.equal(await a.evaluate(()=>state.score),0);assert.deepEqual(errors,[]);
 await a.click('[data-battle="exit"]');assert(await a.locator('#titleScreen').isVisible());console.log('PASS: two browser clients, real SQL, shared ten questions, score/result, reveal, reconnect before/after answer, 10 review entries, no solo-state contamination.');
 }finally{await browser.close();await db.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
