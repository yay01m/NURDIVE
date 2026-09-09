const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const ctx=vm.createContext({window:{}});
for(const f of ['official-questions.js','official-bank.js'])vm.runInContext(read(f),ctx);
const before=vm.runInContext('JSON.stringify(QUESTION_BANK.map(q=>[q.id,q.question,q.choices,q.acceptedAnswerSets]))',ctx);
vm.runInContext(read('disease-simulator.js'),ctx);
assert.equal(vm.runInContext('JSON.stringify(QUESTION_BANK.map(q=>[q.id,q.question,q.choices,q.acceptedAnswerSets]))',ctx),before);
vm.runInContext(`
if(QUESTION_BANK.length!==228)throw Error('Unexpected bank');
for(const q of QUESTION_BANK){
 if(!['effect','none'].includes(q.simulatorStatus))throw Error('Missing decision '+q.id);
 if(q.effect.disease!==(q.simulatorStatus==='effect'))throw Error('Invalid effect '+q.id);
}
`,ctx);
// A modified question cannot silently reuse its previous mapping.
vm.runInContext("QUESTION_BANK.find(q=>q.id==='115-AM-004').question+=' changed'",ctx);
vm.runInContext(read('disease-simulator.js'),ctx);
assert.equal(vm.runInContext("QUESTION_BANK.find(q=>q.id==='115-AM-004').effect.disease",ctx),false);
for(const f of ['app.js','improvements.js','disease-simulator.js','projection.js','sw.js'])new vm.Script(read(f));
const {chromium}=require('C:/Users/sa1j0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const c=await browser.newContext();
 await c.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8765');
 const result=await p.evaluate(()=>{
  const check=(value,msg)=>{if(!value)throw Error(msg)};
  let effects=0,none=0;
  const wrong=()=>{const q=QUESTION_BANK[state.index];const set=q.acceptedAnswerSets[0];let chosen=q.choices.map((_,i)=>i).slice(0,set.length);if(isCorrectAnswer(q,chosen)){chosen=[...set];chosen[0]=q.choices.findIndex((_,i)=>!set.includes(i))}for(const i of chosen)select(i);submit()};
  for(const q of fullBank){
   QUESTION_BANK=Array(20).fill(q);reset();wrong();
   check(state.review.length===1,'Wrong not counted '+q.id);
   check(state.anatomyEpisodes.length===(q.effect.disease?1:0),'Episode '+q.id);
   if(q.effect.disease){effects++;check(el.avatarCallout.textContent.includes(q.effect.name),'Name '+q.id);check(q.effect.avatarClasses.split(' ').every(v=>el.avatarStage.classList.contains(v)),'Class '+q.id)}
   else{none++;check(el.avatarStage.classList.contains('projection-overlap'),'Missing boundary '+q.id);check(!el.avatarStage.className.includes('affected-'),'False illness '+q.id);check(projectionState().boundary===1,'Boundary count '+q.id)}
  }
  const get=id=>fullBank.find(q=>q.id===id);
  QUESTION_BANK=[get('115-AM-004'),get('115-AM-001'),get('115-AM-103'),...Array(17).fill(get('115-AM-001'))];reset();wrong();next();wrong();
  check(state.anatomyEpisodes.length===1&&el.avatarStage.classList.contains('sim-stiffness'),'None overwrote previous effect');
  next();wrong();check(state.anatomyEpisodes.length===2,'Cumulative');
  next();wrong();check(mistakeLimitReached()&&state.review.length===4,'20% rule');
  check(el.modal.hidden,'Explanation dismissed');next();check(!el.modal.hidden,'Did not end');
  reset();check(state.anatomyEpisodes.length===0&&el.avatarStage.className==='avatar-stage','Reset');
  // Correct answers never trigger symptoms.
  QUESTION_BANK=Array(20).fill(get('115-AM-004'));reset();select(QUESTION_BANK[0].acceptedAnswerSets[0][0]);submit();
  check(state.anatomyEpisodes.length===0,'Correct answer effect');
  return {input:fullBank.length,effects,no_effect:none,missing:0};
 });
 assert.deepEqual(errors,[]);console.log('PASS',result);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
