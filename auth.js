(()=>{
const USERS="recare-local-accounts",ACTIVE="recare-active-user";
const normalize=s=>s.trim().toLowerCase(),escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function hash(text){let data=new TextEncoder().encode(`RECARE:${text}:LOCAL`),digest=await crypto.subtle.digest("SHA-256",data);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function accounts(){try{return JSON.parse(localStorage.getItem(USERS))||{}}catch{return{}}}
let authMode='login',submitting=false;
function gate(){
  document.body.insertAdjacentHTML("afterbegin",`<section class="auth-gate" id="authGate"><div class="auth-grid"></div><form class="auth-card" id="authForm"><div class="auth-brand">RE:<span>CARE</span></div><h1 id="authHeading"></h1><p class="auth-lead" id="authLead"></p><label>ユーザーネーム<input id="loginName" autocomplete="username" maxlength="20" required placeholder="例：nurse01" autocapitalize="none" spellcheck="false"></label><label>4桁コード<div class="pin-wrap"><input id="loginPin" type="password" inputmode="numeric" autocomplete="current-password" pattern="[0-9]{4}" maxlength="4" required placeholder="••••"><button type="button" id="pinReveal" aria-label="コードを表示">表示</button></div></label><label id="confirmPinLabel" hidden>4桁コード（確認）<input id="confirmPin" type="password" inputmode="numeric" autocomplete="new-password" pattern="[0-9]{4}" maxlength="4" placeholder="もう一度入力"></label><button class="auth-submit" type="submit"></button><p class="auth-message" id="authMessage" role="status" aria-live="polite"></p><p class="auth-switch"><span id="authSwitchLead"></span><button type="button" id="authSwitch"></button></p><p class="auth-note" id="authNote"></p></form></section>`);
  $("#pinReveal").onclick=()=>{const pin=$("#loginPin");pin.type=pin.type==="password"?"text":"password";$("#pinReveal").textContent=pin.type==="password"?"表示":"隠す";$("#pinReveal").setAttribute('aria-label',pin.type==="password"?'コードを表示':'コードを隠す')};
  $("#authSwitch").onclick=()=>setAuthMode(authMode==='login'?'register':'login',true);
  $("#authForm").onsubmit=login;
  setAuthMode('login');
}
function setAuthMode(mode,focus=false){
  if(submitting)return;
  authMode=mode;const register=mode==='register';
  $("#authHeading").textContent=register?'新規登録':'病棟端末にログイン';
  $("#authLead").textContent=register?'ユーザーネームと4桁コードを決めて、学習を始めましょう。':'登録済みのユーザーネームと4桁コードで、学習記録を呼び出します。';
  $("#authForm").dataset.mode=mode;
  $("#loginPin").autocomplete=register?'new-password':'current-password';
  $("#loginPin").value='';$("#loginPin").type='password';$("#pinReveal").textContent='表示';$("#pinReveal").setAttribute('aria-label','コードを表示');
  $("#confirmPinLabel").hidden=!register;$("#confirmPin").required=register;$("#confirmPin").disabled=!register;$("#confirmPin").value='';
  $(".auth-submit").textContent=register?'登録して始める →':'ログイン →';
  $("#authSwitchLead").textContent=register?'すでに登録済みの方':'初めて利用する方';
  $("#authSwitch").textContent=register?'ログイン画面へ':'新規登録画面へ';
  $("#authMessage").textContent='';
  $("#authNote").textContent=window.RECARE_CLOUD?.enabled()?'学習記録はクラウドに保存されます。4桁コードを忘れた場合の復旧には対応していません。':'このログインはこの端末内だけで使用されます。4桁コードを忘れた場合の復旧や、別端末との同期には対応していません。';
  if(focus){$("#authGate").scrollTop=0;$("#loginName").focus()}
}
async function login(e){
  e.preventDefault();if(submitting)return;
  const button=e.currentTarget.querySelector('.auth-submit'),display=$("#loginName").value.trim(),key=normalize(display),pin=$("#loginPin").value,register=authMode==='register';
  if(!/^[0-9]{4}$/.test(pin)){$("#authMessage").textContent='4桁の数字を入力してください。';return}
  if(!/^[\p{L}\p{N}_-]{2,20}$/u.test(display)){$("#authMessage").textContent='名前は2〜20文字の英数字・日本語・_・-で入力してください。';return}
  if(register&&pin!==$("#confirmPin").value){$("#authMessage").textContent='確認用の4桁コードが一致しません。';return}
  submitting=true;button.disabled=true;$("#authSwitch").disabled=true;$("#authMessage").textContent=register?'登録しています…':'学習記録を確認しています…';
  try{
    const db=accounts(),exists=Object.hasOwn(db,key),codeHash=await hash(`${key}:${pin}`);
    if(window.RECARE_CLOUD?.enabled()){
      const result=await window.RECARE_CLOUD.login(key,pin,display,register?'register':'login');
      db[key]={name:result.session.displayName,hash:codeHash,cloud:true};
      localStorage.setItem(USERS,JSON.stringify(db));localStorage.setItem(`recare-profile-v1:${key}`,JSON.stringify(result.profile));
    }else{
      if(register&&exists)throw new Error('この名前は登録済みです。ログイン画面からログインしてください。');
      if(!register&&!exists)throw new Error('この名前は未登録です。新規登録画面から登録してください。');
      if(!register&&db[key].hash!==codeHash)throw new Error('4桁コードが違います。');
      if(register){db[key]={name:display,hash:codeHash,createdAt:new Date().toISOString()};localStorage.setItem(USERS,JSON.stringify(db));const legacy=localStorage.getItem('recare-profile-v1');if(legacy&&!localStorage.getItem(`recare-profile-v1:${key}`))localStorage.setItem(`recare-profile-v1:${key}`,legacy)}
    }
    localStorage.setItem(ACTIVE,key);location.reload();
  }catch(error){$("#authMessage").textContent=error.message;submitting=false;button.disabled=false;$("#authSwitch").disabled=false}
}
function accountUI(key){let db=accounts(),name=db[key]?.name||key,top=document.querySelector(".topbar");top?.insertAdjacentHTML("beforeend",`<button class="account-chip" id="accountMenuButton" type="button" aria-label="マイページを開く"><i>${escapeHTML(name.slice(0,1).toUpperCase())}</i><span>${escapeHTML(name)}</span><small>MY PAGE</small></button>`);document.querySelector(".title-actions")?.insertAdjacentHTML("beforebegin",`<p class="welcome-user">SIGNED IN AS <b>${escapeHTML(name)}</b>${window.RECARE_CLOUD?.enabled()?" · CLOUD SYNC":" · THIS DEVICE"}</p>`)}
let active=localStorage.getItem(ACTIVE);if(active&&accounts()[active])accountUI(active);else{localStorage.removeItem(ACTIVE);gate()}
})();
