"""Record individually reviewed evidence; never infer approval from keywords."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
path = DATA / 'work/explanation-verification.json'
reviews = json.loads(path.read_text(encoding='utf-8'))
questions = {q['id']: q for q in json.loads((DATA/'questions.json').read_text(encoding='utf-8'))}
candidates = {}
for p in (DATA/'work').glob('explanation-candidates-*.json'):
    candidates.update(json.loads(p.read_text(encoding='utf-8')))

def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()

def record(ids, title, url, note, status='approved', confidence=0.95):
    for short_id in ids.split():
        qid = '115-' + short_id
        r = reviews[qid]
        r.update(status=status, text_reviewed=True, notes=[note], confidence=confidence,
                 reviewed_on='2026-09-09', input_sha256=digest(questions[qid]),
                 explanation_sha256=digest(candidates[qid]))
        r['sources'] = [{'title':title, 'url':url}] if url else []

record('AM-001', '国立社会保障・人口問題研究所：2023年推計・人口統計資料集', 'https://www.ipss.go.jp/syoushika/tohkei/Data/Popular2023RE/T01-05.files/sheet001.htm', '2060年の総人口96,148千人を確認。約9,600万人という概数と他の選択肢の大小関係を照合。')
record('AM-002', '厚生労働省：ゲートキーパー養成研修用テキスト2024', 'https://www.mhlw.go.jp/mamorouyokokoro/assets/pdf/gatekeeper_training_manual_2024_japan.pdf', '令和4年の原因・動機別表で健康問題が最多。複合的背景と複数計上の注意も一致。')
record('AM-005 AM-042', '厚生労働省：指定居宅介護支援等の運営基準', 'https://www.mhlw.go.jp/web/t_doc?dataId=82999405&dataType=0&pageNo=1', '介護支援専門員の計画作成・調整、本人中心の会議と資源活用を照合。施設計画との役割の違いも点検。')
record('AM-008', '米国小児科学会：発達サーベイランスのマイルストーン', 'https://publications.aap.org/pediatrics/article/149/3/e2021052138/184748/Evidence-Informed-Milestones-for-Developmental', '握って保持する動作が描画・道具操作より早期という順序を確認。検査の通過率や厳密な月齢は追加していない。')
record('AM-024', '日本癌治療学会：がん疼痛の薬理学的知識', 'https://www.jsco-cpg.jp/item/23/intro_03-4.html', 'モルヒネ、コデイン、非オピオイド、鎮痛補助薬の分類を照合。投与量や治療順序の推奨は追加しない。')
record('AM-026', 'OpenStax：筋線維の収縮と弛緩', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/10-3-muscle-fiber-contraction-and-relaxation', '滑走説、筋小胞体からのCa放出、ミオシンのATP加水分解、グリコゲン利用を照合。細胞外Caが生命活動全般で不要とは記述しない。')
record('AM-027', 'OpenStax：感覚の中枢処理', 'https://openstax.org/books/anatomy-and-physiology/pages/14-2-central-processing', '脊髄視床路の交叉と視床中継を確認。後索路・運動線維との混同を点検。')
record('AM-033', 'OpenStax：動機づけと自己効力感', 'https://openstax.org/books/psychology-2e/pages/10-1-motivation', '結果への期待と、行動を実行できるという効力期待を区別し、患者の発言に対応させた。')
record('AM-038', 'NHLBI：Your Guide to Healthy Sleep', 'https://www.nhlbi.nih.gov/files/docs/public/sleep/healthy_sleep.pdf', '睡眠周期、乳児の長い睡眠、加齢に伴う早い睡眠時間帯への変化を照合。個人差を残す。')
record('AM-045', '国立がん研究センター東病院：ストーマ外来', 'https://www.ncc.go.jp/jp/ncce/division/nursing/about/outpatient/stoma/index.html', '外出先での装具交換・トラブル対策と症例の外出目標を照合。他の支援も必要だが最優先とは限らない。')
record('AM-046', '厚生労働省：保健衛生業における腰痛の予防', 'https://www.mhlw.go.jp/stf/newpage_31197.html', '人力による抱上げを避ける方針とスライディング用具の利用を照合。')
record('AM-047', '厚生労働省：情報機器作業の労働衛生管理', 'https://www.mhlw.go.jp/web/t_doc_keyword?dataId=00tc4418&dataType=1&keyword=%E6%83%85%E5%A0%B1%E6%A9%9F%E5%99%A8%E4%BD%9C%E6%A5%AD&mode=0&pageNo=1', '画面注視による視覚負担を確認。振動障害・重量物取扱い・紫外線の典型的障害との組合せも点検。')
record('AM-051', '日本呼吸器学会：COPD診療ガイドライン第6版', 'https://www.jrs.or.jp/publication/file/COPD6_20220726.pdf', '酸素化と換気を区別し、SpO2と血液ガスでの評価を照合。高酸素濃度をCO2貯留予防とする誤答を否定。')
record('AM-067', '米国心理学会：情動焦点型コーピング', 'https://dictionary.apa.org/emotion-focused-coping', '気分転換による感情調整と、仕事の問題そのものへの対処を区別。')
record('AM-068 PM-119 PM-120', 'WHO：心理的応急処置・現場支援者向けガイド', 'https://iris.who.int/bitstream/handle/10665/44615/9789241548205_eng.pdf?sequence=1', '尊厳、基本的ニーズ、傾聴、危険と刺激の低減の原則を症例へ適用。安否の保証、忘却の強要、威圧は行わない。')
record('AM-072', '厚生労働省：災害救助法', 'https://www.mhlw.go.jp/web/t_doc?dataId=25014000&dataType=0', '目的条文、医療・助産、都道府県等の費用支弁を照合。災害障害見舞金との法制度の違いも点検。')
record('AM-074', 'OpenStax：ホルモンと受容体', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/17-2-hormones', '脂溶性ステロイドの細胞内受容体と、ペプチド・カテコールアミンの膜受容体を照合。')
record('AM-075', 'OpenStax：体液区分', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/26-1-body-fluids-and-fluid-compartments', '間質液・血漿・リンパの細胞外区分と細胞内液の優位を確認。新たな割合は追加していない。')
record('AM-077', '日本整形外科学会：腰部脊柱管狭窄症', 'https://www.joa.or.jp/public/sick/condition/lumbar_spinal_stenosis.html?webview=true', '前屈で軽減する神経性間欠跛行の特徴を確認。回旋・片側屈の条件は症例に追加しない。')
record('AM-078', '国立がん研究センター：子宮頸がんの治療', 'https://ganjoho.jp/public/cancer/cervix_uteri/treatment.html', '扁平上皮癌が代表的で腺癌も存在する点を確認。全例が扁平上皮由来との一般化を避けた。')
record('AM-081', '日本アレルギー学会：アナフィラキシーガイドライン2022', 'https://www.jsaweb.jp/uploads/files/Web_AnaGL_2022_1201.pdf', '皮膚・消化器・呼吸症状の組合せとアドレナリン筋注の優先を照合。補助薬や静脈路確保のために遅延させない。')
record('AM-082', 'OpenStax：悲嘆と喪失', 'https://openstax.org/books/fundamentals-nursing/pages/36-1-concepts-of-grief-and-loss', '条件を付けて結果を変えようとする取引を確認。心理過程を固定順序として一般化しない。')
record('AM-086', '厚生労働省：特定健診・特定保健指導', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000161103.html', '保険者、根拠法、対象と保健指導の選定を照合。がん検診や75歳以上の制度と区別。')
record('AM-094', '国立がん研究センター：手術について詳しく', 'https://ganjoho.jp/public/dia_tre/treatment/operation/ope02.html', '喫煙・呼吸機能と術後排痰困難、無気肺の機序を照合。症例の検査値から他の合併症を断定しない。')
record('AM-096', '国立がん研究センター：食道がんの療養', 'https://ganjoho.jp/public/cancer/esophagus/follow_up.html', '再建後の少量・咀嚼、逆流への注意と食事回数の調整を確認。')
record('AM-099', 'NIDDK：腹膜透析の食事と栄養', 'https://www.niddk.nih.gov/health-information/kidney-disease/kidney-failure/peritoneal-dialysis/eating-nutrition', '腹膜透析ではKが除去され、個別の検査値で調整すること、蛋白喪失・透析液由来エネルギーを確認。K3.8という本例に限定。')
record('AM-100', '米国国立老化研究所：レビー小体型認知症', 'https://www.nia.nih.gov/health/what-lewy-body-dementia', '幻視と睡眠中の行動を照合。他の認知症症状を症例に追加していない。')
record('AM-108 PM-081', '厚生労働省：障害のある人への相談支援', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/shougaishahukushi/service/soudan_shien.html', '相談支援専門員による計画相談と、地域移行・地域定着の違いを照合。')
record('AM-112 AM-113', 'OpenStax：妊娠中の不快症状', 'https://openstax.org/books/maternal-newborn-nursing/pages/10-3-common-discomforts-of-pregnancy', '少量で摂れる時の摂食、においへの配慮、妊娠初期の腸運動低下を照合。症例にない疾患は追加しない。')
record('PM-001', '厚生労働省：2022年国民生活基礎調査・健康状況', 'https://www.mhlw.go.jp/toukei/saikin/hw/k-tyosa/k-tyosa22/dl/04.pdf', '図17と本文で男性の腰痛が最多と確認。受療率とは別の統計であることを点検。')
record('PM-005', '日本看護協会：ナースセンターの概要', 'https://www.nurse.or.jp/nursing/nc/gaiyo/', '人材確保法に基づく無料職業紹介を照合。免許交付、訪問看護、特定行為研修と役割を区別。')
record('PM-006', 'OpenStax：胎児循環', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/20-6-development-of-blood-vessels-and-fetal-circulation', '卵円孔、動脈管、静脈管の位置を照合。')
record('PM-009', 'OpenStax：老年期の認知と記憶', 'https://openstax.org/books/lifespan-development/pages/15-3-cognition-and-memory-in-late-adulthood', '蓄積した経験・知識を使う結晶性知能の定義を確認。本問の慣れた道の判断に限定。')
record('PM-014', 'NHLBI：心房細動', 'https://www.nhlbi.nih.gov/health/atrial-fibrillation', '有効な心房収縮の消失と血液うっ滞・血栓リスクを確認。P波と房室伝導障害との違いも点検。')
record('PM-017', 'NIAMS：痛風', 'https://www.niams.nih.gov/health-topics/gout', '尿酸塩結晶による病態と高尿酸血症だけでは痛風といえない点を照合。他の検査指標との違いを点検。')
record('PM-018 PM-035', 'OpenStax：コミュニケーションの種類', 'https://openstax.org/books/fundamentals-nursing/pages/2-1-types-of-communication', '限定した答えを求める質問と、言語能力・発声能力に合わせた補助手段を照合。筆談には読み書き能力の確認を残す。')
record('PM-036', 'OpenStax：効果的なコミュニケーションとSMART目標', 'https://openstax.org/books/fundamentals-nursing/pages/2-3-effective-communication', '患者主体・測定可能・達成可能・期限のある目標を照合。')
record('PM-044', '厚生労働省：指定訪問看護の人員・運営基準', 'https://www.mhlw.go.jp/web/t_doc?dataId=84aa0500&dataType=0&pageNo=1', '研修機会、管理者、重要事項の事前説明、記録保存を照合。自治体の保存期間上乗せを否定しない。')
record('PM-048', '日本化薬：ニトロペン患者向け資料', 'https://mink.nipponkayaku.co.jp/shizai/index.php?action_Shizaireq_Dodownload=0&smcd=2', '血圧低下・立ちくらみと座位での使用を確認。舌下投与と保管について他剤へ一般化しない。')
record('PM-049', '国立がん研究センター：抗がんIVR', 'https://www.ncc.go.jp/jp/ncch/division/ivr/060/010/index.html', '肝細胞癌の栄養動脈の塞栓という治療機序を照合。他の肝疾患を適応としない。')
record('PM-053', 'NIDDK：尿閉の定義', 'https://www.niddk.nih.gov/health-information/urologic-diseases/urinary-retention/definition-facts', '急性尿閉の緊急性と、頻尿・排尿痛・残尿感との違いを確認。')
record('PM-061', 'e-Gov：学校保健安全法施行規則', 'https://laws.e-gov.go.jp/law/333M50000080018?occasion_date=20250916', '2025年時点の出席停止基準と照合。水痘の全発疹痂皮化、麻しん・耳下腺炎との違いを確認。')
record('PM-063', '厚生労働省：育児・介護休業法の改正経過', 'https://www.mhlw.go.jp/content/11601000/001166150.pdf', '短時間勤務等の制度と、労働基準法・雇用保険の制度を照合。今回の説明に改正後の新規要件は追加しない。')
record('PM-067', 'OpenStax：分娩第4期の看護', 'https://openstax.org/books/maternal-newborn-nursing/pages/18-4-nursing-care-during-the-fourth-stage-of-labor', '軟らかい子宮と出血に対する子宮収縮促進を照合。本例でも出血量・全身状態評価と報告を併記。')
record('PM-068', '厚生労働省：精神科入院の制度', 'https://www.mhlw.go.jp/stf/shingi/2r98520000026ti3-att/2r98520000026tnw.pdf', '任意入院の処遇改善請求と、措置・緊急措置・応急入院の区別を照合。旧資料の保護者制度等は採用しない。')
record('PM-076', 'OpenStax：心周期', 'https://openstax.org/books/anatomy-and-physiology/pages/19-3-cardiac-cycle', '房室弁の開放、等容収縮と駆出の順序を確認。定常状態の左右拍出と静脈還流の均衡も点検。')
record('PM-098', 'PMDA：メルカゾール安全性情報', 'https://www.pmda.go.jp/files/000145558.pdf', '抗甲状腺薬服用中の発熱・咽頭痛と無顆粒球症への迅速対応を照合。症例に薬剤量を追加しない。')
record('PM-117', '厚生労働省：健康づくりのための睡眠ガイド2023', 'https://www.mhlw.go.jp/content/10904750/001222166.pdf', '眠気に合わせた就床、起床リズム、遅い昼寝や熱い入浴の影響を照合。')

record('AM-073 PM-004 PM-010', '日本看護協会：看護職の倫理綱領', 'https://www.nurse.or.jp/nursing/rinri/text/basic/professional/platform/index.html', '信条の尊重、説明を受けた本人の意思決定、共通目標による協働を照合。症例への適用と各選択肢は個別点検。')
record('PM-112 PM-113 PM-114', 'OpenStax：パーソナリティ障害の看護', 'https://openstax.org/books/psychiatric-mental-health/pages/18-3-nursing-care-and-treatment-approaches', '共感、安全評価、スタッフ間での感情共有、一貫した境界、感情の言語化を照合。具体的な対応は提示症例に限定して点検。')
record('PM-115 PM-116', 'NIMH：パニック症', 'https://www.nimh.nih.gov/health/publications/panic-disorder-when-fear-overwhelms', '次の発作への不安と回避、本人の希望に沿った対処の練習を照合。薬物療法を不要とは説明しない。')
record('AM-103', '環境再生保全機構：小児ぜん息の発作強度', 'https://www.erca.go.jp/yobou/zensoku/basic/child/09_02_01.html', 'SpO2と会話・睡眠などの所見が複数の強度区分にまたがる。公式正答の中発作は固定するが、全所見が中発作に一致するとの説明はできない。専門的確認が必要。', status='review_required', confidence=0.8)

record('AM-093 PM-013', 'NIDCD：失語症', 'https://www.nidcd.nih.gov/health/aphasia', 'ウェルニッケ失語の理解障害、短く簡潔な文で話す援助を照合。構音障害と失語を区別する。')
record('PM-052', 'NIDCD：メニエール病', 'https://www.nidcd.nih.gov/health/menieres-disease', '内耳疾患によるめまい・耳鳴り・難聴と好発年齢を照合。')
record('AM-098', 'NIDDK：腹膜透析', 'https://www.niddk.nih.gov/health-information/kidney-disease/kidney-failure/peritoneal-dialysis', '腹腔内カテーテルと腹膜炎リスクを照合。血液透析のアクセスと区別する。')
record('PM-047 PM-092 AM-056 AM-107', '米国国立老化研究所：レスパイトケア', 'https://www.nia.nih.gov/health/caregiving/what-respite-care?page=1&services=26&topics=89&types=BSC.Article', '家族介護者の負担・休息・家族との時間を支える原則を照合。制度の対象条件は追加せず、訪問時間や支援調整は症例の希望に対応させて点検。')
record('AM-058 AM-101 PM-102', 'OpenStax：個人と環境の安全', 'https://openstax.org/books/fundamentals-nursing/pages/9-1-safety-individual-and-environmental', '転倒予防の履物・手すり・照明・環境調整を照合。自立を一律に制限する選択肢との違いを点検。')
record('AM-053 AM-115', 'OpenStax：電解質異常', 'https://openstax.org/books/medical-surgical-nursing/pages/10-3-electrolyte-imbalance', '高カリウム・低カリウム双方の心電図・不整脈リスクを照合。症例の検査値の異常を点検。')
record('AM-097', 'OpenStax：体液と電解質', 'https://openstax.org/books/clinical-nursing-skills/pages/19-1-fluid-and-electrolytes', '体液過剰による体重増加・浮腫・肺の副雑音を照合。提示されたカリウム値と血糖指標を個別点検。')
record('PM-111', 'Stanford Medicine：新生児の光線療法', 'https://med.stanford.edu/newborns/professional-education/jaundice-and-phototherapy/faqs-about-phototherapy', '眼の保護と露出皮膚への照射を照合。哺乳を一律に中止する説明はしない。')

record('AM-083', 'OpenStax：代謝反応', 'https://openstax.org/books/anatomy-and-physiology/pages/24-1-overview-of-metabolic-reactions', '異化と同化の定義を照合。角化・石灰化・瘢痕化との違いを点検。')
record('PM-075', 'OpenStax：骨格筋', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/10-2-skeletal-muscle', '筋芽細胞の融合による多核筋線維を照合。好中球の分葉核との違いを点検。')
record('PM-079', 'OpenStax：創傷治癒', 'https://openstax.org/books/fundamentals-nursing/pages/24-4-wound-healing', '止血・炎症・増殖・成熟の各段階と、増殖期の肉芽形成を照合。')
record('PM-011', 'OpenStax：摂食行動の神経調節', 'https://openstax.org/books/introduction-behavioral-neuroscience/pages/16-4-neural-control-of-feeding-behavior', '視床下部による摂食調節を照合。他部位の働きは基本機能に限定。')
record('PM-012', 'OpenStax：末梢神経系', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/13-4-the-peripheral-nervous-system', '頸神経8対を照合。頸椎数と区別する。')
record('PM-026', 'OpenStax：感覚の受容', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/14-1-sensory-perception', '蝸牛の頂部は低周波、基底部は高周波という場所対応を照合。音量と周波数を区別する。')
record('PM-027', 'OpenStax：味覚系', 'https://openstax.org/books/introduction-behavioral-neuroscience/pages/8-2-the-gustatory-system', '水素イオンと酸味の対応を照合。')
record('PM-085', '厚生労働省：地域包括ケアシステム', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/kaigo_koureisha/chiiki-houkatsu/index.html', '施設機能と住民の互助を含む地域ごとの構築を照合。圏域は同省の30分圏域資料でも確認。')
record('PM-002 AM-057', '厚生労働省：介護保険法', 'https://www.mhlw.go.jp/web/t_doc?dataId=82998034', '市町村の認定・地域密着型サービス指定、40歳以上の被保険者区分を照合。社会保険による共助と行政措置を区別する。')

record('PM-003', '厚生労働省：2018年介護保険法等改正施行通知', 'https://www.mhlw.go.jp/web/t_doc?dataId=00tc3510&dataType=1&pageNo=1', '所得に応じた1・2・3割負担を出題前の施行通知で照合。対象外費用と区別する。')
record('AM-036', 'OpenStax：消化器の身体診察', 'https://openstax.org/books/nutrition/pages/4-2-physical-assessment-of-digestive-organs', '腹部のガスによる鼓音と液体・実質臓器の濁音を照合。')
record('PM-038', 'OpenStax：心肺機能障害の援助', 'https://openstax.org/books/fundamentals-nursing/pages/19-4-management-of-impaired-cardiopulmonary-functioning', '口すぼめ呼吸の呼気陽圧・気道虚脱軽減の機序を照合。')
record('PM-037', 'NCCIH：リラクセーション技法', 'https://www.nccih.nih.gov/health/relaxation-techniques-what-you-need-to-know', '漸進的筋弛緩法の緊張と弛緩の順序を照合。他の技法との違いを点検。')
record('AM-017', 'NHS：ステロイド', 'https://www.nhs.uk/medicines/steroids/', '免疫反応を抑える作用と感染リスクを照合。用量・中止方法を追加しない。')
record('AM-054', '日本整形外科学会：腓骨神経麻痺', 'https://www.joa.or.jp/public/sick/condition/peroneal_nerve_palsy.html', '足関節・足趾の背屈障害と下垂足を照合。')

record('AM-092', 'CDC：ノロウイルス感染予防', 'https://www.cdc.gov/norovirus/prevention/index.html', '石けんと流水による手洗いを照合。感染性胃腸炎すべてをノロウイルスと診断する説明はしていない。看護中止や看護師の一律の届出義務とは区別する。')
record('PM-025', 'NHS：けいれん時の応急対応', 'https://www.nhs.uk/symptoms/what-to-do-if-someone-has-a-seizure-fit/', '呼吸を保ち、口に物を入れず、無理な拘束をしない援助を照合。')
record('PM-040', '日本蘇生協議会：JRC蘇生ガイドライン2020 BLS', 'https://www.jrc-cpr.org/wp-content/uploads/2022/07/JRC_0017-0046_BLS.pdf', '反応がなく普段通りの呼吸がない場合の判断、死戦期呼吸を正常呼吸としない点を照合。')
record('PM-023', 'NHS：回復体位', 'https://www.nhs.uk/conditions/first-aid/recovery-position/?medium=email&source=GovDelivery', '側臥位による気道保持を照合。正常呼吸の確認が必要であり、心停止時の対応と混同しない。')
record('AM-023', 'OpenStax：骨折と固定中の観察', 'https://openstax.org/books/medical-surgical-nursing/pages/13-3-bone-fractures', '固定部より末梢の循環・皮膚色・温度・感覚の観察を照合。')

record('PM-106', 'MedlinePlus：フォルクマン拘縮', 'https://medlineplus.gov/ency/article/001221.htm', '骨折・腫脹に伴う前腕の血流低下と拘縮を照合。他の徴候を本症例に追加しない。')
record('AM-055', 'OpenStax：牽引などの固定具', 'https://openstax.org/books/clinical-nursing-skills/pages/9-5-limited-movement-devices', '骨に刺入する鋼線・ピンによる直達牽引と皮膚牽引を照合。')
record('AM-052', 'MedlinePlus：MRI', 'https://medlineplus.gov/ency/article/003335.htm', '磁場による植込み機器への影響と事前確認を照合。条件付き対応機器もあるため一律禁忌と断定しない。')
record('PM-016', 'MedlinePlus：クレアチニン検査', 'https://medlineplus.gov/lab-tests/creatinine-test/', 'クレアチニンクリアランスによる濾過機能の推定を照合。他臓器の検査指標と区別する。')
record('PM-029', '米国国立がん研究所：上咽頭癌', 'https://www.cancer.gov/types/head-and-neck/patient/adult/nasopharyngeal-treatment-pdq', 'EBウイルスと上咽頭癌との関連を照合。すべての患者の原因をウイルスと断定しない。')

record('PM-030', '日本神経学会：単純ヘルペス脳炎診療ガイドライン2017', 'https://www.neurology-jp.org/guidelinem/hse/herpes_simplex_2017.pdf', '側頭葉に多い病変分布を照合。')
record('PM-050', '難病情報センター：皮膚筋炎・多発性筋炎', 'https://www.nanbyou.or.jp/entry/4080', '近位筋の筋力低下と上肢を挙げる動作への影響を照合。皮膚筋炎などの皮膚所見と区別する。')
record('PM-056', '日本皮膚科学会：皮膚瘙痒症診療ガイドライン2020', 'https://www.dermatol.or.jp/dermatol/wp-content/uploads/xoops/files/guideline/souyouGL2020.pdf', '加齢・乾燥、原発疹のないかゆみと掻破後の皮膚変化を区別して照合。')
record('PM-078', '米国国立がん研究所：上大静脈症候群', 'https://www.cancer.gov/publications/dictionaries/cancer-terms/def/superior-vena-cava-syndrome', '上半身からの静脈還流障害と顔面浮腫を照合。胸水が絶対に起こらないとは説明しない。')

record('PM-103 PM-104 PM-105', 'NICE：人生の最期の数日間のケア（NG31、2015年）', 'https://www.nice.org.uk/guidance/ng31/chapter/Recommendations', '本人の希望、看取りの経過と家族への説明、苦痛評価、呼吸音だけで処置を決めない点を照合。延命を望まない意思は共通症例で確認。')
record('PM-082', 'NHS：下肢静脈瘤', 'https://www.nhs.uk/conditions/varicose-veins/?ContensisTextOnly=true', '加齢・妊娠と静脈弁機能・圧負担を照合。DVTの危険因子と同一視しない。')
record('PM-086', '厚生労働省：民生委員法', 'https://www.mhlw.go.jp/bunya/seikatsuhogo/minseiiin01/02a.html', '任期3年と大臣委嘱を確認。同省の民生委員説明で児童委員兼務、人数は過年度約23万人を確認し50万人との説明を退ける。正確な現在人数は追加しない。')
record('PM-034', '日本作業療法士協会：作業療法ガイドライン2024', 'https://www.jaot.or.jp/files/page/gakujutsu/guideline/OT%20guideline_2024.pdf', '食事動作の練習、自助具の選択・作成・適合という職務を照合。')
record('PM-090', '厚生労働省：精神科領域に関連する専門看護師等', 'https://www.mhlw.go.jp/file/05-Shingikai-12404000-Hokenkyoku-Iryouka/0000102476.pdf', '身体科患者への精神的支援と看護スタッフへの相談を照合。処方や単独の拘束判断などを役割に追加しない。')

record('PM-094', '国立がん研究センター：大腸がん検診', 'https://ganjoho.jp/med_pro/cancer_control/screening/screening_colon.html', '便潜血陽性から精密検査としての全大腸内視鏡への流れを照合。')
record('PM-095', 'Royal Free London：腹腔鏡検査・手術', 'https://www.royalfree.nhs.uk/patients-and-visitors/patient-information-leaflets/having-diagnostic-laparoscopy', '全身麻酔と二酸化炭素による気腹を照合。切除部位は症例の左半結腸切除と解剖から点検。')
record('PM-096', '国立がん研究センター：大腸がん療養', 'https://ganjoho.jp/public/cancer/colon/follow_up.html', '腸切除後の下痢などの排便変化を照合。胃切除後のダンピングとの混同を点検。')
record('AM-010', '厚生労働省：2022年国民生活基礎調査・世帯の状況', 'https://www.mhlw.go.jp/toukei/saikin/hw/k-tyosa/k-tyosa22/dl/02.pdf', '表1の夫婦のみ24.5％、夫婦と未婚子25.8％、ひとり親と未婚子6.8％の和57.1％が約60％に最も近い。単独世帯を含めない。')
record('AM-030', '厚生労働省：令和3年度医療費の動向', 'https://www.mhlw.go.jp/topics/medias/month/23/dl/medias_01.pdf', '25ページの被用者保険加入者7,767万人と人口規模から約6割を確認。先進医療技術料・負担区分・後期高齢者医療との違いを点検。')

record('AM-064', '厚生労働省：統計に用いる比率と用語', 'https://www.mhlw.go.jp/toukei/kaisetu/index-hw.html', '乳児・新生児死亡率の出生数分母、周産期死亡率の満22週以後の死産と出生、日本の妊産婦死亡率の出産数を照合。')

record('AM-049', 'NICE：服薬アドヒアランスCG76', 'https://www.nice.org.uk/guidance/cg76/chapter/Recommendations', '本人が治療の利益・不利益を理解し、懸念を話し合い意思決定に参加する支援を照合。')
record('PM-043', '厚生労働省：高齢者の医薬品適正使用の指針2018', 'https://www.mhlw.go.jp/web/t_doc?dataId=00tc3422&dataType=1', 'お薬手帳による処方の共有と一元管理を照合。自己判断での粉砕や中断、管理方法の一律化を避ける説明を点検。')
record('AM-070', '国立がん研究センター：AC療法の患者向け説明', 'https://www.ncch-accel.ncc.go.jp/jp/ncch/division/pharmacy/010/pamph/breast_cancer/020/index.html', '点滴部位の腫れ・痛みの迅速な報告が必要なことを照合。本問では薬剤名を推定せず、血管外漏出の可能性の確認を優先。')
record('AM-085', '久光製薬：経皮吸収型製剤一覧（2021年）', 'https://www.hisamitsu-pharm.jp/assets/img/tdds/pdf/pamphlet08.pdf', 'ニトログリセリンとフェンタニルの貼付製剤を照合。製剤の存在を問う設問として、投与量や適応患者を追加しない。')
record('PM-045', 'PMDA：フェンタニル貼付剤添付文書（2021年）', 'https://www.pmda.go.jp/drugs/2021/P20210830005/650034000_22200AMX00301_B100_1.pdf', '皮膚刺激を避ける貼付部位の変更を照合。在宅での保管と麻薬診療施設の保管要件は厚労省ガイダンスを参照して区別する。')

def short(ids,title,url,note,status='approved',confidence=0.95):
    record(ids,title,url,note,status,confidence)
    for qid in ids.split():
        reviews['115-'+qid]['scope']='簡潔形式の正答理由・覚えるポイント。旧選択肢別解説の承認ではない。'

short('AM-003','NHLBI：睡眠の段階','https://www.nhlbi.nih.gov/health/sleep/stages-of-sleep','急速眼球運動、活発な脳活動、四肢の筋緊張低下を照合。')
short('AM-048','厚生労働省：意思決定プロセスのガイドライン2018','https://www.mhlw.go.jp/file/05-Shingikai-10801000-Iseikyoku-Soumuka/0000198999.pdf','患者の推定意思と価値観を中心に判断する原則を照合。')
short('AM-059','厚生労働省：避難所での生活不活発病予防','https://www.mhlw.go.jp/stf/newpage_00448.html','安全な活動による生活機能低下予防を確認。入院を要する異常を症例に追加せず、現在の活動低下から優先順位を点検。')
short('AM-060','NIDDK：乳児の胃食道逆流','https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-infants','乳児期に逆流が多く成長に伴い減る特徴を照合。')
short('AM-091','厚生労働省：地域連携クリティカルパス','https://www.mhlw.go.jp/bunya/shakaihosho/iryouseido01/taikou03.html','医療機関間の診療計画共有と急性期から回復期への継続を照合。介護支援専門員への情報提供を全否定する説明はしていない。')
short('PM-065','CDC：B群溶血性連鎖球菌','https://www.cdc.gov/group-b-strep/about/index.html','母体の生殖路の菌が分娩時に児へ伝播することを照合。')
short('PM-064','日本産科婦人科学会：不妊症','https://www.jsog.or.jp/citizen/5718/','人工授精と体外受精・顕微授精等のARTを区別。保険の対象・回数は追加しない。')

short('AM-071','日本看護協会：夜勤中の仮眠','https://www.nurse.or.jp/nursing/practice/shuroanzen/jikan/pdf/kamin.pdf','夜勤中の計画的仮眠による負担軽減を照合。普及率は新形式の説明から除外する。')
short('AM-079','厚生労働省：地域保健','https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/tiiki/','市町村保健センターの健康相談・保健指導・健康診査という直接サービスを照合。施設数は説明に含めない。')
short('AM-087','WHO：手術安全チェックリスト実施手引2009','https://www.who.int/docs/default-source/patient-safety/9789241598590-eng.pdf','侵襲的手技前のチーム全体の作業中断と口頭確認を照合。覚醒している患者の参加を否定する説明は含めない。')

short('AM-009','OpenStax：生理機能の指標','https://openstax.org/books/fundamentals-nursing/pages/7-1-indicators-of-physiologic-functioning','乳児と学童の血圧の発達上の違いを表で照合。個人の高血圧診断基準は追加しない。')
short('AM-062','エストロゲン補充と骨成熟の臨床研究（2009年）','https://pubmed.ncbi.nlm.nih.gov/19345749/','エストロゲンが骨端閉鎖に関与する中心知識を臨床研究と照合。投薬の推奨には広げない。')
short('AM-018 AM-106','NHS：嚥下障害の管理','https://www.enherts-tr.nhs.uk/wp-content/uploads/2022/01/Dysphagia-V1-12.2021-web.pdf','嚥下評価に基づく食形態と頭頸部姿勢の調整を照合。全患者に頸部前屈が有効とはしない。症例の刻み食でのむせを評価。')
short('AM-035','厚生労働省：介護の日本語・介護技能教材','https://www.mhlw.go.jp/content/12000000/001253099.pdf','半座位での膝の支持を照合。ずれの抑制という体位保持の目的を点検。')
short('AM-043','厚生労働省：訪問看護指示書様式（2020年）','https://www.mhlw.go.jp/content/12400000/000603917.pdf','使用医療機器等の状況を記載する欄と医師の指示書であることを照合。未確認の期間情報は解説に追加しない。')
short('AM-084','CDC：ツツガムシ病','https://www.cdc.gov/typhus/about/scrub.html','感染したダニ幼虫による媒介を確認。疥癬についてもCDCのSarcoptes scabieiの記載を照合。')
reviews['115-AM-084']['sources'].append({'title':'CDC：疥癬','url':'https://www.cdc.gov/dpdx/scabies/index.html'})

short('AM-039','スコピエ大学歯学部：Oral Hygiene','https://stomfak.ukim.edu.mk/wp-content/uploads/2026/03/Book-Oral-Hygiene.pdf','バス法の毛先方向と小刻みな振動による歯肉溝清掃を照合。普遍的な手技の説明に限定し、出題後の制度変更を含まない。')
short('AM-040','Cambridge University Hospitals：静脈カニューレの管理','https://www.cuh.nhs.uk/patient-information/caring-for-your-cannula-at-home/','更衣中の牽引による抜去予防を照合。ルートを外さず衣類を通す手順の合理性を点検。')
short('AM-050','神経疾患のある小児の尿路結石に関する系統的レビュー（2024年）','https://pubmed.ncbi.nlm.nih.gov/39522107/','不動・高カルシウム尿と結石リスクを照合。必ず発症するとはせず、起こり得る合併症として説明。')
short('AM-095','Royal Cornwall Hospitals：胸腔ドレーン管理指針','https://doclibrary-rcht.cornwall.nhs.uk/DocumentsLibrary/RoyalCornwallHospitalsTrust/Clinical/Respiratory/InsertionAndManagementOfChestDrainsClinicalGuideline.pdf','ドレーンの固定・移動時の牽引回避・排液観察を照合。離床前後の位置比較を提示症例に適用。')

short('PM-019 PM-033','OpenStax：アセスメントにおける批判的思考','https://openstax.org/books/medical-surgical-nursing/pages/6-1-critical-thinking-in-assessment','データを収集する段階と、根拠に基づき解釈して判断する段階を照合。症例にない所見を作らない。')
short('PM-021','CDC：ワクチン投与法','https://www.cdc.gov/vaccines/hcp/imz-best-practices/vaccine-administration.html','三角筋という筋注部位、筋量・部位を考慮する原則を照合。全薬剤の刺入条件や量に一般化しない。')
short('PM-022','Hull University Teaching Hospitals：口腔内吸引','https://www.hey.nhs.uk/patient-leaflet/oral-suction-information-for-patients-and-carers/','口腔へ挿入してから吸引する手順と粘膜保護を照合。圧や時間の未確認の数値を追加しない。')
short('PM-032','日本蘇生協議会：JRC蘇生ガイドライン2020 BLS','https://www.jrc-cpr.org/wp-content/uploads/2022/07/JRC_0017-0046_BLS.pdf','一般市民のAED使用を含む病院前の救命の連鎖を照合。搬送患者の構成比は説明に含めない。')

short('PM-024','英国MRC：筋力尺度','https://www.ukri.org/councils/mrc/facilities-and-resources/find-an-mrc-facility-or-resource/mrc-muscle-scale/','0〜5の筋力評価で5が最高段階であることを照合。尺度全文は転載しない。')
short('PM-041','Cambridge University Hospitals：尿路超音波検査','https://www.cuh.nhs.uk/patient-information/ultrasound-scan-of-the-urinary-tract/','膀胱を尿で満たして検査する準備を照合。飲水量の数値は追加しない。')
short('PM-054','NHS：妊娠中の超音波検査','https://www.nhs.uk/pregnancy/your-pregnancy-care/ultrasound-scans/','音波を使い妊娠中にも実施する原理を照合。乳房超音波とマンモグラフィの違いを点検。')
short('PM-055','East London NHS：MMSE用紙','https://www.elft.nhs.uk/sites/default/files/2022-01/mmse.pdf','3段階命令という項目の存在を確認。検査用紙や命令の具体文は転載しない。')

def save():
    for qid,r in reviews.items():
        r.setdefault('reviewed_on','2026-09-09')
        r.setdefault('input_sha256',digest(questions[qid]))
        r.setdefault('explanation_sha256',digest(candidates[qid]))
    path.write_text(json.dumps(reviews,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__ == '__main__':
    save()
    from collections import Counter
    print(dict(Counter(r['status'] for r in reviews.values())))
