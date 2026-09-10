"""Explicit, reviewed item IDs; never infer a condition from choice keywords."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'data/original'
profiles={
 'pediatric':[
  ([1,3,4,93],'喘息に関する学習','affected-airway'),
  ([2],'喘息発作時の呼吸困難','affected-airway sim-breathing'),
  ([5],'アナフィラキシーを疑う状態','affected-systemic sim-skin sim-breathing'),
  ([6,7],'RSウイルス感染症','affected-airway'),
  ([10,11,95,97],'白血病に関する学習','affected-systemic'),
  ([12,13],'口唇口蓋裂に関する学習','affected-airway sim-pharynx'),
  ([15],'滲出性中耳炎','sim-ears'),
  ([16,17],'川崎病に関する学習','affected-heart'),
  ([18,91,92],'湿疹・皮膚炎','sim-skin'),
  ([32,33,34],'けいれん','affected-systemic sim-seizure'),
  ([35,36,37,88],'ネフローゼ症候群','affected-kidneys'),
  ([39,40],'炎症性腸疾患に関する学習','affected-intestine'),
  ([47,49,50,51],'1型糖尿病に関する学習','affected-systemic'),
  ([48],'低血糖','affected-systemic'),
  ([54,55],'胆道閉鎖症に関する学習','affected-liver'),
  ([56,57],'麻疹に関する学習','affected-systemic'),
  ([58,59],'手足口病に関する学習','sim-skin'),
  ([60],'感染後の浮腫・尿の異常','affected-kidneys'),
  ([61,62],'ダウン症候群に関する学習','affected-systemic'),
  ([63],'眼の異常を示す徴候','sim-eyes'),
  ([64],'未熟児網膜症','sim-eyes'),
  ([65],'気管軟化症','affected-airway'),
  ([96],'ランゲルハンス細胞組織球症に関する学習','affected-systemic')
 ],
 'community':[
  ([46],'消えない皮膚の発赤','sim-skin'),
  ([59],'嚥下機能の問題を示す徴候','sim-pharynx'),
  ([60],'失語症に関する学習','affected-brain'),
  ([73],'心不全の増悪を疑う状態','affected-heart sim-edema'),
  ([74],'心不全患者の息切れ','affected-heart sim-breathing'),
  ([75,76],'低血糖に関する学習','affected-systemic')
 ],
 'psychiatric':[
  ([31,33,35,38],'低栄養に関連する身体への影響','affected-systemic'),
  ([32],'嘔吐の反復による身体への影響','affected-systemic'),
  ([41],'アルコール離脱を疑う状態','affected-systemic sim-tremor'),
  ([47],'悪性症候群を疑う状態','affected-systemic sim-fever sim-stiffness'),
  ([48],'アカシジアを疑う状態','affected-systemic'),
  ([49],'腸管麻痺を疑う状態','affected-intestine'),
  ([51],'遅発性ジスキネジアを疑う状態','affected-systemic')
 ]
}
count=0
for category,groups in profiles.items():
 p=ROOT/(category+'.json');d=json.loads(p.read_text(encoding='utf-8'))
 by_number={int(q['id'][-3:]):q for q in d['questions']}
 for numbers,name,classes in groups:
  for n in numbers:
   q=by_number[n]
   q['effect']={'name':name,'detail':'設問の状態に関連する部位をゲーム内で強調します。実際の発症や病変の位置・重症度を示すものではありません。','disease':True,'avatarClasses':classes,'kind':'condition'}
   count+=1
 p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Mapped',count,'explicit conditions')
