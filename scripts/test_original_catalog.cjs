const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const canonical=read('data/original_questions.json');
const context=vm.createContext({window:{OFFICIAL_QUESTIONS:[]}});
for(const file of ['official-bank.js','original-questions.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const game=context.window.ORIGINAL_BANK;
assert.equal(game.length,900);assert.equal(canonical.length,900);
const categories=new Map(),byId=new Map(canonical.map(q=>[q.id,q]));
for(const q of game){
 const raw=byId.get(q.id);assert(raw,q.id);
 assert.equal(q.question,raw.question);assert.equal(q.official,false);
 assert.deepEqual(Array.from(q.choices),raw.choices);assert.deepEqual(Array.from(q.notes),raw.notes);
 assert.equal(q.acceptedAnswerSets.length,1);assert.equal(q.acceptedAnswerSets[0].length,1);
 for(let i=0;i<4;i++)assert.equal(context.isCorrectAnswer(q,i),i===raw.answer-1,`${q.id} option ${i+1}`);
 for(const invalid of [null,[],[0,1],-1,4,'0',[0,0]])assert.equal(context.isCorrectAnswer(q,invalid),false,q.id);
 categories.set(q.category,(categories.get(q.category)||0)+1);
}
assert.equal(categories.size,9);assert([...categories.values()].every(n=>n===100));
for(const seed of read('data/original/seed-20.json'))assert.deepEqual(byId.get(seed.id),seed,`Seed changed: ${seed.id}`);
const calculations={
 'ORG-FND-090':600/5,'ORG-FND-091':90*20/60,'ORG-FND-092':10/(40/2),
 'ORG-PED-066':90*7,'ORG-PED-067':144/6/12,'ORG-PED-068':18*30/3,'ORG-PED-070':15/5,
 'ORG-INT-060':8,'ORG-INT-096':80/100*100,'ORG-INT-097':10-6,'ORG-INT-098':90/100*100,'ORG-INT-099':6/2000*1000,
 'ORG-MAT-069':Math.round((3200-2976)/3200*100),'ORG-MAT-070':50*3+60*4+70,'ORG-MAT-072':56.32/(1.6*1.6),'ORG-MAT-073':310-15*4
};
for(const [id,expected] of Object.entries(calculations)){
 const q=byId.get(id),text=q.choices[q.answer-1].replace(/,/g,'');
 const actual=Number(text.match(/[0-9]+(?:\.[0-9]+)?/)[0]);assert(Math.abs(actual-expected)<1e-8,`${id}: ${actual} != ${expected}`);
}
console.log('PASS: 900 unique originals, 9 × 100, all 3600 answer decisions, invalid-answer rejection, canonical export agreement, unchanged seed 20, independent calculations.');
