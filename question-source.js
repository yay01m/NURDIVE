(()=>{
  const setup=document.querySelector('.premium-setup');
  setup.insertAdjacentHTML('beforebegin',`<fieldset class="question-source"><legend>問題を選ぶ</legend><div class="question-source-options"><label><input type="radio" name="questionSource" value="past" checked><span><b>過去問</b><small>公式過去問 ${fullBank.length}問</small></span></label><label><input type="radio" name="questionSource" value="original"><span><b>オリジナル問題</b><small>未収録</small></span></label></div><p id="questionSourceNotice" role="status" aria-live="polite">厚生労働省の公式過去問から出題します。</p></fieldset>`);
  const start=document.querySelector('#startGame'),originalStart=start.onclick,startMarkup=start.innerHTML;
  const isPast=()=>document.querySelector('input[name="questionSource"]:checked').value==='past';
  function update(){
    const available=isPast();
    start.disabled=!available;
    start.innerHTML=available?startMarkup:'オリジナル問題は未収録です';
    document.querySelector('#questionSourceNotice').textContent=available?'厚生労働省の公式過去問から出題します。':'オリジナル問題は現在0問です。過去問を選ぶと開始できます。';
    document.querySelectorAll('.premium-setup button, #premiumCategory').forEach(control=>control.disabled=!available);
  }
  document.querySelectorAll('input[name="questionSource"]').forEach(input=>input.addEventListener('change',update));
  start.onclick=event=>{if(isPast())originalStart(event)};
  window.recareExamPool=pool=>{const year=document.querySelector('#examYear')?.value;return !year||year==='all'?pool:pool.filter(q=>String(q.exam)===year)};
  setup.insertAdjacentHTML('beforebegin',`<label class="category-picker">出題年度<select id="examYear"><option value="all">すべての年度（2022〜2026年）</option>${[...new Set(fullBank.map(q=>q.exam))].sort((a,b)=>b-a).map(exam=>`<option value="${exam}">${exam+1911}年・第${exam}回</option>`).join('')}</select></label><p class="year-publication-note" id="yearPublicationNote"></p>`);
  const categorySelect=document.querySelector('#premiumCategory');
  function updateYears(){
    const pool=window.recareExamPool(fullBank),oldValue=categorySelect.value;
    const available=[...new Set(pool.map(q=>q.category))].sort();
    categorySelect.replaceChildren(new Option('すべての分野','all'),...available.map(name=>new Option(name,name)),new Option('必修問題','required'));
    categorySelect.value=[...categorySelect.options].some(o=>o.value===oldValue)?oldValue:'all';
    categorySelect.dispatchEvent(new Event('change'));
    const explained=pool.filter(q=>q.hasExplanation).length;
    const uncertain=pool.filter(q=>q.hasExplanation&&q.explanationNeedsReview).length;
    document.querySelector('#yearPublicationNote').textContent=`収録${pool.length}問中${explained}問に選択肢別解説があります。${uncertain?`うち${uncertain}問は一部不明の箇所を明記しています。`:''}${explained<pool.length?'残りの解説は準備中です。':''}${pool.some(q=>q.exam!==115)?'2022〜2025年の病気ごとの演出は準備中です。':''}`;
  }
  document.querySelector('#examYear').addEventListener('change',updateYears);
  document.querySelectorAll('input[name="questionSource"]').forEach(input=>input.addEventListener('change',()=>document.querySelector('#examYear').disabled=!isPast()));
  updateYears();update();
  const library=document.createElement('details');
  library.id='officialPdfLibrary';library.className='official-pdf-library';
  library.innerHTML='<summary>公式PDFを見る<span>問題・公式正答 / 2022〜2026年</span></summary><p>厚生労働省の公式資料を別のタブで開きます。</p>';
  for(const exam of [...new Set(fullBank.map(q=>q.exam))].sort((a,b)=>b-a)){
    const questions=fullBank.filter(q=>q.exam===exam);
    const row=document.createElement('section');row.className='official-pdf-year';
    const heading=document.createElement('h3');heading.textContent=`${questions[0].year}年・第${exam}回`;row.append(heading);
    const links=document.createElement('div');
    for(const [label,url] of [['午前の問題',questions.find(q=>q.session==='AM')?.sourceUrl],['午後の問題',questions.find(q=>q.session==='PM')?.sourceUrl],['公式正答',questions[0].answerSourceUrl]]){
      if(!url)continue;
      const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=label+' ↗';link.setAttribute('aria-label',`${heading.textContent} ${label}PDF（別タブ）`);links.append(link);
    }
    row.append(links);library.append(row);
  }
  document.querySelector('.daily-challenge').after(library);
})();
