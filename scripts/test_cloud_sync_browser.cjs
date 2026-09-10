const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/sa1j0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  const profile={xp:30,answered:2,correct:2,stats:{},bookmarks:[],achievements:[],history:[]};
  await context.addInitScript(profile=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('recare-cloud-pending:alice',JSON.stringify(profile))}},profile);
  let saves=0,expired=false;
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='127.0.0.1')return route.continue();
   if(url.pathname.endsWith('/recare_login'))return route.fulfill({json:{username:'alice',display_name:'Alice',session_token:'mock-token',profile:{...profile,answered:5},is_new:false}});
   if(url.pathname.endsWith('/recare_save')){saves++;return route.fulfill({json:!expired})}
   return route.abort();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765');await page.fill('#loginName','alice');await page.fill('#loginPin','1234');await page.click('#authForm > .auth-submit');
  const local=page.getByRole('button',{name:'この端末の記録（回答 2 問）で続ける'});
  await local.waitFor();assert.equal(saves,0);assert(await page.getByRole('button',{name:'クラウドの記録（回答 5 問）で続ける'}).isVisible());
  assert(await local.evaluate(el=>el.getBoundingClientRect().right<=innerWidth));
  await local.click();await page.waitForFunction(()=>localStorage.getItem('recare-active-user')==='alice'&&!document.querySelector('#authGate'));
  await page.waitForFunction(()=>window.RECARE_CLOUD?.status()==='saved');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('recare-profile-v1:alice')).answered),2);
  expired=true;await page.evaluate(profile=>window.RECARE_CLOUD.save(profile),profile);await page.waitForFunction(()=>window.RECARE_CLOUD.status()==='auth');
  assert.equal(await page.locator('#syncState').innerText(),'再ログインが必要');const before=saves;
  await page.evaluate(profile=>{window.RECARE_CLOUD.save(profile);window.RECARE_CLOUD.save(profile);window.RECARE_CLOUD.retry()},profile);
  await page.waitForTimeout(800);assert.equal(saves,before);assert.equal(await page.locator('.network-toast').count(),1);
  assert.deepEqual(errors,[]);console.log('PASS: mobile login conflict selection, restored local record, honest sync status, expired session request suppression');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
