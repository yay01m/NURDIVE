(()=>{
const activeUser=localStorage.getItem("recare-active-user"),store=`recare-profile-v1:${activeUser||"guest"}`;
let challengeMode=null;
const localDate=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const yesterday=()=>{let d=new Date();d.setDate(d.getDate()-1);return localDate(d)};
function load(){try{return JSON.parse(localStorage.getItem(store))||{}}catch{return{}}}
function save(p){localStorage.setItem(store,JSON.stringify(p));window.RECARE_CLOUD?.save(p)}
function dailyQuestion(){let date=localDate(),hash=[...date].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);return fullBank[hash%fullBank.length]}
function selectedLength(){return +document.querySelector('.mode-card.active[data-length]')?.dataset.length||20}
function requiredExam(limit){let groups={};for(const q of (window.recareExamPool?window.recareExamPool(window.REQUIRED_BANK||[]):window.REQUIRED_BANK||[]))(groups[q.requiredConcept||q.id]??=[]).push(q);return shuffle(Object.values(groups)).slice(0,limit).map(group=>shuffle([...group])[0])}
function startChallenge(){
  let pool=challengeMode==="daily"?[dailyQuestion()]:requiredExam(selectedLength());
  QUESTION_BANK=pool;reset();$("#finalTotal").textContent=pool.length;$("#titleScreen").hidden=true;$("#gameShell").classList.remove("game-hidden");window.scrollTo(0,0);
}
function inject(){
  let modes=document.querySelector(".premium-setup");if(!modes)return;
  let range=$("#premiumCategory");range?.add(new Option("必修問題","required"));
  document.querySelector('.title-actions').insertAdjacentHTML('afterend',`<section class="daily-challenge" aria-labelledby="dailyChallengeTitle"><div><h2 id="dailyChallengeTitle">今日の1問</h2><p>${localDate()} · 全員共通の固定問題</p><p>年度・分野・問題数の設定はありません。</p></div><button type="button" id="startDailyChallenge">今日の1問に挑戦する →</button></section>`);
  $('#startDailyChallenge').onclick=()=>{challengeMode='daily';startChallenge()};

}
const normalStart=$("#startGame").onclick;$("#startGame").onclick=()=>{challengeMode=$("#premiumCategory")?.value==="required"?"required":null;return challengeMode?startChallenge():normalStart()};
const normalSubmit=submit;submit=function(){
  if(!canSubmitAnswer(QUESTION_BANK[state.index],state.selected)||state.answered)return;let q=QUESTION_BANK[state.index],correct=isCorrectAnswer(q,state.selected);normalSubmit();
  let p=load();p.hardStreak??=0;p.bestHardStreak??=0;p.dailyStreak??=0;p.requiredAnswered??=0;p.requiredCorrect??=0;
  if(q.difficulty===3){p.hardStreak=correct?p.hardStreak+1:0;p.bestHardStreak=Math.max(p.bestHardStreak,p.hardStreak)}
  if(challengeMode==="required"){p.requiredAnswered++;if(correct)p.requiredCorrect++}
  if(challengeMode==="daily"&&p.dailyLastDate!==localDate()){p.dailyStreak=correct?(p.dailyLastDate===yesterday()?p.dailyStreak+1:1):0;p.dailyLastDate=localDate();p.dailyLastCorrect=correct}
  save(p);
};el.submit.onclick=submit;
const normalRetry=$("#retryButton").onclick;$("#retryButton").onclick=()=>{if(challengeMode){el.modal.hidden=true;startChallenge()}else normalRetry()};
const normalFinish=finish;finish=function(){normalFinish();if(challengeMode==="required"){let total=QUESTION_BANK.length,rate=Math.round(state.score/total*100),passed=rate>=80;$("#resultTitle").textContent=passed?"必修基準クリア":"必修基準まであと少し";$("#resultMessage").textContent=`${state.score} / ${total}点（${rate}%）｜80%以上がクリア基準です。`}if(challengeMode==="daily"){$("#resultTitle").textContent=state.score?"今日の1問 正解":"今日の1問 要復習";$("#resultMessage").textContent=state.score?"本日の記録を達成しました。":"公式正答を確認して、明日の1問へつなげましょう。"}};
inject();
})();
