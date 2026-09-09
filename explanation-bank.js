// Explanation data cannot alter question text, choices, or answer sets.
const explanationEntries=new Map((window.RECARE_EXPLANATIONS||[]).map(e=>[e.id,e]));
function matchingExplanation(raw){
  const entry=explanationEntries.get(raw.id);
  if(!entry)return null;
  if(Object.entries(entry.input_anchor).some(([key,value])=>JSON.stringify(raw[key]??null)!==JSON.stringify(value)))return null;
  const e=entry.record;
  if(!['PASS','VERIFIED','FIXED','UNKNOWN'].includes(e.status))return null;
  if(!Array.isArray(e.choice_explanations)||e.choice_explanations.length!==raw.choices.length)return null;
  if(e.choice_explanations.some((c,i)=>c.choice!==i+1||c.title!==raw.choices[i]||c.correct!==raw.correct_answers.includes(i+1)||typeof c.explanation!=='string'||!c.explanation.trim()||[...c.explanation].length>200))return null;
  return entry;
}
const officialExplanationInputs=new Map(window.OFFICIAL_QUESTIONS.map(q=>[q.id,q]));
QUESTION_BANK.forEach(q=>{
  const entry=matchingExplanation(officialExplanationInputs.get(q.id));
  q.answersOnly=q.publication_mode==='official_answers_only';
  q.explanationNeedsReview=!entry||entry.record.status==='UNKNOWN';
  q.explanation=entry?(entry.record.status==='UNKNOWN'?'【解説の一部は不明】○×と採点は厚生労働省の公式正答に基づきます。':''):q.answersOnly?'公式正答のみ表示しています。解説は準備中です。':'解説を確認できません。';
  q.notes=entry?entry.record.choice_explanations.map(c=>c.explanation):q.answersOnly?q.choices.map(()=>''):[];
  q.explanationSources=entry?entry.sources:[];
  q.hasExplanation=Boolean(entry);
});
// Apply final publication decisions before app.js captures any game pools.
const rejectedQuestionIds=new Set(window.RECARE_REJECTED_QUESTION_IDS||[]);
QUESTION_BANK=QUESTION_BANK.filter(q=>!rejectedQuestionIds.has(q.id)&&(q.hasExplanation||q.answersOnly));
window.REQUIRED_BANK=QUESTION_BANK.filter(q=>q.questionType==='必修問題');
const examDocumentUrls=new Set(window.OFFICIAL_QUESTIONS.flatMap(q=>[q.source.url,q.answer_source.url]));
function explanationReferences(q){
  if(!q.hasExplanation)return '';
  return `<aside class="explanation-sources"><p>学習用AI解説（非公式）</p>${q.explanationSources.filter(s=>!examDocumentUrls.has(s.url)&&!s.title.includes("看護師国家試験")).map(s=>`<a href="${escapeQuestionText(s.url)}" target="_blank" rel="noopener noreferrer">${escapeQuestionText(s.title)}</a>`).join('')}</aside>`;
}
