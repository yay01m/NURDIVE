# オリジナル問題の執筆基準

前回の20問を保持し、9分野をそれぞれ合計100問にする。総数900問。既存のID・問題・選択肢・正答・解説を変更しない。

| ファイル名 | 分野 | 既存 | 追加 | 新規ID接頭辞 |
| --- | --- | ---: | ---: | --- |
| anatomy.json | 人体の構造と機能 | 3 | 97 | ORG-ANA- |
| fundamentals.json | 基礎看護学 | 3 | 97 | ORG-FND- |
| adult.json | 成人看護学 | 3 | 97 | ORG-ADL- |
| gerontology.json | 老年看護学 | 3 | 97 | ORG-GER- |
| pediatric.json | 小児看護学 | 2 | 98 | ORG-PED- |
| maternity.json | 母性看護学 | 2 | 98 | ORG-MAT- |
| psychiatric.json | 精神看護学 | 2 | 98 | ORG-PSY- |
| community.json | 地域・在宅看護論 | 1 | 99 | ORG-COM- |
| integration.json | 看護の統合と実践 | 1 | 99 | ORG-INT- |

## 品質

- 国試対策レベル、独自執筆、4択単一正答。正答は1始まりの整数。各選択肢それぞれに、理由の分かる解説を付ける。
- 単なる語尾変更・人物名や数値だけの変更で水増ししない。分野内の学習項目を広く扱う。同じ論点の反復を避ける。
- 症例の条件不足で複数が正しくなる問いを避ける。「最初」「最も優先」の判断には必要な状態や場面を明示する。
- 不正解の選択肢は学習上あり得る取り違えにする。無関係な選択肢だけで正答が露骨に浮かぶ構成を避ける。
- 医療・制度の事実は公的機関、学会、医療機関などの資料で確認する。根拠は編集記録へ保存し、ゲーム画面にURLを表示しない。
- 公式過去問の転載・言い換え問題は作らない。医学的事実をもとに独自の設問を作る。
- 解説は簡潔でも各選択肢固有の理由を書く。使い回しの定型文だけの解説は不可。
- 医療専門職の監修済みとは表示しない。不確かな内容は完成扱いにしない。
- 演出は問題で示された疾患・状態だけ。既存の affected-* / sim-* クラスを使用し、推定病変やバイタル値を捏造しない。

## 追加ファイル形式

JSONオブジェクト `{"category":"分野名","sources":{"固有キー":{"title":"資料名","url":"確認したURL","checked_at":"YYYY-MM-DD"}},"questions":[...]}`。

各問題は `id, category, topic, question, choices（4個）, answer（1〜4）, notes（4個）, reference_keys（sourcesのキー）, questionType（一般問題）, review_status（checked）, review_note` を持つ。IDは表の接頭辞に001からの3桁番号を付ける。sourcesキーは各分野接頭辞を付ける。計算問題は reference_keys を空にできるが、review_note に計算による検証内容を書く。

任意の `effect` は `name, detail, disease:true, avatarClasses, kind:"condition"`。根拠のある対応のみ追加する。

ファイルは自身の担当分野だけ編集する。集約用ファイル・UI・ビルド処理は統合担当が更新する。
