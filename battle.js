(()=>{
const esc=escapeQuestionText,RESUME='recare-battle-room';
let room=null,snapshot=null,selection=[],requestBusy=false,pollTimer=null,tickTimer=null,generation=0,serverOffset=0,renderKey='',open=false;
const me=()=>window.RECARE_CLOUD?.session()?.username;
let cloudReady=null;
async function ensureBattleCloud(){
 if(typeof window.RECARE_CLOUD?.battle==='function')return;
 if(!cloudReady)cloudReady=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=new URL('cloud-sync.js?v=80',document.baseURI).href;
  const finish=(error)=>{clearTimeout(timeout);script.onload=script.onerror=null;script.remove();error?reject(error):resolve()};
  const failure=()=>new Error('対戦機能の更新を読み込めませんでした。通信環境を確認して、画面を再読み込みしてください。');
  const timeout=setTimeout(()=>finish(failure()),15000);
  script.onload=()=>finish(typeof window.RECARE_CLOUD?.battle==='function'?null:failure());script.onerror=()=>finish(failure());document.head.appendChild(script);
 }).catch(error=>{cloudReady=null;throw error});
 await cloudReady;
}
const request=async(action,args={})=>{await ensureBattleCloud();return window.RECARE_CLOUD.battle(action,args)};
const now=()=>Date.now()+serverOffset;
const duration=ms=>`${(Math.max(0,ms||0)/1000).toFixed(1)}秒`;
const stamp=value=>value?Date.parse(value):0;
const screen=document.createElement('section');screen.id='battleScreen';screen.className='battle-screen';screen.hidden=true;screen.setAttribute('aria-label','オンライン対戦');
screen.innerHTML='<div class="battle-shell"><header class="battle-header"><div><span class="battle-kicker">RE:CARE / MATCH TERMINAL</span><h1>オンライン対戦</h1></div><button type="button" class="battle-quiet" data-battle="exit">タイトルへ戻る</button></header><p id="battleNotice" class="battle-notice" role="status" aria-live="polite"></p><div id="battleContent"></div></div>';
document.body.appendChild(screen);const content=screen.querySelector('#battleContent'),notice=screen.querySelector('#battleNotice');
const launch=document.createElement('section');launch.className='battle-launch';launch.innerHTML='<div><span class="battle-kicker">2–4 PLAYERS · ONLINE</span><h2>みんなと、知識で勝負。</h2><p>同じ10問に同時に挑戦。正解数で勝負し、同点なら回答時間で決着。</p></div><button type="button" id="openBattleButton">オンライン対戦 <span>→</span></button>';
const anchor=document.querySelector('.question-source')||document.querySelector('.title-actions');anchor?.before(launch);
function message(text='',error=false){notice.textContent=text;notice.classList.toggle('is-error',error)}
function friendly(error){return error.code==='PGRST202'?'対戦機能は公開準備中です。準備が完了してからお試しください。':error.message||'接続できませんでした。通信環境を確認してください。'}
function saveRoom(){if(room)localStorage.setItem(RESUME,JSON.stringify({username:me(),room}));else localStorage.removeItem(RESUME)}
function stop(){generation++;clearTimeout(pollTimer);clearInterval(tickTimer);pollTimer=tickTimer=null}
function homeView(){
 screen.dataset.phase='entry';
 content.innerHTML='<section class="battle-card battle-random-entry"><div class="battle-entry-copy"><span class="battle-kicker">01 / RANDOM MATCH</span><h2>同じ夜勤に、挑もう。</h2><p>今いる相手と、同じ10問で腕試し。<br>ルーム番号なしで参加できます。</p><ul class="battle-facts" aria-label="対戦の概要"><li><b>2–4</b>人で対戦</li><li><b>10</b>問で勝負</li><li><b>150</b>秒 / 問</li></ul></div><div class="battle-entry-action"><span class="battle-ready"><i aria-hidden="true"></i> RANDOM MATCH</span><button type="button" class="battle-primary" data-battle="match">対戦相手を探す <span aria-hidden="true">→</span></button><p>2人そろって15秒後に開始。<br>4人そろうとすぐに始まります。</p></div></section><div class="battle-intro"><p class="battle-eyebrow">02 / FRIEND MATCH</p><h2>友達とは、ルーム番号で。</h2><p>1人がルームを作り、ほかの人が6桁の番号で参加。最大4人で遊べます。</p></div><div class="battle-entry-grid"><section class="battle-card battle-create-card"><span class="battle-card-index" aria-hidden="true">HOST</span><h3>ルームを作る</h3><p>番号を発行して、友達を招待します。<br>全員そろったら、あなたがスタート。</p><button type="button" class="battle-primary" data-battle="create">ルームを作る <span aria-hidden="true">＋</span></button></section><form class="battle-card" id="battleJoinForm"><span class="battle-card-index" aria-hidden="true">JOIN</span><h3>ルームに参加</h3><label for="battleRoomCode">友達から届いた6桁の番号</label><div class="battle-join-controls"><input id="battleRoomCode" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]{6}" required placeholder="000000" aria-describedby="battleCodeHint"><button class="battle-primary" type="submit">参加する <span aria-hidden="true">→</span></button></div><small id="battleCodeHint">ルームを作った友達に番号を確認してください。</small></form></div><details class="battle-rules"><summary>対戦ルール・途中退出について</summary><ul><li>2〜4人に同じ10問を同時に出題します。</li><li>1問150秒。参加者全員の回答後に5秒間、正答と解説を確認し、3秒のカウントダウンで次の問題が始まります。</li><li>正解数が同じ場合は、合計回答時間が短い人が上位。時間も同じなら引き分けです。</li><li>途中退出は棄権となり、残りの人で続行します。最後の1人になったら勝利です。通信が切れても、同じアカウントで対戦へ戻れます。</li></ul></details>';renderKey='';
}
async function openBattle(){
 if(open)return;const openingGeneration=generation;
 open=true;screen.hidden=false;document.querySelector('#titleScreen').hidden=true;document.querySelector('#gameShell').classList.add('game-hidden');window.scrollTo(0,0);message();homeView();
 if(!window.RECARE_CLOUD?.enabled()||!me()){message('オンライン対戦にはログインが必要です。マイページからログアウトし、もう一度ログインしてください。',true);content.querySelectorAll('button,input').forEach(e=>e.disabled=true);return}
 try{const saved=JSON.parse(localStorage.getItem(RESUME));if(saved?.username===me()&&/^\d{6}$/.test(saved.room)){room=saved.room;message('前の対戦に接続しています…');const data=await request('state',{p_room_code:room});if(!open||openingGeneration!==generation)return;apply(data);startPolling();message()}}catch(error){if(!open||openingGeneration!==generation)return;room=null;saveRoom();message(friendly(error),true)}
}
function apply(data){
 if(!open)return;
 if(snapshot?.room_code===data.room_code&&stamp(data.server_now)<stamp(snapshot.server_now))return;
 if(data.server_now)serverOffset=stamp(data.server_now)-Date.now();
 const changed=!snapshot||snapshot.round_index!==data.round_index||snapshot.room_code!==data.room_code;
 const showResult=snapshot?.phase!=='finished'&&data.phase==='finished';
 if(changed)selection=[];
 snapshot=data;room=data.room_code||room;saveRoom();
 if(data.own_answer?.selection)selection=[...data.own_answer.selection];
 const key=JSON.stringify([data.phase,data.round_index,data.players,data.own_answer,data.result,data.question_id,data.match_kind,data.match_start_at]);
 if(key!==renderKey){renderKey=key;render();}if(changed||showResult)screen.scrollTop=0;tick();
}
function scoreboard(){return `<div class="battle-scoreboard">${(snapshot.players||[]).map(p=>`<article class="${p.username===me()?'is-me':''}"><span>${esc(p.display_name||p.username)}${p.username===me()?' <small>あなた</small>':''}</span>${snapshot.phase==='finished'?`<b class="battle-rank">${p.forfeited?'棄権':`${p.rank||'—'}位`}</b>`:''}<strong>${p.correct_count||0}<small> 正解</small></strong><p>${p.forfeited?'棄権':snapshot.phase==='lobby'?'参加済み':snapshot.phase==='question'||snapshot.phase==='countdown'?(p.answered?'回答済み':'考え中'):duration(p.total_time_ms)}</p></article>`).join('')}</div>`}
function questionMarkup(q){const p=q.presentation;return `${p?.context.length?`<div class="case-context">${p.context.map(c=>`<section><h2>${esc(c.title)}</h2><p>${esc(c.text)}</p></section>`).join('')}</div>`:''}<p class="battle-source">${esc(q.source)}</p><h2 class="battle-question">${esc(p?.question||q.question)}</h2>${p?.annotations.length?`<details class="question-annotations"><summary>原資料の英語表記</summary><p>${esc(p.annotations.join(' / '))}</p></details>`:''}`}
function reviewHistory(reviews){return reviews.length?`<section class="battle-history"><h3>対戦の振り返り</h3>${reviews.map(r=>{const q=fullBank.find(q=>q.id===r.question_id);if(!q)return '';return `<details><summary>第${r.round_index+1}問 · ${r.correct?'正解':'不正解'} <small>${esc(q.source)}</small></summary>${questionMarkup(q)}<p>あなたの回答：${r.selection?.length?r.selection.map(i=>i+1).join('・'):'未回答'} / 正答：${(r.correct_answers||[]).map(set=>set.map(i=>i+1).join('・')).join(' または ')}</p>${q.notes.map((n,i)=>`<article><b>${i+1}. ${esc(choiceTextForDisplay(q,i))}</b><p>${esc(n)}</p></article>`).join('')}</details>`}).join('')}</section>`:''}
function render(){
 const s=snapshot;if(!s)return;screen.dataset.phase=s.phase;
 const isHost=s.host_username===me();
 if(s.phase==='lobby'&&s.match_kind==='random'){
  content.innerHTML=`<div class="battle-lobby"><p class="battle-eyebrow">RANDOM MATCH</p><div class="battle-search-mark" aria-hidden="true">◎</div><h2>対戦相手を探しています</h2><p>参加者 ${s.players.length} / 4人</p>${scoreboard()}<p id="battleMatchTimer" role="status"></p><p class="battle-subtle">2人以上で15秒後に開始。4人そろったらすぐに開始します。<br>待機中のキャンセルは負けになりません。</p><button type="button" class="battle-quiet" data-battle="cancel">マッチングをキャンセル</button></div>`;return;
 }
 if(s.phase==='lobby'){

  content.innerHTML=`<div class="battle-lobby"><p class="battle-eyebrow">友達にこの番号を伝えてください</p><div class="battle-code" aria-label="ルーム番号">${esc(room)}</div><button type="button" class="battle-quiet" data-battle="copy">番号をコピー</button>${scoreboard()}<p class="battle-subtle">参加者 ${s.players.length} / ${s.max_players||4}人</p><p>${s.players.length<2?'友達の参加を待っています…':isHost?`${s.players.length}人参加中。2〜4人で開始できます。`:'ホストが開始するのを待っています…'}</p>${isHost?`<button type="button" class="battle-primary" data-battle="start" ${s.players.length<2?'disabled':''}>対戦を開始する</button>`:''}<p class="battle-subtle">10問 / 各150秒 / 同点なら回答時間で決着</p></div>`;return;
 }
 if(s.phase==='finished'){
  const r=s.result||{},self=s.players.find(p=>p.username===me()),won=r.winner_username===me(),draw=!r.winner_username;
  content.innerHTML=`<section class="battle-result"><p class="battle-eyebrow">MATCH RESULT</p><h2>${r.reason==='cancelled'?'対戦が終了しました':self?.forfeited?'棄権しました':draw?(self?.rank===1?'同率1位！':`あなたは${self?.rank||'—'}位`):won?'あなたの勝ち！':`あなたは${self?.rank||'—'}位`}</h2><p>${r.reason==='forfeit'?'残った参加者が1人になったため、対戦が終了しました。':'正解数、合計回答時間の順で順位を決めています。'}</p>${scoreboard()}<button type="button" class="battle-primary" data-battle="new">もう一度対戦する <span aria-hidden="true">→</span></button>${reviewHistory(s.reviews||[])}</section>`;return;
 }
 const q=fullBank.find(q=>q.id===s.question_id);
 if(!q){content.innerHTML='<section class="battle-card"><h2>問題データを更新してください</h2><p>この対戦の問題を読み込めません。ページを再読み込みして、対戦に戻ってください。</p></section>';return}
 const review=s.phase==='review',answered=Boolean(s.own_answer),locked=review||answered||s.phase==='countdown'||s.players.some(p=>p.username===me()&&p.forfeited);
 const correctSets=s.correct_answers||[],correctOptions=new Set(correctSets.flat());
 content.innerHTML=`${scoreboard()}<div class="battle-round"><span>第 ${s.round_index+1} 問 / 10</span><b id="battleTimer"></b></div>${s.phase==='countdown'?'<div class="battle-countdown" role="status">まもなく同じ問題が出題されます。</div>':`<section class="battle-question-card">${questionMarkup(q)}<p class="battle-instruction">${q.acceptedAnswerSets[0].length}つ選んで回答してください。</p><div class="battle-choices">${q.choices.map((_,i)=>`<button type="button" data-battle-choice="${i}" class="battle-choice ${selection.includes(i)?'is-selected':''} ${review&&correctOptions.has(i)?'is-correct':''} ${review&&selection.includes(i)&&!correctOptions.has(i)?'is-wrong':''}" aria-pressed="${selection.includes(i)}" ${locked?'disabled':''}><span>${i+1}</span><span>${review?`<small class="battle-option-state">${correctOptions.has(i)?"○ 正答":"× 正答ではありません"}${selection.includes(i)?" · あなたの回答":""}</small>`:""}${esc(choiceTextForDisplay(q,i))}</span></button>`).join('')}</div>${review?`<section class="battle-review"><h3>${s.own_answer?.correct?'正解！':'正答を確認しましょう'}</h3><p>正答：${correctSets.map(set=>set.map(i=>i+1).join('・')).join(' または ')}</p><details><summary>選択肢ごとの解説</summary>${q.notes.map((note,i)=>`<article><b>${correctOptions.has(i)?'○':'×'} ${i+1}. ${esc(choiceTextForDisplay(q,i))}</b><p>${esc(note)}</p></article>`).join('')}<p>学習用AI解説（非公式）</p></details></section>`:`<button type="button" class="battle-primary battle-answer" data-battle="answer" ${answered?'disabled':''}>${answered?'回答済み · みんなの回答を待っています':'回答を確定する'}</button>`}</section>`}`;
 syncSelection();
}
function syncSelection(){
 content.querySelectorAll('[data-battle-choice]').forEach(b=>{const selected=selection.includes(+b.dataset.battleChoice);b.classList.toggle('is-selected',selected);b.setAttribute('aria-pressed',String(selected));b.disabled=requestBusy||snapshot?.players.some(p=>p.username===me()&&p.forfeited)||snapshot?.phase!=='question'||Boolean(snapshot?.own_answer)});
 const button=content.querySelector('[data-battle="answer"]'),q=fullBank.find(q=>q.id===snapshot?.question_id);if(button)button.disabled=requestBusy||snapshot?.players.some(p=>p.username===me()&&p.forfeited)||Boolean(snapshot?.own_answer)||!q||!canSubmitAnswer(q,selection);
}
function tick(){const matchTimer=content.querySelector('#battleMatchTimer');if(matchTimer&&snapshot)matchTimer.textContent=snapshot.match_start_at?`開始まで ${Math.max(0,Math.ceil((stamp(snapshot.match_start_at)-now())/1000))}秒`:'相手が見つかるまでお待ちください。';const target=content.querySelector('#battleTimer');if(!target||!snapshot)return;const phase=snapshot.phase,end=phase==='review'?snapshot.review_until:phase==='countdown'?snapshot.round_started_at:snapshot.deadline_at;const seconds=Math.max(0,Math.ceil((stamp(end)-now())/1000));target.textContent=phase==='review'?`解説終了まで ${seconds}秒`:phase==='countdown'?`開始まで ${seconds}秒`:`残り ${seconds}秒`;target.classList.toggle('is-urgent',phase==='question'&&seconds<=15);}
function startPolling(){stop();const current=generation;tickTimer=setInterval(tick,200);const poll=async()=>{if(!open||current!==generation||!room)return;try{const data=await request('state',{p_room_code:room});if(current!==generation||!open)return;apply(data);if(notice.dataset.connection==='error'){message('再接続しました。');notice.dataset.connection=''}}catch(error){if(current!==generation)return;if(['ROOM_EXPIRED','ROOM_NOT_FOUND','NOT_MEMBER','AUTH_REQUIRED'].includes(error.code)){stop();if(snapshot?.phase==='lobby'&&snapshot?.match_kind==='random'&&error.code!=='AUTH_REQUIRED'){room=snapshot=null;selection=[];saveRoom();homeView()}message(friendly(error),true);return}notice.dataset.connection='error';message('通信を確認しています。再接続しても回答は保持されます。',true)}if(current===generation&&open&&snapshot?.phase!=='finished')pollTimer=setTimeout(poll,1000)};pollTimer=setTimeout(poll,1000)}
async function act(action){
 if(requestBusy)return;
 if(action==='cancel'){
  requestBusy=true;const current=generation;
  try{await request('cancel',{p_room_code:room});if(current!==generation||!open)return;stop();room=snapshot=null;selection=[];saveRoom();homeView();message('マッチングをキャンセルしました。')}
  catch(error){if(error.code==='MATCH_STARTED'){try{apply(await request('state',{p_room_code:room}))}catch{}}message(friendly(error),true)}finally{requestBusy=false}return;
 }
 if(action==='copy'){try{await navigator.clipboard.writeText(room);message('ルーム番号をコピーしました。')}catch{message(`ルーム番号は ${room} です。`)}return}
 if(action==='exit'){
  if(room&&snapshot?.phase!=='finished'&&!confirm(snapshot?.phase==='lobby'?'ルームから退出しますか？':'途中退出すると負けになります。退出しますか？'))return;
  if(room&&snapshot?.phase!=='finished'){try{await request('leave',{p_room_code:room})}catch(error){if(error.code==='AUTH_REQUIRED'){stop();open=false;screen.hidden=true;showTitle();return}if(!['ROOM_EXPIRED','ROOM_NOT_FOUND','NOT_MEMBER'].includes(error.code)){message('退出を確認できませんでした。通信が戻ってからもう一度お試しください。',true);return}}}
  stop();open=false;room=snapshot=null;selection=[];saveRoom();screen.hidden=true;showTitle();return;
 }
 if(action==='new'){stop();room=snapshot=null;selection=[];saveRoom();homeView();message();return}
 requestBusy=true;syncSelection();content.querySelectorAll('[data-battle="match"],[data-battle="create"],[data-battle="start"],#battleJoinForm button').forEach(b=>b.disabled=true);message();const current=generation;
 try{
  let data;
  if(action==='match')data=await request('match');
  if(action==='create')data=await request('create');
  if(action==='join'){const code=content.querySelector('#battleRoomCode').value.trim();if(!/^\d{6}$/.test(code))throw new Error('6桁のルーム番号を入力してください。');data=await request('join',{p_room_code:code})}
  if(action==='start')data=await request('start',{p_room_code:room});
  if(action==='answer')data=await request('answer',{p_room_code:room,p_round_index:snapshot.round_index,p_selection:selection});
  if(current!==generation||!open)return;
  if(data){apply(data);if(action==='match'||action==='create'||action==='join'||action==='start')startPolling()}
 }catch(error){message(friendly(error),true)}finally{requestBusy=false;syncSelection();content.querySelectorAll('[data-battle="match"],[data-battle="create"],#battleJoinForm button').forEach(b=>b.disabled=false);const start=content.querySelector('[data-battle="start"]');if(start)start.disabled=(snapshot?.players.length||0)<2}
}
screen.addEventListener('click',e=>{const choice=e.target.closest('[data-battle-choice]');if(choice&&!choice.disabled){const i=+choice.dataset.battleChoice,q=fullBank.find(q=>q.id===snapshot.question_id);selection=q.acceptedAnswerSets[0].length===1?[i]:selection.includes(i)?selection.filter(n=>n!==i):[...selection,i];syncSelection();return}const button=e.target.closest('[data-battle]');if(button&&!button.disabled)act(button.dataset.battle)});
screen.addEventListener('submit',e=>{if(e.target.id==='battleJoinForm'){e.preventDefault();act('join')}});
document.querySelector('#openBattleButton').onclick=openBattle;
document.addEventListener('keydown',e=>{if(!open)return;if(!e.target.matches('input,textarea,select')){if(/^[1-5]$/.test(e.key))content.querySelector(`[data-battle-choice="${+e.key-1}"]`)?.click();if(e.key==='Enter'&&e.target===document.body)content.querySelector('[data-battle="answer"]')?.click()}e.stopPropagation()},true);
})();
