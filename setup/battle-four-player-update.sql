-- Upgrade existing friend battles to 2-4 players without deleting records.
BEGIN;
-- Run after supabase-schema.sql, then load battle question catalog seed.
-- All gameplay writes and scoring run on the server; clients can only call RPCs.
create table if not exists public.recare_battle_questions (
  id text primary key,
  choice_count integer not null check (choice_count between 2 and 10),
  answer_sets jsonb not null check (jsonb_typeof(answer_sets)='array' and jsonb_array_length(answer_sets)>0)
);
create table if not exists public.recare_battle_rooms (
  code text primary key check (code ~ '^[0-9]{6}$'),
  host_username text not null,
  status text not null default 'lobby' check (status in ('lobby','playing','review','finished')),
  question_ids text[] not null default '{}',
  round_index integer not null default 0,
  round_started_at timestamptz,
  deadline_at timestamptz,
  review_until timestamptz,
  winner_username text,
  finish_reason text,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp()+interval '30 minutes')
);
create table if not exists public.recare_battle_players (
  room_code text not null references public.recare_battle_rooms(code) on delete cascade,
  username text not null,
  display_name text not null,
  joined_at timestamptz not null default clock_timestamp(),
  primary key (room_code,username)
);
create table if not exists public.recare_battle_answers (
  room_code text not null,
  username text not null,
  round_index integer not null,
  selection integer[] not null,
  correct boolean not null,
  elapsed_ms integer not null check (elapsed_ms between 0 and 150000),
  primary key (room_code,username,round_index),
  foreign key (room_code,username) references public.recare_battle_players(room_code,username) on delete cascade
);
alter table public.recare_battle_players add column if not exists forfeited_at timestamptz;
-- Update existing installations as well as new tables.
alter table public.recare_battle_answers drop constraint if exists recare_battle_answers_elapsed_ms_check;
alter table public.recare_battle_answers add constraint recare_battle_answers_elapsed_ms_check check (elapsed_ms between 0 and 150000);
create index if not exists recare_battle_players_username_idx on public.recare_battle_players(username);
create index if not exists recare_battle_rooms_expiry_idx on public.recare_battle_rooms(expires_at);
alter table public.recare_battle_questions enable row level security;
alter table public.recare_battle_rooms enable row level security;
alter table public.recare_battle_players enable row level security;
alter table public.recare_battle_answers enable row level security;
revoke all on public.recare_battle_questions,public.recare_battle_rooms,public.recare_battle_players,public.recare_battle_answers from anon,authenticated;

