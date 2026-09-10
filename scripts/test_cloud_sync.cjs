const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('cloud-sync.js','utf8'),S='recare-cloud-session',P='recare-cloud-pending:alice';
function app(seed={},online=true){
 const values=new Map(Object.entries({[S]:JSON.stringify({username:'alice',token:'t1'}),'recare-active-user':'alice',...seed}));
 const timers=new Map(),listeners={},calls=[],events=[];let sequence=0,answer=async()=>true;
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
 const window={RECARE_CLOUD_CONFIG:{url:'https://example.supabase.co',publishableKey:'x'.repeat(30)},addEventListener:(n,f)=>{(listeners[n]??=[]).push(f)},dispatchEvent:e=>{events.push(e.detail);for(const f of listeners[e.type]||[])f(e)}};
 const context={window,localStorage:storage,navigator:{onLine:online},document:{addEventListener(){},visibilityState:'visible'},AbortController,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},setTimeout:(f,ms)=>{const id=++sequence;timers.set(id,{f,ms});return id},clearTimeout:id=>timers.delete(id),fetch:async(url,opts)=>{const body=JSON.parse(opts.body);calls.push({url,body});const data=await answer(body,opts);return {ok:true,json:async()=>data}}};
 vm.runInNewContext(source,context);
 return {api:window.RECARE_CLOUD,storage,values,timers,calls,events,context,setAnswer:f=>answer=f,emit:n=>{for(const f of listeners[n]||[])f({})},run:async()=>{const entry=[...timers].sort((a,b)=>a[1].ms-b[1].ms)[0];assert(entry,'scheduled work');timers.delete(entry[0]);await entry[1].f()}};
}
(async()=>{
 // Mutating the caller's object cannot change a queued snapshot.
 let a=app(),profile={answered:1};a.api.save(profile);profile.answered=99;await a.run();assert.equal(a.calls[0].body.p_profile.answered,1);assert.equal(a.api.status(),'saved');assert.equal(a.storage.getItem(P),null);
 // No network requests offline; reconnect retries without another answer.
 a=app({},false);a.api.save({answered:2});await a.run();assert.equal(a.calls.length,0);assert(a.storage.getItem(P));a.context.navigator.onLine=true;a.emit('online');await a.run();assert.equal(a.calls.length,1);
 // Transient failure keeps the newest snapshot and retries automatically.
 a=app();a.setAnswer(async()=>{throw Error('network')});a.api.save({answered:3});await a.run();assert.equal(a.api.status(),'pending');assert([...a.timers.values()].some(t=>t.ms===3000));a.api.save({answered:4});a.setAnswer(async()=>true);await a.run();assert.equal(a.calls[1].body.p_profile.answered,4);
 // A save completing during another answer must not remove that new answer.
 a=app();let release;a.setAnswer(()=>new Promise(r=>release=r));a.api.save({answered:5});let running=a.run();await Promise.resolve();a.api.save({answered:6});release(true);await running;assert.equal(JSON.parse(a.storage.getItem(P)).answered,6);a.setAnswer(async()=>true);await a.run();assert.equal(a.calls.at(-1).body.p_profile.answered,6);
 // A failed older request must not overwrite a newer queued profile.
 a=app();let reject;a.setAnswer(()=>new Promise((r,j)=>reject=j));a.api.save({answered:7});running=a.run();await Promise.resolve();a.api.save({answered:8});reject(Error('offline'));await running;assert.equal(JSON.parse(a.storage.getItem(P)).answered,8);
 // Invalid session stops repeated requests, but preserves further answers.
 a=app();a.setAnswer(async()=>false);a.api.save({answered:9});await a.run();assert.equal(a.api.status(),'auth');a.api.save({answered:10});a.emit('focus');await a.run();assert.equal(a.calls.length,1);a.api.logout();assert.equal(JSON.parse(a.storage.getItem(P)).answered,10);
 // Reload resumes a pending account; it never sends another account's queue.
 a=app({[P]:'{"answered":11}','recare-cloud-pending:bob':'{"answered":50}'});await a.run();assert.equal(a.calls[0].body.p_username,'alice');assert(a.storage.getItem('recare-cloud-pending:bob'));
 // Legacy migration requires a matching signed-in account.
 a=app({'recare-cloud-pending':'{"answered":12}'});assert(a.storage.getItem(P));assert.equal(a.storage.getItem('recare-cloud-pending'),null);
 a=app({'recare-cloud-pending':'{"answered":12}','recare-active-user':'bob'});assert.equal(a.storage.getItem(P),null);assert(a.storage.getItem('recare-cloud-pending'));
 // Login must not silently replace divergent unsynced records.
 a=app({[P]:'{"answered":13}'});a.setAnswer(async()=>({username:'alice',display_name:'Alice',session_token:'t2',is_new:false,profile:{answered:20}}));let result=await a.api.login('alice','1234','Alice');assert.equal(result.conflict.local.answered,13);assert.equal(result.conflict.cloud.answered,20);assert(a.storage.getItem('recare-cloud-recovery:alice'));a.emit('focus');await a.run();assert.equal(a.calls.length,1);
 // Conflict stays blocked across reloads, until explicitly resolved.
 const reloaded=app(Object.fromEntries(a.values));await reloaded.run();assert.equal(reloaded.calls.length,0);a.api.resolveConflict(result.conflict.local);a.setAnswer(async()=>true);await a.run();assert.equal(a.calls.at(-1).body.p_profile.answered,13);
 // Account rename carries the pending profile to the new account name.
 a=app({[P]:'{"answered":14}'});a.setAnswer(async()=>({username:'renamed',display_name:'Renamed'}));await a.api.updateAccount('renamed','');assert.equal(a.storage.getItem(P),null);assert.equal(JSON.parse(a.storage.getItem('recare-cloud-pending:renamed')).answered,14);
 // A stalled save is aborted and remains queued for retry.
 a=app();a.setAnswer((body,opts)=>new Promise((r,j)=>opts.signal.addEventListener('abort',()=>j(Error('timeout')))));a.api.save({answered:15});running=a.run();await Promise.resolve();await a.run();await running;assert.equal(a.api.status(),'pending');assert(a.storage.getItem(P));
 console.log('PASS: cloud queue, retries, timeout, session expiry, account isolation, logout retention, login conflicts and rename');
})().catch(e=>{console.error(e);process.exitCode=1});
