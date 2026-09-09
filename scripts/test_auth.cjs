const assert=require('assert'),fs=require('fs'),vm=require('vm');
const {chromium}=require('C:/Users/sa1j0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const memory=new Map(),calls=[];let response;
 const ctx=vm.createContext({window:{RECARE_CLOUD_CONFIG:{url:'https://example.supabase.co',publishableKey:'x'.repeat(30)},addEventListener(){}},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},fetch:async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:response.ok,json:async()=>response.body}}});
 vm.runInContext(fs.readFileSync('cloud-sync.js','utf8'),ctx);
 const api=ctx.window.RECARE_CLOUD;
 response={ok:false,body:{code:'23502',message:'null display_name'}};
 await assert.rejects(api.login('newuser','1234','newuser','login'),/未登録/);assert.equal(calls.at(-1).p_display_name,null);assert.equal(memory.size,0);
 response={ok:true,body:{username:'nurse',display_name:'Nurse',session_token:'test',profile:{xp:99},is_new:false}};
 await api.login('nurse','1234','nurse','login');assert(memory.has('recare-cloud-session'));
 memory.clear();await assert.rejects(api.login('nurse','1234','Nurse','register'),/登録済み/);assert.equal(memory.size,0);
 response.body={...response.body,is_new:true};await api.login('nurse','1234','Nurse','register');assert.equal(calls.at(-1).p_display_name,'Nurse');
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:700}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.route('**/cloud-config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.RECARE_CLOUD_CONFIG={url:"",publishableKey:""};'}));
 await page.goto('http://127.0.0.1:8765');
 assert.equal(await page.locator('#authHeading').innerText(),'病棟端末にログイン');assert(!(await page.locator('#confirmPin').isVisible()));
 await page.fill('#loginName','nurse_test');await page.fill('#loginPin','1234');await page.click('.auth-submit');await page.waitForFunction(()=>document.querySelector('#authMessage').textContent.includes('未登録'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('recare-local-accounts')),null);
 await page.click('#authSwitch');assert.equal(await page.locator('#authHeading').innerText(),'新規登録');assert(await page.locator('#confirmPin').isVisible());
 await page.fill('#loginPin','1234');await page.fill('#confirmPin','4321');await page.click('.auth-submit');assert((await page.locator('#authMessage').innerText()).includes('一致しません'));
 await page.locator('.auth-card').screenshot({path:'tmp/auth-register-mobile.png'});
 await page.fill('#confirmPin','1234');await page.click('.auth-submit');await page.waitForFunction(()=>!document.querySelector('#authGate'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('recare-active-user')),'nurse_test');
 await page.evaluate(()=>{localStorage.removeItem('recare-active-user');localStorage.setItem('recare-profile-v1:nurse_test',JSON.stringify({xp:321}))});await page.reload();
 await page.fill('#loginName','nurse_test');await page.click('#authSwitch');await page.fill('#loginPin','1234');await page.fill('#confirmPin','1234');await page.click('.auth-submit');await page.waitForFunction(()=>document.querySelector('#authMessage').textContent.includes('登録済み'));
 await page.click('#authSwitch');await page.fill('#loginPin','9999');await page.click('.auth-submit');await page.waitForFunction(()=>document.querySelector('#authMessage').textContent.includes('違います'));
 await page.fill('#loginPin','1234');await page.click('.auth-submit');await page.waitForFunction(()=>!document.querySelector('#authGate'));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('recare-profile-v1:nurse_test')).xp),321);
 assert.deepEqual(errors,[]);console.log('PASS: separate views, PIN confirmation, no auto-registration, duplicate protection, existing login/profile, cloud mode requests.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
