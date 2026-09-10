(()=>{
const cfg=window.RECARE_CLOUD_CONFIG||{},SESSION="recare-cloud-session",PENDING="recare-cloud-pending";
const enabled=()=>/^https:\/\/.+\.supabase\.co$/.test(cfg.url)&&String(cfg.publishableKey||'').length>20;
async function rpc(name,body,signal){
 const controller=signal?null:new AbortController(),timeout=controller?setTimeout(()=>controller.abort(),15000):null;
 try{const response=await fetch(`${cfg.url}/rest/v1/rpc/${name}`,{method:'POST',signal:signal||controller.signal,headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json().catch(()=>null);if(!response.ok)throw Object.assign(new Error(data?.message||data?.error||'クラウドへ接続できません'),{code:data?.code,status:response.status});return data}finally{if(timeout)clearTimeout(timeout)}
}
function session(){try{return JSON.parse(localStorage.getItem(SESSION))}catch{return null}}
async function login(username,pin,displayName,mode='login'){
// Existing recare_login creates missing users. A NULL display name makes that
// INSERT fail atomically on recare_users.display_name NOT NULL, while existing
// users can still authenticate. Never supply a creation name from the login UI.
let data;
try{data=await rpc("recare_login",{p_username:username,p_pin:pin,p_display_name:mode==='register'?displayName:null})}
catch(error){if(mode==='login'&&error.code==='23502')throw new Error('ユーザーネームまたは4桁コードを確認してください。未登録の場合は新規登録画面から登録してください。');throw error}
if(data?.error)throw new Error(data.error);
if(mode==='register'&&!data.is_new)throw new Error('この名前は登録済みです。ログイン画面からログインしてください。');
if(mode!=='register'&&data.is_new)throw new Error('ログイン処理を確認できません。管理者にお問い合わせください。');
migratePending();clearTimeout(timer);
const s={username:data.username,displayName:data.display_name,token:data.session_token,isAdmin:data.is_admin===true};let profile=data.profile,conflict=null;
localStorage.setItem(SESSION,JSON.stringify(s));blockedToken=null;failures=0;
const raw=localStorage.getItem(pendingKey(s.username));
if(raw){
 const local=JSON.parse(raw);
 if(JSON.stringify(local)!==JSON.stringify(profile)){
  conflict={local,cloud:profile};heldUsername=s.username;localStorage.setItem(`recare-cloud-conflict:${s.username}`,'1');
  localStorage.setItem(`recare-cloud-recovery:${s.username}`,JSON.stringify({at:new Date().toISOString(),...conflict}));
 }else{localStorage.removeItem(pendingKey(s.username));localStorage.removeItem(`recare-cloud-conflict:${s.username}`)}
}else if(data.is_new){
 const rawLocal=localStorage.getItem(`recare-profile-v1:${s.username}`)||localStorage.getItem('recare-profile-v1');
 try{const local=JSON.parse(rawLocal);if(local?.answered>0){profile=local;queue(profile,s.username)}}catch{}
}
return{session:s,profile,isNew:data.is_new,conflict}}
let timer,inFlight=false,failures=0,blockedToken=null,blockedStatus='auth',currentStatus='local',heldUsername=null;
const pendingKey=username=>`${PENDING}:${username}`;
function status(value){currentStatus=value;window.dispatchEvent(new CustomEvent('recare-cloud-status',{detail:value}))}
function migratePending(){const s=session(),raw=localStorage.getItem(PENDING);if(s&&raw&&localStorage.getItem('recare-active-user')===s.username){if(!localStorage.getItem(pendingKey(s.username)))localStorage.setItem(pendingKey(s.username),raw);localStorage.removeItem(PENDING)}}
function schedule(delay=700){clearTimeout(timer);timer=setTimeout(flush,delay)}
async function flush(){
 clearTimeout(timer);timer=null;const s=session();if(!enabled()||inFlight)return;
 if(!s){status('local');return}
 if(heldUsername===s.username||localStorage.getItem(`recare-cloud-conflict:${s.username}`)){status('auth');return}
 const key=pendingKey(s.username),raw=localStorage.getItem(key);if(!raw)return;
 if(blockedToken===s.token){status(blockedStatus);return}
 if(navigator.onLine===false){status('offline');return}
 let profile;try{profile=JSON.parse(raw)}catch{status('error');return}
 inFlight=true;status('syncing');const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const ok=await rpc('recare_save',{p_username:s.username,p_session_token:s.token,p_profile:profile},controller.signal);
  if(ok!==true)throw Object.assign(new Error('再ログインが必要です'),{code:ok===false?'SESSION_EXPIRED':'SAVE_FAILED'});
  if(localStorage.getItem(key)===raw)localStorage.removeItem(key);
  if(session()?.token===s.token){failures=0;status(localStorage.getItem(key)?'pending':'saved')}
 }catch(error){
  if(session()?.token===s.token){
   if(error.code==='SESSION_EXPIRED'){blockedToken=s.token;blockedStatus='auth';status('auth')}
   else if(error.code==='22023'){blockedToken=s.token;blockedStatus='invalid';status('invalid')}
   else{failures++;status(navigator.onLine===false?'offline':'pending')}
  }
 }finally{
  clearTimeout(timeout);inFlight=false;
  const active=session();if(active&&localStorage.getItem(pendingKey(active.username))&&blockedToken!==active.token&&navigator.onLine!==false)schedule(failures?Math.min(60000,3000*2**Math.min(failures-1,5)):700);
 }
}
function queue(profile,username){localStorage.setItem(pendingKey(username),JSON.stringify(profile));if(blockedToken===session()?.token)status(blockedStatus);else{status(navigator.onLine===false?'offline':'pending');if(!failures||!timer)schedule(failures?Math.min(60000,3000*2**Math.min(failures-1,5)):700)}}
function save(profile){if(!enabled())return;const username=localStorage.getItem('recare-active-user');if(!username)return;queue(profile,username)}
async function logout(){
 const s=session();migratePending();clearTimeout(timer);timer=null;heldUsername=null;blockedToken=null;localStorage.removeItem(SESSION);status('local');
 if(!s||!enabled())return true;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
 try{return await rpc('recare_logout',{p_username:s.username,p_session_token:s.token},controller.signal)===true}catch{return false}finally{clearTimeout(timeout)}
}
async function updateAccount(newUsername,newPin){
 const s=session();if(!s)throw new Error('再ログインが必要です');if(inFlight)throw new Error('記録を同期中です。少し待ってから変更してください。');
 clearTimeout(timer);heldUsername=s.username;
 try{
  const data=await rpc('recare_update_account',{p_username:s.username,p_session_token:s.token,p_new_username:newUsername,p_new_pin:newPin||null});if(data?.error)throw new Error(data.error);
  if(s.username!==data.username)for(const prefix of [PENDING,'recare-cloud-recovery','recare-cloud-conflict']){const key=`${prefix}:${s.username}`,raw=localStorage.getItem(key);if(raw){localStorage.setItem(`${prefix}:${data.username}`,raw);localStorage.removeItem(key)}}
  s.username=data.username;s.displayName=data.display_name;s.token=data.session_token||s.token;s.isAdmin=data.is_admin===true;blockedToken=null;localStorage.setItem(SESSION,JSON.stringify(s));return s;
 }finally{heldUsername=null;schedule(1000)}
}
async function deleteAccount(){let s=session();if(!s)throw new Error("再ログインが必要です");let ok=await rpc("recare_delete_account",{p_username:s.username,p_session_token:s.token});if(!ok)throw new Error("退会処理を完了できませんでした");for(const prefix of [PENDING,'recare-cloud-recovery','recare-cloud-conflict'])localStorage.removeItem(`${prefix}:${s.username}`);logout();return true}
async function leaderboard(limit=50){return await rpc("recare_leaderboard",{p_limit:limit})}
async function challengeLeaderboard(kind,limit=50){return await rpc("recare_challenge_leaderboard",{p_kind:kind,p_limit:limit})}
async function adminDashboard(){let s=session();if(!s)throw new Error("再ログインが必要です");return await rpc("recare_admin_dashboard",{p_username:s.username,p_session_token:s.token})}
window.addEventListener('online',()=>schedule(0));
window.addEventListener('offline',()=>{clearTimeout(timer);status('offline')});
window.addEventListener('focus',()=>schedule(0));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(0)});
window.addEventListener('storage',e=>{if(e.key===SESSION){blockedToken=null;failures=0;schedule(0)}});
async function battle(action,args={}){
  if(!['create','join','state','start','answer','leave','match','cancel'].includes(action))throw new Error('対戦操作を確認できません。');
  const s=session();if(!enabled()||!s?.token)throw new Error('オンライン対戦には再ログインが必要です。');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{const data=await rpc('recare_battle_'+action,{...args,p_username:s.username,p_session_token:s.token},controller.signal);
  if(data?.error)throw Object.assign(new Error(data.error),{code:data.error_code});return data;}finally{clearTimeout(timer)}
}
window.RECARE_CLOUD={enabled,login,save,logout,session,updateAccount,deleteAccount,leaderboard,challengeLeaderboard,adminDashboard,battle,status:()=>currentStatus,retry:()=>schedule(0),resolveConflict:profile=>{const username=session().username;heldUsername=null;localStorage.removeItem(`recare-cloud-conflict:${username}`);queue(profile,username)}};
migratePending();if(session()&&localStorage.getItem(pendingKey(session().username))){currentStatus=navigator.onLine===false?'offline':'pending';schedule(1000)}
})();
