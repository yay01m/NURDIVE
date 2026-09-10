const {PGlite}=require('../tmp/battle-sql-runtime/node_modules/@electric-sql/pglite');
const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 await db.exec('create role anon;create role authenticated;create table recare_users(username text primary key,display_name text,session_token uuid,token_expires_at timestamptz)');
 const names=['alice','bob','carol','dan','eve'],tokens=Object.fromEntries(names.map((n,i)=>[n,`00000000-0000-0000-0000-00000000000${i+1}`]));
 for(const n of names)await db.query("insert into recare_users values($1,$1,$2,now()+interval '1 day')",[n,tokens[n]]);
 for(let i=0;i<2;i++)await db.exec(fs.readFileSync('setup/battle-install.sql','utf8'));
 await db.exec(fs.readFileSync('setup/battle-four-player-update.sql','utf8'));
 const rpc=async(action,n,...args)=>{const p=[n,tokens[n],...args];return (await db.query(`select recare_battle_${action}(${p.map((_,i)=>'$'+(i+1)).join(',')}) value`,p)).rows[0].value};
 const advance=async code=>db.query("update recare_battle_rooms set round_started_at=now()-interval '1 second',review_until=now()-interval '1 second' where code=$1",[code]);
 const make=async count=>{const s=await rpc('create','alice');for(const n of names.slice(1,count))assert(!(await rpc('join',n,s.room_code)).error);return s.room_code};
 let c=await make(4);assert.equal((await rpc('join','dan',c)).players.length,4);assert((await rpc('join','eve',c)).error);assert((await rpc('start','bob',c)).error);
 let s=await rpc('start','alice',c);assert.equal(s.phase,'countdown');assert((await rpc('join','eve',c)).error);
 for(let round=0;round<10;round++){
  await advance(c);s=await rpc('state','alice',c);if(s.phase==='countdown'){await advance(c);s=await rpc('state','alice',c)}assert.equal(s.round_index,round);
  const q=(await db.query('select q.* from recare_battle_rooms r join recare_battle_questions q on q.id=r.question_ids[r.round_index+1] where code=$1',[c])).rows[0];
  for(const [i,n] of names.slice(0,4).entries()){
   s=await rpc('answer',n,c,round,q.answer_sets[0]);assert.equal(s.phase,i===3?'review':'question');if(i<3)assert.equal(s.correct_answers,null);
  }
  await db.query('update recare_battle_answers set elapsed_ms=case username when \'alice\' then 1000 when \'bob\' then 1000 when \'carol\' then 2000 else 3000 end where room_code=$1',[c]);
 }
 await advance(c);s=await rpc('state','dan',c);assert.equal(s.phase,'finished');assert.equal(s.result.reason,'draw');assert.deepEqual(s.players.map(p=>p.rank),[1,1,3,4]);assert.equal(s.reviews.length,10);
 c=await make(4);await rpc('start','alice',c);await advance(c);
 s=await rpc('leave','alice',c);assert.equal(s.phase,'question');assert(s.players.find(p=>p.username==='alice').forfeited);assert.equal((await rpc('answer','alice',c,0,[0])).error_code,'FORFEITED');
 const newRoom=(await rpc('create','alice')).room_code;assert.notEqual(newRoom,c);await rpc('leave','alice',newRoom);
 await db.query("update recare_battle_rooms set deadline_at=now()-interval '1 second' where code=$1",[c]);s=await rpc('state','bob',c);assert.equal(s.phase,'review');assert.equal(s.own_answer.elapsed_ms,150000);
 assert.equal((await db.query('select count(*)::int n from recare_battle_answers where room_code=$1',[c])).rows[0].n,3);
 await rpc('leave','bob',c);s=await rpc('leave','carol',c);assert.equal(s.result.winner_username,'dan');assert.equal(s.players[0].rank,1);assert(s.players.slice(1).every(p=>p.rank===null));
 c=await make(3);await rpc('start','alice',c);await advance(c);const key=(await db.query('select q.answer_sets from recare_battle_rooms r join recare_battle_questions q on q.id=r.question_ids[1] where code=$1',[c])).rows[0].answer_sets[0];
 await rpc('answer','alice',c,0,key);await rpc('answer','bob',c,0,key);s=await rpc('leave','carol',c);assert.equal(s.phase,'review');s=await rpc('leave','alice',c);assert.equal(s.result.winner_username,'bob');
 c=await make(2);s=await rpc('start','alice',c);assert.equal(s.phase,'countdown');s=await rpc('leave','bob',c);assert.equal(s.result.winner_username,'alice');
 console.log('PASS: repeatable migration; 2/3/4 players; fifth rejected; host-only start; ten synchronized rounds; shared first place and ranks; forfeit continuation; early reveal after forfeit; timeout; sole-survivor victory; forfeited player may create another room.');await db.close();
})().catch(e=>{console.error(e);process.exitCode=1});