-- Private dispatcher: acquire the room lock before examining or changing gameplay.
create or replace function public.recare_battle_dispatch(p_action text,p_username text,p_session_token uuid,p_room_code text default null,p_round_index integer default null,p_selection integer[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  u public.recare_users; r public.recare_battle_rooms; q public.recare_battle_questions;
  code_value text:=trim(p_room_code); active_code text; t timestamptz; selected integer[]; answer_key jsonb;
  total_players integer; answer_count integer; player_json jsonb; own_json jsonb; review_json jsonb:='[]'::jsonb;
  is_correct boolean; winner text; tied integer; ids text[]; visible_round integer;
begin
  select * into u from public.recare_users where username=lower(trim(p_username)) and session_token=p_session_token and token_expires_at>clock_timestamp();
  if not found then return jsonb_build_object('error','ログインし直してください','error_code','AUTH_REQUIRED'); end if;
  -- Always take the user lock before any room lock, for both create and join.
  if p_action in ('create','join') then
    perform pg_advisory_xact_lock(hashtextextended(u.username,73115));
    select br.code into active_code from public.recare_battle_rooms br join public.recare_battle_players bp on bp.room_code=br.code where bp.username=u.username and br.expires_at>clock_timestamp() and br.status<>'finished' and bp.forfeited_at is null order by br.created_at desc limit 1;
    if p_action='join' and active_code is not null and active_code is distinct from code_value then
      return jsonb_build_object('error','参加中のルームがあります。先に退出してください','error_code','ALREADY_IN_ROOM','room_code',active_code);
    end if;
  end if;
  if p_action='create' then
    if (select count(*) from public.recare_battle_questions)<10 then return jsonb_build_object('error','対戦用の問題がまだ準備されていません'); end if;
    -- Serialize room creation per user and reuse an active room after a retry.
    code_value:=active_code;
    if code_value is null then
      loop
        code_value:=lpad(floor(random()*1000000)::integer::text,6,'0');
        begin
          insert into public.recare_battle_rooms(code,host_username) values(code_value,u.username);
          exit;
        exception when unique_violation then null;
        end;
      end loop;
      insert into public.recare_battle_players(room_code,username,display_name) values(code_value,u.username,u.display_name);
    end if;
  end if;
  if code_value is null or code_value !~ '^[0-9]{6}$' then return jsonb_build_object('error','6桁のルーム番号を入力してください'); end if;
  select * into r from public.recare_battle_rooms where code=code_value for update;
  if not found then return jsonb_build_object('error','ルームが見つかりません','error_code','ROOM_NOT_FOUND'); end if;
  t:=clock_timestamp();
  if r.expires_at<=t then return jsonb_build_object('error','このルームの有効期限が切れました','error_code','ROOM_EXPIRED'); end if;
  if p_action='join' and not exists(select 1 from public.recare_battle_players where room_code=code_value and username=u.username) then
    if r.status<>'lobby' then return jsonb_build_object('error','この対戦はすでに開始されています'); end if;
    if (select count(*) from public.recare_battle_players where room_code=code_value)>=4 then return jsonb_build_object('error','ルームは満員です'); end if;
    insert into public.recare_battle_players(room_code,username,display_name) values(code_value,u.username,u.display_name);
  end if;
  if not exists(select 1 from public.recare_battle_players where room_code=code_value and username=u.username) then return jsonb_build_object('error','このルームには参加していません','error_code','NOT_MEMBER'); end if;
  select count(*) into total_players from public.recare_battle_players where room_code=code_value;
  if p_action in ('join','answer','start') and exists(select 1 from public.recare_battle_players where room_code=code_value and username=u.username and forfeited_at is not null) then return jsonb_build_object('error','この対戦は棄権済みです','error_code','FORFEITED'); end if;
  if p_action='leave' then
    if r.status='lobby' then
      if r.host_username=u.username then
        update public.recare_battle_rooms set status='finished',finish_reason='cancelled' where code=code_value;
      else
        delete from public.recare_battle_players where room_code=code_value and username=u.username;
      end if;
      return jsonb_build_object('left',true,'room_code',code_value);
    elsif r.status<>'finished' then
      update public.recare_battle_players set forfeited_at=coalesce(forfeited_at,t) where room_code=code_value and username=u.username;
      select count(*),min(username) into total_players,winner from public.recare_battle_players where room_code=code_value and forfeited_at is null;
      if total_players<=1 then
        update public.recare_battle_rooms set status='finished',winner_username=winner,finish_reason='forfeit' where code=code_value returning * into r;
      end if;
    end if;
  end if;
  if p_action='start' then
    if r.host_username<>u.username then return jsonb_build_object('error','対戦を開始できるのはルームを作った人です'); end if;
    if r.status='lobby' then
      if total_players<2 or total_players>4 then return jsonb_build_object('error','相手の参加を待ってください'); end if;
      select array_agg(id) into ids from (select id from public.recare_battle_questions order by random() limit 10) picked;
      if coalesce(cardinality(ids),0)<>10 then return jsonb_build_object('error','対戦用の問題が足りません'); end if;
      update public.recare_battle_rooms set status='playing',question_ids=ids,round_index=0,round_started_at=t+interval '3 seconds',deadline_at=t+interval '153 seconds',expires_at=t+interval '2 hours' where code=code_value returning * into r;
    end if;
  end if;
  -- Advance only while holding the room lock. A returning client can resume polling.
  if r.status='review' and t>=r.review_until then
    if r.round_index+1>=cardinality(r.question_ids) then
      with scores as (select bp.username,count(*) filter(where a.correct) points,coalesce(sum(a.elapsed_ms),0) elapsed from public.recare_battle_players bp left join public.recare_battle_answers a on a.room_code=bp.room_code and a.username=bp.username where bp.room_code=code_value and bp.forfeited_at is null group by bp.username), ranked as (select *,dense_rank() over(order by points desc,elapsed asc) rank from scores)
      select min(username),count(*) into winner,tied from ranked where rank=1;
      update public.recare_battle_rooms set status='finished',winner_username=case when tied=1 then winner else null end,finish_reason=case when tied=1 then 'completed' else 'draw' end where code=code_value returning * into r;
    else
      update public.recare_battle_rooms set status='playing',round_index=round_index+1,round_started_at=t+interval '3 seconds',deadline_at=t+interval '153 seconds',review_until=null where code=code_value returning * into r;
    end if;
  end if;
  if r.status='playing' then
    select * into q from public.recare_battle_questions where id=r.question_ids[r.round_index+1];
    if t>=r.deadline_at then
      insert into public.recare_battle_answers(room_code,username,round_index,selection,correct,elapsed_ms)
      select code_value,bp.username,r.round_index,'{}'::integer[],false,150000 from public.recare_battle_players bp where bp.room_code=code_value and bp.forfeited_at is null on conflict do nothing;
    elsif p_action='answer' then
      if p_round_index is distinct from r.round_index then return jsonb_build_object('error','問題が切り替わりました。最新の状態を確認してください'); end if;
      if t<r.round_started_at then return jsonb_build_object('error','開始までお待ちください'); end if;
      if not exists(select 1 from public.recare_battle_answers where room_code=code_value and username=u.username and round_index=r.round_index) then
        if p_selection is null or cardinality(p_selection)=0 or array_ndims(p_selection)<>1 then return jsonb_build_object('error','回答を選択してください'); end if;
        if array_position(p_selection,null) is not null then return jsonb_build_object('error','選択肢が正しくありません'); end if;
        select array_agg(v order by v) into selected from (select distinct unnest(p_selection) v) values_selected;
        if cardinality(selected)<>cardinality(p_selection) or selected[1]<0 or selected[cardinality(selected)]>=q.choice_count then return jsonb_build_object('error','選択肢が正しくありません'); end if;
        if not exists(select 1 from jsonb_array_elements(q.answer_sets) s where jsonb_array_length(s)=cardinality(selected)) then return jsonb_build_object('error','指定された数の選択肢を選んでください'); end if;
        select exists(select 1 from jsonb_array_elements(q.answer_sets) s where (select array_agg(v::integer order by v::integer) from jsonb_array_elements_text(s) v)=selected) into is_correct;
        insert into public.recare_battle_answers values(code_value,u.username,r.round_index,selected,is_correct,least(150000,greatest(0,floor(extract(epoch from(t-r.round_started_at))*1000)::integer)));
      end if;
    end if;
    select count(*) into total_players from public.recare_battle_players where room_code=code_value and forfeited_at is null;
    select count(*) into answer_count from public.recare_battle_answers a join public.recare_battle_players bp on bp.room_code=a.room_code and bp.username=a.username where a.room_code=code_value and a.round_index=r.round_index and bp.forfeited_at is null;
    if answer_count=total_players then update public.recare_battle_rooms set status='review',review_until=t+interval '5 seconds' where code=code_value returning * into r; end if;
  end if;
  visible_round:=case when r.status in ('review','finished') then r.round_index else r.round_index-1 end;
  select jsonb_agg(jsonb_build_object('username',bp.username,'display_name',bp.display_name,'forfeited',bp.forfeited_at is not null,'correct_count',(select count(*) from public.recare_battle_answers a where a.room_code=code_value and a.username=bp.username and a.round_index<=visible_round and a.correct),'total_time_ms',(select coalesce(sum(a.elapsed_ms),0) from public.recare_battle_answers a where a.room_code=code_value and a.username=bp.username and a.round_index<=visible_round),'answered',exists(select 1 from public.recare_battle_answers a where a.room_code=code_value and a.username=bp.username and a.round_index=r.round_index)) order by bp.joined_at,bp.username) into player_json from public.recare_battle_players bp where bp.room_code=code_value;
  if r.status='finished' then
    select jsonb_agg(item || jsonb_build_object('rank',case when (item->>'forfeited')::boolean then null else place end) order by (item->>'forfeited')::boolean,place,item->>'username') into player_json
    from (select item,rank() over(order by (item->>'forfeited')::boolean,(item->>'correct_count')::integer desc,(item->>'total_time_ms')::bigint) place from jsonb_array_elements(player_json) item) standings;
  end if;
  select jsonb_build_object('selection',a.selection,'correct',case when r.status in ('review','finished') then a.correct else null end,'elapsed_ms',a.elapsed_ms) into own_json from public.recare_battle_answers a where room_code=code_value and username=u.username and round_index=r.round_index;
  if r.status in ('review','finished') then select answer_sets into answer_key from public.recare_battle_questions where id=r.question_ids[r.round_index+1]; end if;
  if r.status='finished' then
    select coalesce(jsonb_agg(jsonb_build_object('round_index',picked.ordinality-1,'question_id',picked.id,'selection',coalesce(a.selection,'{}'::integer[]),'correct',coalesce(a.correct,false),'correct_answers',catalog.answer_sets) order by picked.ordinality),'[]'::jsonb)
    into review_json
    from unnest(r.question_ids) with ordinality picked(id,ordinality)
    join public.recare_battle_questions catalog on catalog.id=picked.id
    left join public.recare_battle_answers a on a.room_code=code_value and a.username=u.username and a.round_index=picked.ordinality-1;
  end if;
  return jsonb_build_object('room_code',code_value,'host_username',r.host_username,'phase',case when r.status='playing' then case when t<r.round_started_at then 'countdown' else 'question' end else r.status end,'round_index',r.round_index,'round_count',10,'max_players',4,'question_id',r.question_ids[r.round_index+1],'server_now',t,'round_started_at',r.round_started_at,'deadline_at',r.deadline_at,'review_until',r.review_until,'players',coalesce(player_json,'[]'::jsonb),'own_answer',own_json,'correct_answers',answer_key,'reviews',review_json,'result',case when r.status='finished' then jsonb_build_object('winner_username',r.winner_username,'reason',r.finish_reason) else null end);
end $$;
revoke all on function public.recare_battle_dispatch(text,text,uuid,text,integer,integer[]) from public,anon,authenticated;

create or replace function public.recare_battle_create(p_username text,p_session_token uuid) returns jsonb language sql security definer set search_path='' as $$ select public.recare_battle_dispatch('create',p_username,p_session_token) $$;
create or replace function public.recare_battle_join(p_username text,p_session_token uuid,p_room_code text) returns jsonb language sql security definer set search_path='' as $$ select public.recare_battle_dispatch('join',p_username,p_session_token,p_room_code) $$;
create or replace function public.recare_battle_state(p_username text,p_session_token uuid,p_room_code text) returns jsonb language sql security definer set search_path='' as $$ select public.recare_battle_dispatch('state',p_username,p_session_token,p_room_code) $$;
create or replace function public.recare_battle_start(p_username text,p_session_token uuid,p_room_code text) returns jsonb language sql security definer set search_path='' as $$ select public.recare_battle_dispatch('start',p_username,p_session_token,p_room_code) $$;
create or replace function public.recare_battle_answer(p_username text,p_session_token uuid,p_room_code text,p_round_index integer,p_selection integer[]) returns jsonb language sql security definer set search_path='' as $$ select public.recare_battle_dispatch('answer',p_username,p_session_token,p_room_code,p_round_index,p_selection) $$;
create or replace function public.recare_battle_leave(p_username text,p_session_token uuid,p_room_code text) returns jsonb language sql security definer set search_path='' as $$ select public.recare_battle_dispatch('leave',p_username,p_session_token,p_room_code) $$;
revoke all on function public.recare_battle_create(text,uuid),public.recare_battle_join(text,uuid,text),public.recare_battle_state(text,uuid,text),public.recare_battle_start(text,uuid,text),public.recare_battle_answer(text,uuid,text,integer,integer[]),public.recare_battle_leave(text,uuid,text) from public;
grant execute on function public.recare_battle_create(text,uuid),public.recare_battle_join(text,uuid,text),public.recare_battle_state(text,uuid,text),public.recare_battle_start(text,uuid,text),public.recare_battle_answer(text,uuid,text,integer,integer[]),public.recare_battle_leave(text,uuid,text) to anon,authenticated;

-- Optional housekeeping for the database owner (never exposed as a client RPC):
-- delete from public.recare_battle_rooms where expires_at < now() - interval '1 day';

NOTIFY pgrst, 'reload schema';
COMMIT;
