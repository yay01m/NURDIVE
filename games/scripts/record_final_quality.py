"""Record the seven individually adjudicated REVIEW cases, not an auto-approver."""
import hashlib
import json
from pathlib import Path

DATA=Path(__file__).resolve().parents[1]/'data'
def read(name):return json.loads((DATA/name).read_text(encoding='utf-8'))
def write(name,value):(DATA/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
questions={q['id']:q for q in read('questions.json')}
quality=read('explanation_validation.json')
# Preserve exactly the short explanation sent to the final review stage.
inputs_path=DATA/'work/final-quality-inputs.json'
if inputs_path.exists():
    inputs=read('work/final-quality-inputs.json')
else:
    explanations=read('explanations.json')
    inputs=[]
    for qid,r in quality.items():
        if r['result']!='REVIEW':continue
        q=questions[qid]
        inputs.append({**{k:q[k] for k in ['id','exam','year','session','number','question','choices']},
          'case_text':q.get('case_text'),'preceding_context':q.get('preceding_context',[]),
          'official_answer':q['correct_answers'],'accepted_answer_sets':q['accepted_answer_sets'],
          'explanation':explanations[qid]['explanation'],'key_point':explanations[qid]['key_point'],
          'choice_explanations':[],'review_reason':r['reason']})
    write('work/final-quality-inputs.json',inputs)
assert {i['id'] for i in inputs}=={'115-AM-'+n for n in ['011','029','066','076','080','088','103']}

def source(org,title,url,supports):return dict(organization=org,title=title,url=url,supports=supports)
official=source('厚生労働省','第115回看護師国家試験 正答値表（問題公開版）','https://www.mhlw.go.jp/seisakunitsuite/bunya/kenkou_iryou/iryou/topics/dl/tp260424-05seitou.pdf','2026年・午前の問題番号と正答を照合。合格発表版とも一致。')
problem=source('厚生労働省','第115回看護師国家試験 午前問題','https://www.mhlw.go.jp/seisakunitsuite/bunya/kenkou_iryou/iryou/topics/dl/tp260424-05a_01.pdf','該当設問と選択肢、103問の共通症例を原文と照合。図版依存や内容の欠損は認めなかった。')
notice=source('厚生労働省','第115回看護師国家試験 合格発表・採点除外等','https://www.mhlw.go.jp/general/sikaku/successlist/2026/siken03_04_05/about.html','対象7問のうち公表された採点上の特例は午前80問。確認した公式公開ページに他6問の訂正告知は見当たらない。')
decisions={
'011':('FIX','血漿中の凝固因子はフィブリンを形成し、出血部位の血栓を安定させて止血に働きます。リンパ液にも凝固能はありますが、それを血管損傷時の生理的な止血機構と同一視しないことが重要です。',
 ['旧解説では、リンパ液の凝固能と血管損傷時の止血機構の違いが不明確だった。'],
 ['血漿の凝固因子・フィブリンによる止血を明示し、リンパ液の凝固との違いを説明した。'],.96,
 [source('Rice University / OpenStax','18.5 Hemostasis','https://openstax.org/books/anatomy-and-physiology-2e/pages/18-5-hemostasis','血漿の凝固因子とフィブリン形成による止血。'),source('Frontiers in Cardiovascular Medicine','Coagulation in Lymphatic System（2021）','https://www.frontiersin.org/journals/cardiovascular-medicine/articles/10.3389/fcvm.2021.762648/full','本文は血管での出血防止機構と病的なリンパ管内凝固を区別。リンパ液の凝固能を否定せず疑義を解消した。')]),
'029':('REJECT',None,['原文にも「確定診断」とあり、抽出ミスではない。Dダイマー検査の役割と確定診断との関係に疑義が残り、解説だけでは解消できない。'],[],.70,
 [source('日本血栓止血学会','2025年改訂ガイドラインにおける静脈血栓塞栓症の診断','https://www.jstage.jst.go.jp/article/jjsth/36/6/36_2025_JJTH_36_6_737-743/_html/-char/ja','本文のDダイマー・造影CTの節で、除外診断と確定診断の役割を区別。試験前に公表された資料。')]),
'066':('FIX','納豆はビタミンKを豊富に含み、母親の摂取は母乳中のビタミンKを増やすことにつながります。学会資料でも授乳中の摂取が勧められています。摂取量を無制限に増やす意味ではなく、児へのビタミンK予防投与も別に必要です。',
 ['旧解説はビタミンKとの関係を推測として扱い、確認できる根拠を示していなかった。'],
 ['学会資料の食品摂取に関する記載で正答理由を補い、児の予防投与を代替しないことを明示。量や古い投与日程は追加していない。'],.96,
 [source('日本小児科学会 / 日本医療機能評価機構 Minds','新生児・乳児ビタミンK欠乏性出血症に対するビタミンK製剤投与の改訂ガイドライン','https://minds.jcqhc.or.jp/common/summary/pdf/c00105.pdf','留意点で納豆等の摂取による乳汁中ビタミンKの増加と母親への摂取勧奨を確認。食品の記載のみを使用し、旧投与日程は採用しない。'),source('日本産婦人科医会','出生直後から退院まで','https://www.jaog.or.jp/note/%EF%BC%881%EF%BC%89%E5%87%BA%E7%94%9F%E7%9B%B4%E5%BE%8C%E3%81%8B%E3%82%89%E9%80%80%E9%99%A2%E3%81%BE%E3%81%A7/','児へのビタミンK投与に関する2021年提言を紹介。母体の食品摂取と児の予防投与を区別する。')]),
'076':('REJECT',None,['集合管への作用は確認できるが、研究では遠位尿細管への作用も示される。作用の種類を限定しない設問の単一正答を、解説の修正だけで説明し切れない。'],[],.70,
 [source('American Journal of Physiology–Renal Physiology / PubMed','Vasopressin induces phosphorylation of the thiazide-sensitive sodium chloride cotransporter in the distal convoluted tubule（2010）','https://pubmed.ncbi.nlm.nih.gov/20445498/','実験研究の抄録本文で遠位尿細管の反応を確認。ヒトへの直接の治療推奨には用いず、設問の部位限定に関する疑義として記録。')]),
'080':('REJECT',None,['公式の4または5を正答とする措置は確認済み。それ自体を不備とは扱わない。選択肢3のつまずきを活動制限から切り離して説明する根拠を確認できず、残る分類上の疑義を専門家へ回す。'],[],.70,
 [source('厚生労働省','午前第80問の採点上の取扱い','https://www.mhlw.go.jp/general/sikaku/successlist/2026/siken03_04_05/dl/kangoshi_am80.pdf','複数正解への公式対応。正答値表は4と5を別の許容正答として掲載。'),source('厚生労働省 / WHO','国際生活機能分類 日本語版','https://www.mhlw.go.jp/houdou/2002/08/h0805-1.html','活動は個人の行為遂行、活動制限は遂行上の難しさ。歩行も活動領域に含む。個別選択肢3の解釈までは資料で確定できない。')]),
'088':('REJECT',None,['水晶体の弾力性低下は確認できる。一方、毛様体筋の萎縮を原因として確定する十分な根拠は今回確認できず、公式正答2・5の両方を確実に説明できない。公式正答が誤りとは断定しない。'],[],.65,
 [source('日本眼科学会','老視（老眼）','https://www.nichigan.or.jp/public/disease/name.html?pdid=36','調節機能の加齢による低下を確認。筋の萎縮という特定の機序までは裏付けない。'),source('National Eye Institute','Presbyopia','https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/presbyopia','水晶体の硬化と柔軟性低下による近見障害を確認。')]),
'103':('REJECT',None,['公式正答は中発作。SpO2に加え会話・睡眠等を総合評価する必要があり、提示所見すべてから中発作と確定する根拠を確認できなかった。旧基準と試験時点の評価の差も解決できず、重症度を推測しない。'],[],.65,
 [source('厚生労働省','医薬品・医療機器等安全性情報227号・小児喘息の発作程度判定表','https://www.mhlw.go.jp/houdou/2006/08/h0824-2.html','2006年の表ではSpO2 92～95%は中発作。一方、睡眠・話し方も判定要素。古い表のみで2026年問題を確定しない。'),source('環境再生保全機構','小児ぜん息：発作時の対応','https://www.erca.go.jp/yobou/zensoku/basic/kodomonozensoku/hossa.html','話すのが苦しい・眠れないなどの徴候と総合的観察の重要性。単独で本問を中発作と断定する根拠ではない。')])
}
results=[];anchors={}
for item in inputs:
    q=questions[item['id']]
    assert q['correct_answers']==item['official_answer'] and q['question']==item['question'] and q['choices']==item['choices']
    verdict,text,issues,fixes,confidence,sources=decisions[item['id'][-3:]]
    entry={'id':item['id'],'result':verdict,'official_answer_verified':True,
           'explanation':text or item['explanation'],'choice_explanations':[],
           'issues_found':issues,'fixes_made':fixes,'sources':[official,problem,notice]+sources,
           'final_confidence':confidence}
    assert len(entry['explanation'])<=150
    results.append(entry)
    anchors[item['id']]={'input_sha256':digest(q),'previous_explanation_sha256':digest({'explanation':item['explanation'],'key_point':item['key_point']}),'result_sha256':digest(entry),'reviewed_on':'2026-09-09'}
write('explanation_final_validation.json',results)
write('work/final-quality-anchors.json',anchors)
print('Final: 2 FIX, 5 REJECT. Original question text, choices and answers unchanged.')
