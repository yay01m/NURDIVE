const fs=require('fs'),assert=require('node:assert/strict');
const {PGlite}=require('../tmp/battle-sql-runtime/node_modules/@electric-sql/pglite');
(async()=>{
 const db=new PGlite();await db.exec("create role anon;create role authenticated;create table recare_users(username text primary key,display_name text,session_token uuid,token_expires_at timestamptz)");
 const names=['a','b','c','d','e','f'],tokens={};for(let i=0;i<names.length;i++){tokens[names[i]]=`00000000-0000-0000-0000-00000000000${i+1}`;await db.query("insert into recare_users values($1,$1,$2,now()+interval '1 day')",[names[i],tokens[names[i]]])}
 await db.exec(fs.readFileSync('setup/battle-install.sql','utf8'));for(let i=0;i<2;i++)await db.exec(fs.readFileSync('setup/battle-random-match-update.sql','utf8'));
 const rpc=async(action,n,...args)=>{const values=[n,tokens[n],...args];return (await db.query(`select recare_battle_${action}(${values.map((_,i)=>'$'+(i+1)).join(',')}) x`,values)).rows[0].x};
 const clear=()=>db.exec('delete from recare_battle_rooms');
 let s=await rpc('match','a'),code=s.room_code;assert.equal(s.match_kind,'random');assert.equal(s.match_start_at,null);assert.equal((await rpc('match','a')).room_code,code);
 assert((await rpc('join','b',code)).error);s=await rpc('match','b');assert.equal(s.room_code,code);assert.equal(s.players.length,2);assert.equal(Date.parse(s.match_start_at)-Date.parse(s.server_now),15000);
 assert((await rpc('start','a',code)).error);assert.equal((await rpc('state','a',code)).phase,'lobby');
 await rpc('match','c');s=await rpc('match','d');assert.equal(s.phase,'countdown');assert.equal(s.players.length,4);assert.notEqual((await rpc('match','e')).room_code,code);assert.equal((await rpc('cancel','a',code)).error_code,'MATCH_STARTED');
 await db.query("update recare_battle_rooms set round_started_at=now()-interval '1 second' where code=$1",[code]);
 const q=(await db.query('select q.answer_sets from recare_battle_rooms r join recare_battle_questions q on q.id=r.question_ids[1] where code=$1',[code])).rows[0];
 for(const [i,n] of names.slice(0,4).entries()){s=await rpc('answer',n,code,0,q.answer_sets[0]);assert.equal(s.phase,i===3?'review':'question')}
 await clear();code=(await rpc('match','a')).room_code;await rpc('match','b');assert((await rpc('cancel','a',code)).left);s=await rpc('state','b',code);assert.equal(s.players.length,1);assert.equal(s.match_start_at,null);assert.equal(s.host_username,'b');assert((await rpc('cancel','b',code)).left);
 await clear();code=(await rpc('match','a')).room_code;await rpc('match','b');await db.query("update recare_battle_rooms set match_start_at=now()-interval '1 second' where code=$1",[code]);s=await rpc('state','b',code);assert.equal(s.phase,'countdown');assert.equal(s.players.length,2);
 await clear();code=(await rpc('match','a')).room_code;await rpc('match','b');await rpc('match','c');await db.query("update recare_battle_rooms set match_start_at=now()-interval '1 second' where code=$1",[code]);assert.equal((await rpc('state','a',code)).players.length,3);assert.equal((await rpc('state','c',code)).phase,'countdown');
 await clear();code=(await rpc('match','a')).room_code;await rpc('match','b');await db.query("update recare_battle_players set last_seen_at=now()-interval '31 seconds' where username='a'",[]);s=await rpc('state','b',code);assert.equal(s.players.length,1);assert.equal(s.match_start_at,null);assert.equal((await rpc('state','a',code)).error_code,'NOT_MEMBER');assert.equal((await rpc('match','a')).players.length,2);
 await clear();code=(await rpc('create','a')).room_code;assert.notEqual((await rpc('match','b')).room_code,code);assert.equal((await rpc('match','a')).room_code,code);assert.equal((await rpc('state','a',code)).match_kind,'friend');
 await db.exec('set role anon');assert.equal((await rpc('match','c')).match_kind,'random');await assert.rejects(db.exec('select * from recare_battle_players'),/permission denied/);await db.exec('reset role');
 console.log('PASS: random queue, retry, friend isolation, 2/3-player timed start, 4-player immediate start, capacity, cancellation, start/cancel race, stale presence, reconnect, synchronized answers, anonymous RPC with session authentication, repeatable migration');await db.close();
})().catch(e=>{console.error(e);process.exitCode=1});
