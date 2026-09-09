// Presentation is separate from the official input used for scoring and review anchors.
for(const q of QUESTION_BANK){
  const p=window.RECARE_QUESTION_PRESENTATIONS?.[q.id];
  q.presentation=p&&p.input_text===q.question&&JSON.stringify(p.input_choices)===JSON.stringify(q.choices)?p:null;
}
function questionTextForDisplay(q){
  const p=q.presentation;if(!p)return q.question;
  return [...p.context.map(c=>`${c.title}\n${c.text}`),p.question].join('\n\n');
}
function choiceTextForDisplay(q,index){return q.presentation?.choices[index]??q.choices[index]}
function renderQuestionPresentation(q,heading){
  const p=q.presentation,box=document.getElementById('caseContext'),glossary=document.getElementById('questionAnnotations');
  heading.textContent=p?p.question:q.question;
  if(box){box.hidden=!p?.context.length;box.innerHTML=p?p.context.map(c=>`<section><h2>${escapeQuestionText(c.title)}</h2><p>${escapeQuestionText(c.text)}</p></section>`).join(''):''}
  if(glossary){glossary.hidden=!p?.annotations.length;glossary.open=false;glossary.querySelector('p').textContent=p?p.annotations.join(' / '):''}
}
