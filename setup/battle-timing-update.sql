-- Battle timing: answer 150s, review 5s, countdown 3s.
BEGIN;
ALTER TABLE public.recare_battle_answers DROP CONSTRAINT IF EXISTS recare_battle_answers_elapsed_ms_check;
ALTER TABLE public.recare_battle_answers ADD CONSTRAINT recare_battle_answers_elapsed_ms_check CHECK (elapsed_ms BETWEEN 0 AND 150000);
DO $timing$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.recare_battle_dispatch(text,text,uuid,text,integer,integer[])'::regprocedure) INTO definition;
  definition := replace(definition, '120000', '150000');
  definition := replace(definition, 'round_started_at=t+interval ''5 seconds'',deadline_at=t+interval ''125 seconds''', 'round_started_at=t+interval ''3 seconds'',deadline_at=t+interval ''153 seconds''');
  definition := replace(definition, 'review_until=t+interval ''8 seconds''', 'review_until=t+interval ''5 seconds''');
  IF position('round_started_at=t+interval ''3 seconds'',deadline_at=t+interval ''153 seconds''' in definition)=0
    OR position('review_until=t+interval ''5 seconds''' in definition)=0
    OR position('120000' in definition)>0 THEN
    RAISE EXCEPTION 'Unexpected battle timing definition';
  END IF;
  EXECUTE definition;
END $timing$;
NOTIFY pgrst, 'reload schema';
COMMIT;
