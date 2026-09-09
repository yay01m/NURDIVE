"""Publish individually reviewed choice rationales; no model calls or medical re-review."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
def read(p): return json.loads((DATA/p).read_text(encoding='utf-8'))
def write(p,v): (DATA/p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
raw=(DATA/'questions.json').read_bytes()
assert hashlib.sha256(raw).hexdigest()=='1d4c906d807332123f14935d809048240e689919db065285af29ecf341ffb0ae'
questions=json.loads(raw)
drafts=read('work/explanation-drafts.json')
candidates={}
for p in sorted((DATA/'work').glob('explanation-candidates-*.json')):
    candidates.update(json.loads(p.read_text(encoding='utf-8')))
short=read('explanations.json')
final={r['id']:r for r in read('explanation_final_validation.json')}
final_patches=read('work/choice-final-patches.json') if (DATA/'work/choice-final-patches.json').exists() else {}

# Only deficient choices are replaced. Existing adequate rationales remain intact.
overrides={
 '115-AM-001':{2:'2023年推計で示された2060年の総人口は約9,600万人です。将来推計は出生・死亡などの仮定を置いた見通しであり、現在の人口の実測値ではありません。推計の公表年と対象年を区別して覚えます。'},
 '115-AM-002':{3:'2022年の自殺の原因・動機別では、健康問題が最も多い区分です。身体の病気だけでなく精神的な健康の問題も含む分類であり、個々の自殺の背景が健康問題一つだけだという意味ではありません。'},
 '115-AM-003':{3:'入眠時には皮膚から熱を逃がして深部体温を下げますが、これはレム睡眠固有の特徴ではありません。レム睡眠では体温調節の反応が弱まるため、熱放散の増加を特徴として結び付けないようにします。'},
 '115-AM-011':{1:'血漿中の凝固因子が反応し、フィブリンの網を作って血栓を安定させます。血小板による栓を補強して出血を止める仕組みであり、血漿の重要な働きです。',4:'リンパ液にも凝固に関係する成分が含まれ、凝固することはあります。しかし、その凝固能を血管が傷ついたときの生理的な止血機構と同じものとして扱うことはできません。'},
 '115-AM-018':{3:'頸部を後屈させると食塊が気道側へ流れやすくなるため、嚥下しやすい姿勢として軽い頸部前屈を用います。ただし、嚥下障害の原因や程度によって適した姿勢は異なり、むせなどを観察して調整します。'},
 '115-AM-038':{2:'乳児は昼夜に分けて何度も眠り、成人より多くの睡眠を必要とします。睡眠時間には個人差がありますが、1日7時間を乳児に必要な睡眠時間の目安とするのは短すぎます。'},
 '115-AM-043':{3:'通常の訪問看護指示書の有効期間は、医師の指示に基づき最長6か月です。「最大5か月」という上限は異なります。急性増悪などで交付する特別訪問看護指示書とは区別します。'},
 '115-AM-057':{3:'介護保険の被保険者となる年齢は40歳からです。40〜64歳の医療保険加入者は第2号被保険者、65歳以上は第1号被保険者に分かれます。保険料を負担する年齢と、サービスを利用できる条件は分けて理解します。'},
 '115-AM-061':{4:'5歳ごろは、衣類の向きや着る順序を理解し、手指の操作も発達するため、一人で衣類を着ることができる時期です。生活習慣の自立は経験にも左右されるので、この年齢を一律の正常・異常の境界にはしません。'},
 '115-AM-064':{4:'妊産婦死亡率の分母は、出生数だけでなく死産数も加えた出産数です。妊娠・出産に関連する死亡を捉える指標なので、生きて生まれた児の数だけを分母にする乳児死亡率などと区別します。'},
 '115-AM-066':{3:short['115-AM-066']['explanation']},
 '115-AM-071':{3:'日本看護協会の2024年調査では、最も多くの看護職員に適用する夜勤形態は二交代制が三交代制を上回っています。三交代制の方が多いとする説明は、この調査結果と合いません。'},
 '115-AM-079':{4:'468か所は保健所の数として公表されている規模であり、市町村保健センターの数ではありません。保健所は広域的・専門的な役割を担い、市町村保健センターは住民に身近な保健サービスを行う施設です。'},
 '115-AM-085':{1:'インスリンは注射により投与する薬剤です。皮膚に貼るだけで必要量を吸収させる一般的な貼付剤とは異なります。皮膚に装着するインスリンポンプも、針などを通じて皮下へ注入する機器です。',2:'アドレナリンは救急時などに注射で投与する薬剤で、本問の経皮吸収型貼付剤には該当しません。薬の全身作用だけでなく、実際の剤形と投与経路を対応させて理解します。',5:'アセトアミノフェンには内服薬や坐薬、注射薬などがあり、本問で問う経皮吸収型貼付剤には該当しません。鎮痛薬すべてに湿布や貼付剤があるわけではなく、成分ごとに剤形を区別します。'},
 '115-AM-087':{5:'本人が参加できる場面では患者への確認も大切ですが、タイムアウトは医療チームが患者・部位・実施内容などを共同で確認する手順です。麻酔中など本人と会話できない場面でも行うため、患者との会話そのものとは異なります。'},
 '115-AM-099':{2:'CAPD開始後のKは3.8mEq/Lで、尿量も保たれているため、この時点ではカリウムを含む食品の制限は不要と判断します。腹膜透析患者全員に制限がないという意味ではなく、その後の検査値や残存腎機能に応じて調整します。'},
 '115-PM-001':{2:'2022年の国民生活基礎調査では、男性の自覚症状で最も多いのは腰痛です。有訴者とは自覚症状を持つ人で、治療を受けている病気の順位ではありません。調査年と性別、何を集計した数値かを組み合わせて覚えます。'},
 '115-PM-007':{2:'日本版デンバー式で、90％の児がこの項目を獲得する時期は4か月です。90％という到達割合を問うため、平均的な獲得月齢や最も早くできる児の月齢とは区別します。発達の評価では一つの項目だけで結論を出しません。'},
 '115-PM-031':{1:'感染症病床に係る看護師・准看護師の員数の標準は、入院患者3人に対して1人です。医療法上の標準を問う問題であり、各勤務帯に常にこの比率で配置するという意味や、診療報酬の入院基本料の区分と混同しないようにします。'},
 '115-PM-032':{2:'消防庁の令和6年中の搬送統計では、軽症46.8％と中等症44.6％を合わせて約9割です。「約8割」とは異なります。なお、軽症は入院を要しないという区分で、救急搬送が不要だったことを意味しません。'},
 '115-PM-044':{2:'訪問看護の記録は、国の指定基準では完結の日から2年間の保存が必要で、1年では不足します。自治体の条例などでより長い保存期間が求められる場合もあるため、実務では適用される規定に従います。'},
 '115-PM-083':{4:'痔瘻は肛門周囲の感染に関連してできる瘻孔であり、静脈が拡張する病態を指す言葉ではありません。肛門周囲膿瘍から皮膚へ膿の通り道が残る仕組みを理解します。'},
 '115-PM-087':{4:'加齢に伴う腎臓の組織変化には、尿細管の基底膜が厚くなることがあります。構造の変化は腎機能の予備力低下と併せて理解し、加齢によって尿を濃くする力や濾過量が増えると考えないようにします。'},
}

# Narrow follow-up evidence only. Earlier checked sources are reused, not searched again.
evidence={
 '115-AM-003':[{'title':'睡眠と体温調節','url':'https://pubmed.ncbi.nlm.nih.gov/14646797/'}],
 '115-AM-043':[{'title':'厚生労働省：訪問看護の取扱い（指示書の通常の有効期間）','url':'https://www.mhlw.go.jp/content/12404000/001192171.pdf'}],
 '115-AM-071':[{'title':'日本看護協会：2024年病院看護実態調査','url':'https://www.nurse.or.jp/nursing/assets/101.pdf'}],
 '115-AM-079':[{'title':'厚生労働省：令和6年度事前分析表（保健所数）','url':'https://www.mhlw.go.jp/wp/seisaku/hyouka/dl/r06_jizenbunseki/19_I-11-1.pdf'}],
 '115-AM-091':[{'title':'厚生労働省：脳卒中の地域連携診療計画と在宅への情報提供','url':'https://www.mhlw.go.jp/content/12300000/001236363.pdf'}],
 '115-PM-032':[{'title':'消防庁：令和7年版救急・救助の現況（令和6年中）','url':'https://www.fdma.go.jp/publication/rescue/items/kkkg_r07_01_kyukyu.pdf'}],
}
audit=read('explanation_audit.json')
results=[]
published=[]
rejected=[]
for q in questions:
    id=q['id']
    original=list(drafts[id]['choices'] if id in drafts else candidates[id][2:])
    notes=list(original)
    # Move an existing substantive reason to its one correct option; never duplicate
    # the same overall paragraph across a multi-answer question.
    if len(q['correct_answers'])==1 and id not in final:
        i=q['correct_answers'][0]-1
        core=short[id]['explanation']
        if not any(x in core for x in ['確認','公式正答','出題年','本問では']):
            notes[i]=core
    for number,text in overrides.get(id,{}).items(): notes[number-1]=text
    status='FIXED' if id in overrides else 'PASS'
    reason='選択肢の説明不足・確認待ちの部分を補足。' if id in overrides else ''
    fixes=[f'選択肢{n}の解説を修正。' for n in overrides.get(id,{})]
    if id in final and final[id]['result']=='REJECT':
        status='REJECT'; reason=' '.join(final[id]['issues_found']); fixes=[]
    if id=='115-AM-091':
        status='REJECT'; reason='選択肢1：介護支援専門員への診療情報提供も連携に含まれ得るため、誤答理由を根拠付きで確定できない。公式正答2は維持。'; fixes=[]
    patch=final_patches.get(id)
    if patch:
        for number,text in patch['changes'].items(): notes[int(number)-1]=text
        status=patch['status']
        reason=patch.get('review_reason','最終確認で根拠を確認し、該当選択肢のみ修正して掲載可能。')
        fixes=[f'選択肢{n}に不明表示を追加。' if status=='UNKNOWN' else f'選択肢{n}の解説を最終確認で修正。' for n in patch['changes']]
        evidence[id]=patch['sources']
    ce=[{'choice':i+1,'correct':i+1 in q['correct_answers'],'title':title,'explanation':notes[i]} for i,title in enumerate(q['choices'])]
    assert len(notes)==len(q['choices'])
    assert all(isinstance(s,str) and 0<len(s)<=200 for s in notes),id
    result={'id':id,'choice_explanations':ce,'status':status,'review_reason':reason,'fixes_made':fixes}
    results.append(result)
    if status=='REJECT': rejected.append(id); continue
    published.append({'id':id,'record':result,'input_anchor':audit[id]['input_anchor'],'sources':evidence.get(id,audit[id]['sources'])})

# End-of-run coverage is an ID comparison only, not another content review.
input_ids={q['id'] for q in questions}; output_ids={r['id'] for r in results}
assert len(results)==len(output_ids) and not(output_ids-input_ids)
report={'input':len(input_ids),'processed':len(output_ids),**{s:sum(r['status']==s for r in results) for s in ['PASS','VERIFIED','FIXED','REJECT','UNKNOWN']},'missing':len(input_ids-output_ids)}
write('choice_explanations.json',results)
write('choice_explanation_report.json',report)
write('work/choice-review-sources.json',evidence)
(ROOT/'explanations.js').write_text('// Generated by scripts/build_choice_explanations.py.\nwindow.RECARE_EXPLANATIONS='+json.dumps(published,ensure_ascii=False,separators=(',',':'))+';\nwindow.RECARE_REJECTED_QUESTION_IDS='+json.dumps(rejected)+';\n',encoding='utf-8')
assert raw==(DATA/'questions.json').read_bytes()
print(json.dumps(report))
