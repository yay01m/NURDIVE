const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const ctx=vm.createContext({window:{}});
for(const f of ['official-questions.js','official-bank.js','question-presentations.js','question-presentation.js','explanations.js','additional-explanations.js','explanation-bank.js','disease-simulator.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const data=vm.runInContext(`QUESTION_BANK.map(q=>({id:q.id,p:q.presentation,raw:q.question,choices:q.choices,status:q.simulatorStatus,notes:q.notes}))`,ctx);
assert.equal(data.length,1125);assert(data.every(q=>q.p&&q.p.question&&q.p.choices.length===q.choices.length&&q.notes.length===q.choices.length&&['none','effect'].includes(q.status)));
for(const q of data){assert.equal(q.raw,q.p.input_text);assert.deepEqual(q.choices,q.p.input_choices);assert(!q.p.question.includes('\ufffd'));}
const q=data.find(q=>q.id==='115-AM-117').p;
assert.equal(q.context.length,2);assert(q.context[1].text.includes('相談があった。'));assert(!q.context.some(c=>c.text.includes('来院時の所見から考えられるのはどれか')||c.text.includes('外来看護師の声かけとして適切なのはどれか')));assert(q.annotations.includes('bulimia nervosa'));assert(!q.context.some(c=>c.text.includes('bulimia nervosa')));assert(q.context[0].text.includes('K 2.7 mEq/L'));assert(q.context[0].text.includes('γ-GTP 29 IU/L'));
const table=data.find(q=>q.id==='111-PM-029').p.question;for(const row of ['a：あり／あり','b：あり／なし','c：なし／あり','d：なし／なし'])assert(table.includes(row));
const repaired=data.find(q=>q.id==='113-PM-099').p.context.map(c=>c.text).join('\n');assert(repaired.includes('37.5 ℃'));assert(repaired.includes('抗菌薬を内服するように指示が出された。'));
assert.equal(crypto.createHash('sha256').update(fs.readFileSync('data/questions.json')).digest('hex'),'1d4c906d807332123f14935d809048240e689919db065285af29ecf341ffb0ae');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync('data/additional_questions.json')).digest('hex'),'d1ec9c2694cdce76b34a91a8a89b398f32ed4d144c54e36405cb963db4811236');
console.log('PASS: 1,125 presentations, context trimming, English annotations, preserved laboratory values, source-checked repairs, unchanged source files and simulator anchors.');
