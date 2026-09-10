const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/sa1j0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}}),calls=[];
 const profile={xp:0,answered:0,correct:0,stats:{},bookmarks:[],achievements:[],history:[]};
 await context.route('**/*',async r=>{
  const url=new URL(r.request().url());if(url.hostname==='127.0.0.1')return r.continue();
  if(url.pathname.includes('/rest/v1/rpc/')){
   calls.push({name:url.pathname.split('/').pop(),body:r.request().postDataJSON()});
   if(url.pathname.endsWith('/recare_login'))return r.fulfill({json:{username:'secure_user',display_name:'secure_user',session_token:'mock-token',is_new:true,is_admin:false,profile}});
   if(url.pathname.endsWith('/recare_logout'))return r.fulfill({json:true});
   return r.fulfill({json:true});
  }
  return r.abort();
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765');await page.click('#authSwitch');await page.fill('#loginName','secure_user');await page.fill('#loginPin','123');await page.fill('#confirmPin','123');await page.click('#authForm > .auth-submit');
 assert.equal(calls.length,0);assert((await page.locator('#authMessage').innerText()).includes('4桁'));
 await page.fill('#loginPin','4826');await page.fill('#confirmPin','4826');await page.click('#authForm > .auth-submit');await page.waitForFunction(()=>document.querySelector('#titleMyPageButton'));
 assert.equal(calls[0].body.p_pin,'4826');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('recare-local-accounts')).secure_user.hash),undefined);
 await page.click('#titleMyPageButton');assert.equal(await page.locator('[data-page="admin"]').count(),0);
 await page.click('[data-page="account"]');await page.fill('#newPin','123');await page.click('#accountForm button[type="submit"]');assert.equal(await page.locator('#newPin').evaluate(el=>el.checkValidity()),false);
 await page.evaluate(()=>{const s=document.createElement('script');s.textContent='window.__securityInjected=true';document.head.appendChild(s)});
 assert.equal(await page.evaluate(()=>window.__securityInjected),undefined);
 await page.click('#mypageLogout');await page.waitForFunction(()=>document.querySelector('#authGate'));
 assert(calls.some(c=>c.name==='recare_logout'));assert.equal(await page.evaluate(()=>localStorage.getItem('recare-cloud-session')),null);
 assert.deepEqual(errors,[]);console.log('PASS: password minimums, no local cloud password hash, admin UI restriction, CSP inline-script blocking, server logout');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
