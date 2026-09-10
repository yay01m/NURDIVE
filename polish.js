(()=>{
function announce(text){let live=$("#appLive");if(!live){live=document.createElement("div");live.id="appLive";live.setAttribute("aria-live","polite");live.style.cssText="position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)";document.body.appendChild(live)}live.textContent="";setTimeout(()=>live.textContent=text,30)}
function syncUI(state){let chip=$("#syncState");if(!chip)return;chip.className=`sync-state ${state}`;chip.textContent=state==="syncing"?"同期中":state==="saved"?"同期済み":state==="invalid"?"記録の確認が必要":state==="auth"?"再ログインが必要":state==="pending"?"端末保存・同期待ち":state==="error"?"記録の確認が必要":state==="offline"?"オフライン":"端末保存"}
function notice(text){document.querySelector(".network-toast")?.remove();let n=document.createElement("div");n.className="network-toast";n.textContent=text;document.body.appendChild(n);setTimeout(()=>n.remove(),3000)}
function inject(){el.feedback.setAttribute("aria-live","polite");el.avatarStage.setAttribute("tabindex","-1");let account=document.querySelector(".account-chip");if(account){account.insertAdjacentHTML("beforeend",`<span class="sync-state" id="syncState">${window.RECARE_CLOUD?.enabled()?"接続済み":"端末保存"}</span>`);syncUI(navigator.onLine?(window.RECARE_CLOUD?.status()||"local"):"offline")}document.body.insertAdjacentHTML("beforeend",`<button class="mobile-anatomy-jump" id="anatomyJump" type="button"><b id="anatomyCount">0</b>投影された自分を見る</button>`);$("#anatomyJump").onclick=()=>{el.avatarStage.scrollIntoView({behavior:"smooth",block:"center"});setTimeout(()=>el.avatarStage.focus({preventScroll:true}),450)}}
const oldAvatar=avatar;avatar=function(effect){oldAvatar(effect);let count=state.review.length,jump=$("#anatomyJump");if(jump){$("#anatomyCount").textContent=count;jump.classList.toggle("has-symptom",count>0);jump.setAttribute("aria-label",`投影された自分を見る。ミス${count}回`)}};
const oldSubmit=submit;submit=function(){if(state.answered||!canSubmitAnswer(QUESTION_BANK[state.index],state.selected))return;let selected=state.selected,q=QUESTION_BANK[state.index];oldSubmit();if(selected===null)return;announce(state.answered?`${isCorrectAnswer(q,selected)?"正解":"不正解"}。${q.explanation}`:"");setTimeout(()=>{if(state.answered&&el.modal.hidden){el.feedback.focus({preventScroll:true});el.feedback.scrollIntoView({block:"start",behavior:"instant"})}},50)};el.submit.onclick=submit;
let lastNotice='',lastNoticeAt=0;
window.addEventListener('recare-cloud-status',e=>{
 syncUI(e.detail);
 const messages={invalid:'記録の形式を確認する必要があります。記録は端末に残しています。管理者へお知らせください。',auth:'記録は端末に保存しています。同期を再開するには、マイページからログアウトして再ログインしてください。',error:'保存待ちの記録を読み取れません。ブラウザのデータを消さずに管理者へお知らせください。'};
 if(e.detail==='saved')lastNotice='';
 if(messages[e.detail]&&(lastNotice!==e.detail||Date.now()-lastNoticeAt>300000)){notice(messages[e.detail]);lastNotice=e.detail;lastNoticeAt=Date.now()}
});
window.addEventListener('offline',()=>syncUI('offline'));

inject();avatar(null);
})();

