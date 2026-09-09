const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const input=read('data/explanation_inputs.json'),output=read('data/explanations.json'),questions=read('data/questions.json');
assert.equal(input.length,228);assert.equal(Object.keys(output).length,228);
for(let i=0;i<input.length;i++){
 const q=questions[i],e=output[q.id];assert.deepEqual(input[i].official_answer,q.correct_answers);
 assert.equal(input[i].question,q.question);assert.deepEqual(input[i].choices,q.choices);
 assert.deepEqual(Object.keys(e).sort(),['explanation','key_point','needs_review']);
 assert(e.explanation.trim()&&[...e.explanation].length<=150);
 assert(e.key_point.trim()&&[...e.key_point].length<=80);
 assert.equal(typeof e.needs_review,'boolean');
}
const context=vm.createContext({window:{}});
const choices=read('data/choice_explanations.json'),choiceReport=read('data/choice_explanation_report.json');
context.expectedExplanationCount=choiceReport.processed-choiceReport.REJECT;
context.expectedReviewCount=choiceReport.UNKNOWN||0;
const finals=read('data/explanation_final_validation.json'),finalMap=new Map(finals.map(r=>[r.id,r]));
context.rejectedIds=choices.filter(r=>r.status==='REJECT').map(r=>r.id);
assert.deepEqual(choices.map(r=>r.id).sort(),questions.map(q=>q.id).sort());
for(const r of choices){
 const q=questions.find(q=>q.id===r.id);
 assert(['PASS','VERIFIED','FIXED','REJECT','UNKNOWN'].includes(r.status));
 assert.equal(r.choice_explanations.length,q.choices.length);
 r.choice_explanations.forEach((c,i)=>{
  assert.equal(c.choice,i+1);assert.equal(c.correct,q.correct_answers.includes(i+1));
  assert.equal(c.title,q.choices[i]);assert(c.explanation.trim()&&[...c.explanation].length<=200);
 });
}
const quality=read('data/explanation_validation.json');
assert.deepEqual(Object.keys(quality).sort(),Object.keys(output).sort());
for(const [id,d] of Object.entries(quality)){
 assert.deepEqual(Object.keys(d).sort(),['reason','result']);
 assert(['PASS','REVIEW'].includes(d.result));
 assert.equal(Boolean(d.reason),d.result==='REVIEW');
 const final=finalMap.get(id);
 assert.equal(output[id].needs_review,final?final.result==='REJECT':d.result==='REVIEW');
 if(final){assert(final.official_answer_verified);assert.equal(output[id].explanation,final.explanation);}
}
for(const p of ['official-questions.js','official-bank.js','explanations.js','explanation-bank.js'])vm.runInContext(fs.readFileSync(path.join(root,p),'utf8'),context);
vm.runInContext(`
const original=window.OFFICIAL_QUESTIONS.find(q=>q.id==='115-AM-004');
if(!matchingExplanation(original))throw Error('valid explanation rejected');
for(const field of ['question','choices','correct_answers','case_text','accepted_answer_sets']){
 const changed=JSON.parse(JSON.stringify(original));changed[field]='changed';
 if(matchingExplanation(changed))throw Error('stale explanation accepted: '+field);
}
if(QUESTION_BANK.filter(q=>q.hasExplanation).length!==expectedExplanationCount)throw Error('count');
if(QUESTION_BANK.filter(q=>q.exam===115&&q.explanationNeedsReview).length!==expectedReviewCount)throw Error('review flags');
if(QUESTION_BANK.some(q=>q.notes.length!==q.choices.length||(!q.explanationNeedsReview&&q.explanation)))throw Error('choice-only explanations missing');
for(const id of rejectedIds){
 if(QUESTION_BANK.some(q=>q.id===id)||window.REQUIRED_BANK.some(q=>q.id===id))throw Error('rejected question playable');
 if(window.RECARE_EXPLANATIONS.some(q=>q.id===id))throw Error('rejected explanation published');
}
const toScorable=id=>{const q=window.OFFICIAL_QUESTIONS.find(q=>q.id===id);return {...q,acceptedAnswerSets:q.accepted_answer_sets.map(s=>s.map(n=>n-1))}};
if(!isCorrectAnswer(toScorable('115-AM-029'),0))throw Error('official answer changed');
const alternative=toScorable('115-AM-080');
if(!isCorrectAnswer(alternative,3)||!isCorrectAnswer(alternative,4)||isCorrectAnswer(alternative,[3,4]))throw Error('alternative changed');
for(const id of ['115-AM-011','115-AM-066']){
 const q=QUESTION_BANK.find(q=>q.id===id);
 if(!q||!q.hasExplanation||q.explanationNeedsReview)throw Error('FIX not published');
}
`,context);
console.log(`PASS: 228 immutable inputs/answers; ${context.expectedExplanationCount} playable explanations; ${context.rejectedIds.length} REJECT excluded from game/required pools and published explanations; FIX applied; stale-input rejection; official alternative answers unchanged`);
