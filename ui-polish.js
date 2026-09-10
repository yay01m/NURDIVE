(()=>{
  const titleTools=document.querySelector('.title-account-actions');
  if(titleTools)document.querySelector('.title-top')?.appendChild(titleTools);
  const visual=document.querySelector('.title-visual'),content=document.querySelector('.title-content');
  if(visual&&content){const support=document.createElement('div');support.className='title-support';content.appendChild(support);support.appendChild(visual);for(const selector of ['.daily-challenge','.official-pdf-library']){const item=document.querySelector(selector);if(item)support.appendChild(item)}}
  const ranking=document.querySelector('#titleRankingButton');if(ranking)ranking.textContent='ランキング';
  const mypage=document.querySelector('#titleMyPageButton');if(mypage)mypage.textContent='マイページ';
  for(const [selector,label] of [['#mypageClose','マイページを閉じる'],['#reportClose','報告画面を閉じる']])document.querySelector(selector)?.setAttribute('aria-label',label);
  const modeButtons=[...document.querySelectorAll('.mode-card')];
  for(const button of modeButtons){
    const update=()=>button.setAttribute('aria-pressed',String(button.classList.contains('active')));
    update();new MutationObserver(update).observe(button,{attributes:true,attributeFilter:['class']});
  }
  // Keep keyboard navigation inside the open panel and return to its opener.
  const dialogs=[['mypage','mypageClose','マイページ'],['howPanel','howClose','遊び方・ご利用上の注意'],['reportModal','reportClose','誤りを報告']];
  const openers=new Map();
  const focusable=panel=>[...panel.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex="0"]')].filter(e=>!e.disabled&&e.getClientRects().length);
  for(const [id,closeId,label] of dialogs){
    const panel=document.getElementById(id);if(!panel)continue;
    panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',label);
    new MutationObserver(()=>{
      if(!panel.hidden){openers.set(panel,document.activeElement);document.getElementById(closeId)?.focus({preventScroll:true})}
      else{openers.get(panel)?.focus({preventScroll:true});openers.delete(panel)}
    }).observe(panel,{attributes:true,attributeFilter:['hidden']});
    panel.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();document.getElementById(closeId)?.click();return}
      if(event.key==='Tab'){
        const items=focusable(panel),first=items[0],last=items.at(-1);if(!first)return;
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
      }
      event.stopPropagation();
    });
  }
})();

