const assert=require('assert');
const {chromium}=require('C:/Users/sa1j0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
await page.addInitScript(()=>{localStorage.setItem('recare-active-user','test');localStorage.setItem('recare-local-accounts',JSON.stringify({test:{name:'test'}}))});
await page.goto('http://127.0.0.1:8765');await page.click('#officialPdfLibrary summary');
assert.equal(await page.locator('#officialPdfLibrary a').count(),15);
assert(await page.evaluate(()=>[...document.querySelectorAll('#officialPdfLibrary a')].every(a=>new URL(a.href).hostname==='www.mhlw.go.jp'&&a.target==='_blank')));
const links=await page.locator('#officialPdfLibrary').innerText();await page.selectOption('#examYear','111');assert.equal(await page.locator('#officialPdfLibrary').innerText(),links);
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.locator('#officialPdfLibrary').screenshot({path:'tmp/official-pdf-library-mobile.png'});
await page.click('#startGame');assert(!(await page.locator('#officialPdfLibrary').isVisible()));
await page.evaluate(()=>{QUESTION_BANK[0].acceptedAnswerSets[0].forEach(select);submit()});assert.equal(await page.locator('#sourceBadge a').count(),0);assert.deepEqual(errors,[]);
console.log('PASS: 15 official links, independent of year settings, mobile layout, hidden during play.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
