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
