const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const context=vm.createContext({window:{}});
for(const name of ['official-questions.js','official-bank.js','explanations.js','additional-explanations.js','explanation-bank.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),context,{filename:name});
const rows=vm.runInContext(`QUESTION_BANK.map(q=>({exam:q.exam,html:explanationReferences(q)}))`,context);
assert.equal(new Set(rows.map(r=>r.exam)).size,5);
assert.equal(rows.length,1125);
for(const {html} of rows){
  assert(!/<a\b|https?:\/\/|根拠・参考資料|参考資料URL/.test(html));
  assert(html.includes('学習用AI解説（非公式）'));
}
console.log('PASS: all 1,125 explanations across five years have no reference links or reference section.');