// Presentation-only improvements. Existing controls keep their original handlers.
(()=>{
  const title=document.querySelector('.title-copy');
  const setup=document.createElement('details');
  setup.id='shiftSetup';setup.className='shift-setup';
  setup.innerHTML='<summary><span><b>夜勤の設定</b><span id="setupSummary"></span></span></summary><div class="shift-setup-content"></div>';
  const setupContent=setup.querySelector('.shift-setup-content');
  const source=document.querySelector('.question-source');source.before(setup);
  const modes=document.querySelector('.premium-setup');
  const lengthLabel=document.createElement('p');lengthLabel.className='setup-label';lengthLabel.textContent='出題数を選ぶ';
  for(const node of [source,document.querySelector('#examYear').closest('label'),lengthLabel,modes,document.querySelector('#premiumCategory').closest('label'),document.querySelector('#yearPublicationNote')])setupContent.append(node);
  const summaries={10:['QUICK','すきま時間に'],20:['STANDARD','毎日の演習に'],30:['SURVIVAL','じっくり挑戦']};
  document.querySelectorAll('.mode-card[data-length]').forEach(button=>{
    const hint=document.createElement('em');hint.textContent=summaries[button.dataset.length][1];button.append(hint);
  });
  const updateSetup=()=>{
    const sourceName=document.querySelector('input[name="questionSource"]:checked')?.value==='past'?'過去問':'オリジナル';
    const category=document.querySelector('#premiumCategory');
    document.querySelector('#setupSummary').textContent=`${sourceName} · ${document.querySelector('.mode-card.active')?.dataset.length||20}問 · ${category.selectedOptions[0]?.textContent||'すべての分野'}`;
  };
  setup.addEventListener('change',updateSetup);modes.addEventListener('click',updateSetup);updateSetup();
  title.append(document.querySelector('.title-metrics'),document.querySelector('#lastResult'));
  // Secondary modes remain available after the primary launch controls.
  const support=document.querySelector('.title-support');
  if(support) support.insertBefore(document.querySelector('.battle-launch'),support.querySelector('.official-pdf-library'));
  const how=document.querySelector('#howPanel');document.body.append(how);
  const trust=document.createElement('aside');trust.className='learning-trust';
  trust.innerHTML='<p id="questionTrust"></p><p>解説：AIを活用した独自作成（専門家監修なし）</p><button type="button" class="trust-link">出典・解説についての注意事項</button>';
  document.querySelector('.action-row').before(trust);
  trust.querySelector('button').onclick=()=>{how.hidden=false};
  document.querySelector('.side-panel').append(document.querySelector('#anatomyJump'));
  document.querySelector('#bookmarkButton').setAttribute('aria-label','この問題を復習用に保存');
  el.question.setAttribute('tabindex','-1');el.feedback.setAttribute('tabindex','-1');
  const oldRender=render;
  render=function(){
    oldRender();
    const q=QUESTION_BANK[state.index];
    document.querySelector('.instruction').textContent=`${q.acceptedAnswerSets[0].length}つ選んで判断してください`;
    document.querySelector('#questionTrust').textContent=fullBank.some(item=>item.id===q.id)?'問題・正答：厚生労働省公表資料に基づく':'問題・正答：RE:CARE独自作成のオリジナル問題';
    [...el.choices.children].forEach(button=>button.setAttribute('aria-pressed','false'));
    document.querySelector('#bookmarkButton').setAttribute('aria-pressed',String(document.querySelector('#bookmarkButton').classList.contains('saved')));
    document.querySelector('.health-track').setAttribute('role','meter');
    document.querySelector('.health-track').setAttribute('aria-label','自分を保つ力');
    document.querySelector('.health-track').setAttribute('aria-valuemin','0');
    document.querySelector('.health-track').setAttribute('aria-valuemax','100');
    document.querySelector('.health-track').setAttribute('aria-valuenow',String(state.health));
  };
  const oldSubmit=submit;
  submit=function(){
    const already=state.answered;oldSubmit();if(already||!state.answered)return;
    const q=QUESTION_BANK[state.index];
    [...el.choices.children].forEach((button,index)=>{
      const label=document.createElement('small');label.className='choice-state';
      const selected=selectionIndices(state.selected).includes(index);
      label.textContent=(isCorrectOption(q,index)?'○ 正答':'× 正答ではありません')+(selected?' · あなたの回答':'');
      button.lastElementChild.prepend(label);
    });
    document.querySelector('.health-track').setAttribute('aria-valuenow',String(state.health));
  };el.submit.onclick=submit;
  // Native buttons handle Enter themselves; do not also run the global shortcut.
  document.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&event.target.closest('button,summary,a[href]'))event.stopImmediatePropagation();
  },true);
  document.querySelector('#nextButton').addEventListener('click',()=>{if(!state.answered&&el.modal.hidden)el.question.focus({preventScroll:true})});
  const bookmark=document.querySelector('#bookmarkButton');bookmark.addEventListener('click',()=>bookmark.setAttribute('aria-pressed',String(bookmark.classList.contains('saved'))));
  const summary=document.createElement('div');summary.className='result-summary';
  summary.innerHTML='<div><span>正答率（回答済み）</span><b id="resultAccuracy"></b></div><div><span>最大連続正解</span><b id="resultStreak"></b></div><div><span>回答済み</span><b id="resultAnswered"></b></div>';
  document.querySelector('.result-stats').before(summary);
  const result=document.querySelector('#resultModal');
  new MutationObserver(()=>{
    if(result.hidden)return;
    let streak=0,best=0;for(const record of [...state.records].reverse()){streak=record.ok?streak+1:0;best=Math.max(best,streak)}
    document.querySelector('#resultAccuracy').textContent=state.records.length?`${Math.round(state.score/state.records.length*100)}%`:'—';
    document.querySelector('#resultStreak').textContent=`${best}問`;
    document.querySelector('#resultAnswered').textContent=`${state.records.length}問`;
    // Also refresh the existing analysis surface on an early-ended shift.
    let analytics=document.querySelector('.analytics');
    if(!analytics){analytics=document.createElement('section');analytics.className='analytics';document.querySelector('.result-actions').before(analytics)}
    const heading=document.createElement('h3');heading.textContent='領域別パフォーマンス';analytics.replaceChildren(heading);
    const categories=new Map();
    for(const record of state.records){const category=QUESTION_BANK[record.caseNo-1]?.category;if(!category)continue;const row=categories.get(category)||{correct:0,total:0};row.total++;if(record.ok)row.correct++;categories.set(category,row)}
    for(const [category,value] of [...categories].sort((a,b)=>a[1].correct/a[1].total-b[1].correct/b[1].total)){
      const row=document.createElement('div');row.className='analytic-row';const name=document.createElement('span');name.textContent=category;
      const bar=document.createElement('div');bar.className='analytic-bar';bar.setAttribute('aria-hidden','true');const fill=document.createElement('i');const percent=Math.round(value.correct/value.total*100);fill.style.width=percent+'%';bar.append(fill);
      const rate=document.createElement('b');rate.textContent=percent+'%';rate.title=`${value.correct} / ${value.total}問正解`;row.append(name,bar,rate);analytics.append(row);
    }
  }).observe(result,{attributes:true,attributeFilter:['hidden']});
  // Extend existing focus containment to results and the battle surface.
  for(const [id,label,firstId] of [['resultModal','夜勤の結果','retryButton'],['battleScreen','友達と対戦','battleClose']]){
    const panel=document.getElementById(id);if(!panel)continue;
    panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',label);panel.tabIndex=-1;
    let opener=null;
    new MutationObserver(()=>{if(!panel.hidden){opener=document.activeElement;(panel.querySelector('#'+firstId)||panel.querySelector('button')||panel).focus({preventScroll:true})}else if(opener?.isConnected&&opener.getClientRects().length)opener.focus({preventScroll:true})}).observe(panel,{attributes:true,attributeFilter:['hidden']});
    panel.addEventListener('keydown',event=>{
      if(event.key==='Tab'){
        const items=[...panel.querySelectorAll('button,a[href],input,select,textarea,summary')].filter(e=>!e.disabled&&e.getClientRects().length);
        if(!items.length){event.preventDefault();panel.focus()}
        else if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1).focus()}
        else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0].focus()}
      }
      event.stopPropagation();
    });
  }
  render();
})();
