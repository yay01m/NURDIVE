const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const questions=read('data/additional_questions.json');
const records=read('data/additional_choice_explanations.json');
const report=read('data/additional_choice_explanation_report.json');
const ids=new Set(records.map(r=>r.id));
assert.equal(ids.size,records.length,'Duplicate output ID');
assert.equal(report.processed,records.length);
assert.equal(report.input,questions.length);
assert.equal(report.missing,questions.filter(q=>!ids.has(q.id)).length);
if(process.argv.includes('--complete')){
 assert.equal(report.missing,0,'Unprocessed questions remain');
 assert.equal(report.drafted,questions.length,'Draft coverage incomplete');
 assert.deepEqual([...ids].sort(),questions.map(q=>q.id).sort(),'Coverage must match every adopted additional question');
}
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data/questions.json'))).digest('hex'),'1d4c906d807332123f14935d809048240e689919db065285af29ecf341ffb0ae','Original 2026 input changed');
const byId=new Map(questions.map(q=>[q.id,q]));
for(const r of records){
 const q=byId.get(r.id);assert(q);
 assert.equal(r.choice_explanations.length,q.choices.length,r.id);
 r.choice_explanations.forEach((c,i)=>{
  assert.equal(c.choice,i+1);assert.equal(c.title,q.choices[i]);
  assert.equal(c.correct,q.correct_answers.includes(i+1),r.id);
  assert(c.explanation.trim()&&[...c.explanation].length<=200,r.id);
 });
 if(r.status==='UNKNOWN')assert(r.review_reason.trim(),r.id);
}
const context=vm.createContext({window:{}});
for(const name of ['official-questions.js','official-bank.js','explanations.js','additional-explanations.js','explanation-bank.js'])
 vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
context.expectedIds=[...ids];
context.expectedCount=records.length;
vm.runInContext(`
 const added=QUESTION_BANK.filter(q=>expectedIds.includes(q.id));
 if(added.length!==expectedCount)throw Error('Published question missing');
 for(const q of added){
  if(!q.hasExplanation||q.notes.length!==q.choices.length||q.notes.some(n=>!n.trim()))throw Error(q.id+' missing notes');
 }
 const original=window.OFFICIAL_QUESTIONS.find(q=>q.id===expectedIds[0]);
 if(!matchingExplanation(original))throw Error('Valid new entry rejected');
 for(const field of ['question','choices','correct_answers','accepted_answer_sets','case_text','preceding_context']){
  const changed=JSON.parse(JSON.stringify(original));changed[field]='modified';
  if(matchingExplanation(changed))throw Error('Stale explanation accepted: '+field);
 }
 if(QUESTION_BANK.length!==1125)throw Error('Question pool changed');
`,context);
console.log(JSON.stringify({structural_checks:'PASS',published:records.length,remaining:report.missing,original_2026_input:'unchanged'}));
