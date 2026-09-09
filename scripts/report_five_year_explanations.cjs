// Summarize saved publication records, never infer content approval.
const fs=require('fs'),assert=require('assert');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const questions=[...read('data/questions.json'),...read('data/additional_questions.json')];
const explanations=[...read('data/choice_explanations.json'),...read('data/additional_choice_explanations.json')];
const byId=new Map(explanations.map(x=>[x.id,x]));
assert.equal(byId.size,explanations.length,'Duplicate explanation ID');
const years=[111,112,113,114,115].map(exam=>{
 const pool=questions.filter(q=>q.exam===exam);
 const entries=pool.map(q=>byId.get(q.id)).filter(Boolean);
 return {year:exam+1911,exam,questions:pool.length,written:entries.length,
  missing:pool.filter(q=>!byId.has(q.id)).map(q=>q.id),
  statuses:entries.reduce((a,e)=>(a[e.status]=(a[e.status]||0)+1,a),{}),
  unknown:entries.filter(e=>e.status==='UNKNOWN').map(e=>({id:e.id,reason:e.review_reason}))};
});
const summary={scope:'2022〜2026年の採用済み公式過去問。画像等による未収録問題は対象外。',
 updated_at:new Date().toISOString(),questions:questions.length,written:years.reduce((n,y)=>n+y.written,0),
 missing:years.flatMap(y=>y.missing).length,unknown:years.reduce((n,y)=>n+y.unknown.length,0),
 review:'学習用AI解説。UNKNOWNは該当箇所を不明と明記。全問の専門家監修を意味しない。',years};
if(process.argv.includes('--complete'))assert.equal(summary.missing,0,'Incomplete explanation coverage');
fs.writeFileSync('data/five_year_explanation_summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
