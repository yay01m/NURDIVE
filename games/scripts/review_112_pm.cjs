const fs=require('fs');
const dir='data/additional-explanations';
const qs=JSON.parse(fs.readFileSync('data/additional_questions.json','utf8')).filter(q=>q.id.startsWith('112-PM'));
const notes=new Map(fs.readdirSync(dir).filter(f=>/^112-PM-.*\.txt$/.test(f)).flatMap(f=>fs.readFileSync(`${dir}/${f}`,'utf8').trim().split(/\r?\n/)).map(l=>{const[id,...a]=l.split('|');return[id,a]}));
const sourceMap={
1:['厚生労働省 令和元年簡易生命表 男','https://www.mhlw.go.jp/toukei/saikin/hw/life/life19/dl/life19-15.pdf'],
2:['厚生労働省 食環境づくり検討会議事録 第二次の食塩8g目標','https://www.mhlw.go.jp/stf/newpage_18263.html'],
4:['厚生労働省 医療費の一部負担割合','https://www.mhlw.go.jp/content/000937919.pdf'],
5:['保健師助産師看護師法','https://laws.e-gov.go.jp/law/323AC0000000203?occasion_date=20210114'],
10:['地域保健法','https://www.mhlw.go.jp/web/t_doc?dataId=78301000'],
21:['JRC蘇生ガイドライン2020 BLS','https://www.jrc-cpr.org/wp-content/uploads/2022/07/JRC_0017-0046_BLS.pdf'],
24:['日本赤十字社 一次救命処置','https://www.jrc.or.jp/about/publication/news/200819_006353.html'],
31:['厚生労働省 男女の育児休業取得率の状況','https://www.mhlw.go.jp/content/11901000/001101169.pdf'],
32:['生活保護法','https://www.mhlw.go.jp/web/t_doc?dataId=82048000&dataType=0'],
34:['厚生労働省 喀痰吸引等制度','https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/seikatsuhogo/tannokyuuin/index.html'],
50:['PMDA 注射用エンドキサン くすり情報','https://www.pmda.go.jp/PmdaSearch/rdDetail/iyaku/4211401D1033_1?user=2'],
52:['2019年国民生活基礎調査 健康状況','https://www.mhlw.go.jp/toukei/saikin/hw/k-tyosa/k-tyosa19/dl/04.pdf'],
58:['母体保護法','https://www.mhlw.go.jp/web/t_doc?dataId=80120000&dataType=0'],
64:['厚生労働省 就労移行支援の標準利用期間','https://www.mhlw.go.jp/content/001473458.pdf'],
65:['CDC CAUTI Summary of Recommendations','https://www.cdc.gov/infection-control/hcp/cauti/summary-of-recommendations.html'],
70:['厚生労働省 医療安全管理のための指針','https://www.mhlw.go.jp/topics/bukyoku/isei/i-anzen/1/torikumi/naiyou/manual/index.html'],
81:['厚生労働省 福祉用具・住宅改修','https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000212398.html'],
91:['Clinical features and outcomes of hyperglycemic hyperosmolar syndrome','https://pmc.ncbi.nlm.nih.gov/articles/PMC12532513/'],
100:['小児慢性特定疾病情報センター 医療従事者用ハンドブック','https://www.shouman.jp/pdf/contents/00_handbook.pdf'],
103:['環境再生保全機構 中発作','https://www.erca.go.jp/yobou/zensoku/basic/glossary/kw58.html']
};
const doubts={44:'公式正答は3。前腕回内も尺骨神経圧迫の要因になり得るため、2を排除できる体位条件を確認できない。選択肢2・3に不明点を明記。',50:'公式正答は4。PMDAのシクロホスファミド情報には間質性肺炎も掲載され、2を誤りと断定できない。該当解説に不明点を明記。',65:'公式正答は1。CDCは閉鎖式回路維持を推奨し、4も適切と考えられる。接続を外す必要がある条件が設問に示されず、不明点を明記。'};
const reviews={};
for(const q of qs){
 const a=notes.get(q.id); if(!a||a.length!==q.choices.length||a.some(n=>!n||n.length>200))throw Error(q.id);
 const s=sourceMap[q.number];
 reviews[q.id]={status:doubts[q.number]?'UNKNOWN':s?'VERIFIED':'PASS',checks:[true,true,!doubts[q.number]],check_labels:['公式正答との整合','重大な医学的誤り','複数正答・制度・情報不足の疑義'],review_reason:doubts[q.number]||`問題・全選択肢・公式正答${q.correct_answers.join('、')}を照合。${q.correct_answers.map(n=>a[q.choice_numbers.indexOf(n)]).join(' ')}`,sources:s?[{title:s[0],url:s[1]}]:[],fixes_made:q.number===81?['2023年の出題時点と2024年の固定用スロープ選択制導入を区別。']:q.number===101?['食事制限なしの趣旨に、誤嚥・衛生等の個別安全配慮を明記。']:q.number===98?['CO2貯留を酸素中止ではなく調整・観察につなぐ説明にした。']:[]};
}
fs.writeFileSync(`${dir}/reviews-112-PM.json`,JSON.stringify(reviews,null,2)+'\n');
console.log(JSON.stringify({questions:qs.length,notes:notes.size,reviews:Object.keys(reviews).length,status: Object.values(reviews).reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{})}));
