// Official option numbers are converted to zero-based indices only at this boundary.
function selectionIndices(value){return value===null?[]:Array.isArray(value)?value:[value]}
function canSubmitAnswer(q,value){const selected=selectionIndices(value);return selected.length>0&&new Set(selected).size===selected.length&&selected.every(i=>Number.isInteger(i)&&i>=0&&i<q.choices.length)&&q.acceptedAnswerSets.some(set=>set.length===selected.length)}
function isCorrectAnswer(q,value){const selected=selectionIndices(value);return canSubmitAnswer(q,value)&&q.acceptedAnswerSets.some(set=>set.length===selected.length&&set.every(i=>selected.includes(i)))}
function isCorrectOption(q,i){return q.acceptedAnswerSets.some(set=>set.includes(i))}
function formatSelection(q,value){return selectionIndices(value).map(i=>`${i+1}. ${q.choices[i]}`).join(' ／ ')||'未回答'}
function formatCorrectAnswers(q){return q.acceptedAnswerSets.map(set=>formatSelection(q,set)).join(' または ')}
function escapeQuestionText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function officialDisplayQuestion(q){return [q.case_text,...(q.preceding_context||[]).map(item=>item.question),q.question].filter(Boolean).join('\n\n')}
let QUESTION_BANK=window.OFFICIAL_QUESTIONS.map(q=>({...q,question:officialDisplayQuestion(q),official:true,category:q.category||"分類準備中",questionType:q.question_type,acceptedAnswerSets:q.accepted_answer_sets.map(set=>set.map(n=>n-1)),difficulty:null,scenario:q.category?`${q.subcategory} / ${q.topic}${q.classification_needs_review?"（分類要確認）":""}`:"公式問題・正答を先行公開｜解説・分類・個別演出は準備中",source:`第${q.exam}回（${q.year}年）${q.session==='AM'?'午前':'午後'} 第${q.number}問 · ${q.question_type}`,sourceUrl:q.source.url,answerSourceUrl:q.answer_source.url,explanation:'解説は未作成です。正答は厚生労働省の公式正答表によります。',notes:q.choices.map(()=>''),effect:{name:'学習負荷',detail:'誤答によるゲーム内の負荷です。実際の症状を表すものではありません。',damage:10,pulse:0,spo2:0,focus:5,className:''}}));
window.REQUIRED_BANK=QUESTION_BANK.filter(q=>q.questionType==='必修問題');
