// One shared miss budget. Projection is fiction, independent of clinical vital signs.
function projectionState(){
  const misses=state.review.length,limit=mistakeLimit();
  return {misses,limit,boundary:Math.max(0,misses-state.anatomyEpisodes.length),
    ratio:Math.min(1,misses/limit),
    label:misses>=limit?'帰還不能':misses===0?'自分を保っている':misses/limit>=.75?'境界が消えかけている':misses/limit>=.5?'投影が深まっている':'境界が揺らいでいる'};
}
function projectionStatus(){
  const p=projectionState();
  el.spo2.textContent=p.misses;el.pulse.textContent=Math.max(0,p.limit-p.misses);el.focus.textContent=state.streak;
  el.conditionText.textContent=p.label;
  el.conditionDetail.textContent=p.misses>=p.limit?'解説を確認して、今回の夜勤を終えましょう。':p.misses===0?'患者を理解する。自分を見失わずに。':`ミス ${p.misses} / ${p.limit}回。この夜勤では、重なった投影は残ります。`;
  const progress=document.querySelector('#projectionProgress');
  if(progress){progress.textContent=`ミス ${p.misses} / ${p.limit}回で勤務終了`;}
  el.healthBar.setAttribute('role','progressbar');
  el.healthBar.setAttribute('aria-label','自分を保つ力');
  el.healthBar.setAttribute('aria-valuemin','0');el.healthBar.setAttribute('aria-valuemax','100');
  el.healthBar.setAttribute('aria-valuenow',String(state.health));
}
function highlightAffectedParts(stage){
  const body=stage.querySelector('svg.avatar');if(!body)return;
  body.querySelectorAll('.clinical-hotspot').forEach(node=>node.classList.remove('clinical-hotspot'));
  const targets={
    'affected-heart':'.heart','sim-arrest':'.heart','sim-irregular':'.heart','sim-chest-pain':'.heart',
    'affected-lungs':'.lung','affected-airway':'.airway','affected-brain':'.brain',
    'affected-liver':'.liver','affected-stomach':'.stomach','affected-kidneys':'.kidney',
    'affected-intestine':'.intestine','affected-bladder':'.bladder','affected-joints':'.joint',
    'sim-arm-pain':'.arm','sim-arm-cold':'.arm','sim-weakness':'.arm','sim-tremor':'.arm',
    'sim-leg-weakness':'.leg','sim-leg-vessels':'.leg','sim-edema':'.leg',
    'sim-stiffness':'.arm,.leg','sim-seizure':'.arm,.leg','sim-hemiparesis':'.arm,.leg',
    'sim-head-wound':'.head','sim-face-edema':'.head','sim-eyes':'.eye',
    'sim-pelvis':'.pelvis-guide','sim-speech':'.mouth','sim-upper-abdomen':'.torso',
    'sim-esophagus':'.torso','sim-breast':'.torso','sim-stoma':'.torso',
    'sim-itch':'.body-part','sim-skin':'.body-part','skin-rash':'.body-part'
  };
  for(const [key,selector] of Object.entries(targets))if(stage.classList.contains(key)){
    body.querySelectorAll(selector).forEach(node=>node.classList.add('clinical-hotspot'));
  }
}
function projectionVisual(effect){
  const p=projectionState(),stage=el.avatarStage,body=stage.querySelector('svg.avatar');
  stage.classList.toggle('projection-overlap',p.boundary>0||p.ratio===1);
  stage.classList.toggle('projection-lost',p.ratio===1);
  stage.style.setProperty('--projection-depth',String(p.ratio));
  if(body&&!stage.querySelector('.projection-echo')){
    const ghost=body.cloneNode(true);
    ghost.setAttribute('class','projection-echo');ghost.setAttribute('aria-hidden','true');ghost.removeAttribute('role');ghost.removeAttribute('aria-label');
    ghost.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
    ghost.querySelector('defs')?.remove();
    stage.insertBefore(ghost,body);
    const align=()=>{const a=body.getBoundingClientRect(),b=stage.getBoundingClientRect();ghost.style.width=`${a.width}px`;ghost.style.height=`${a.height}px`;ghost.style.left=`${a.left-b.left-stage.clientLeft}px`;ghost.style.top=`${a.top-b.top-stage.clientTop}px`;};
    new ResizeObserver(align).observe(body);align();
  }
  highlightAffectedParts(stage);
  const note=document.querySelector('#projectionNote');
  if(note){
    note.hidden=!p.boundary;
    note.innerHTML=`<span>SELF / PATIENT</span><b>${p.ratio===1?'自分の輪郭を見失った':'患者の輪郭が、自分に重なる'}</b><p>${p.boundary}回の境界の揺らぎ。自分と患者の区別が曖昧になっています。</p>`;
  }
  if(p.boundary&&!state.anatomyEpisodes.length){
    el.avatarCallout.innerHTML='<b>これは、誰の感覚だろう。</b><span>患者の輪郭が重なり、自分に戻りにくくなっています。</span>';
    el.symptomChips.innerHTML='<span class="boundary-chip">境界の揺らぎ</span>';
  }
  if(p.misses)el.avatarState.textContent=p.label;
  if(effect)el.feedback.classList.toggle('boundary-feedback',!effect.disease);
  if(effect&&!effect.disease){
    el.feedbackLabel.textContent='BOUNDARY SHIFT';
    el.feedbackTitle.textContent='自分と患者の境界が揺らいだ';
    el.consequence.textContent=`患者の感覚に引き込まれ、自分の輪郭が曖昧になる。ミス ${p.misses} / ${p.limit}回。`;
  }
  if(p.ratio===1)el.avatarCallout.innerHTML='<b>自分に、戻れない。</b><span>患者への投影から抜け出せず、勤務を続けられません。</span>';
  const jump=document.querySelector('#anatomyJump');
  if(jump){jump.classList.toggle('has-symptom',p.misses>0);jump.setAttribute('aria-label',`投影された自分を見る。ミス${p.misses}回`);}
}
