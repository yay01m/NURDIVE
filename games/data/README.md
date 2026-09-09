## 追加年度の分類

追加897問すべてに11科目・中分類・トピックを付与。7問は分類の境界を要確認として暫定表示します。問題形式は別属性のまま、問題・選択肢・正答は変更していません。非公式の学習用分類で、公式の設問別分類との照合は未実施です。`scripts/apply_additional_classification.py` でID別の判断を反映し、入力ハッシュとID集合を検証します。

## 2022〜2026年の収録（最新）

合計1,125問。第111回224問、第112回227問、第113回221問、第114回225問、第115回228問です。年度選択に対応しています。

追加4年分は公式問題・公式正答のみ先行公開し、11科目・中分類・トピックに分類済みです。解説・個別の投影演出は準備中と表示します。960問中63問は画像、採点上の取扱い、データの欠損、未対応の回答形式などで保留しています。全文の目視照合は未完了です。第115回の既存データは維持しています。

追加データは `data/additional_questions.json`、保留一覧は `data/additional_questions_held.json`、集計は `data/additional_questions_report.json`（dataフォルダ内では接頭辞不要）。再生成順は `scripts/prepare_four_years.py` → `scripts/build_additional_questions.py` → `scripts/export_game_questions.py`。文字復元は各PDFのFontリソースのEncoding/Differencesを使用します。同じフォント名でも文字定義が異なるため、フォント名だけの一括置換は禁止。特殊漢字・記号は原本描画と照合した対応表を使います。現在の1,125問を比較し、119問の文字化けを訂正（括弧の表記統一を含めると377問）。正答・分類・収録IDは変更していません。記録：`data/work/font-recovery-report.json`。

以下は第115回の整備履歴を含みます。

## 現在の掲載方針

ユーザー指定により、115-AM-029・076・080・091・103をUNKNOWN（解説の一部不明）として掲載。第115回の228問では不明箇所を明記します。公式正答は変更しません。以下の過去のREJECT・223問という記録は最終確認時点の履歴です。

# 公式過去問データの作業状況

第106〜115回（2017〜2026年）、午前120問・午後120問の全2,400問を公式資料から収集・抽出し、正答表と対応付けました。当初のゲーム採用は223問でした。現在の収録数は冒頭を参照してください。

## ファイル

- `questions.json`：確認済み採用問題。第115回のゲーム出力入力。
- `excluded_questions.json`：画像・図表が必要な106問。古い年度の検出は再確認が必要。
- `review_questions.json`：原文・文字・選択肢・分類などの確認待ち。
- `special_questions.json`：採点除外・条件付き採点除外の保留問題。
- `all_questions.json`：全2,400問と処理状態。
- `questions.csv`：全2,400問の監査用CSV。配列はJSON文字列。採用済み以外も含む。
- `categories.json`：新しい非公式の分野・細分類・テーマ。
- `validation_report.json`：年度別件数、欠番、正答範囲、原本ハッシュ等の検証結果。
- `source_manifest.json`、`special_status_manifest.json`：公式資料のURLと採点取扱い41件。
- `sources/`：公式PDFと抽出情報。
- `work/`：年度別の生データ、確認記録、分類、原本確認用画像。

`dataset_status` は adopted / excluded_image / withheld_special / pending_review の相互排他的な状態です。`needs_review` は画像除外などと重複するため、件数を単純に足さないでください。

正答番号は1始まりです。`accepted_answer_sets` の各配列が一つの許容回答です。`[[4],[5]]` は4か5の一方、`[[1,3]]` は1と3の両方で正解です。出典にはPDFページ・正答表の行・SHA256を保存しています。共通症例は `case_text`、先行文脈は `preceding_context_ids` に記録します。原文抽出は `work/{回}.json` に保持します。必修は `question_type`、内容分野は `category` です。分類は非公式です。現在の選択肢別解説は別ファイル choice_explanations.json に保存し、元の問題JSONは変更しません。

## 未完了と再開手順

第115回は画像9問と採点除外1問を除外しています。AM31は組合せ選択肢の段組み、AM90は数値入力の確認・実装が残っています。

第114〜106回は全文照合・個別の意味分類が残っています。PDFフォントのCID未変換、数字の文字化け、選択肢の読み順、共通症例の結合を原本表示で確認してください。CIDはフォントごとに異なるため、一括置換や問題を解いて推測する修正はしないでください。

第112回PM26の公式訂正、第115回AM80等の複数正答は反映済みです。全2,400問の番号には欠番・重複がなく正答表の行を対応付けていますが、全文の正確さを保証するものではありません。

`work/115-review.json` と `work/115-classification.tsv` を手本に年度別の確認情報を作り、`scripts/validate_official.py` を更新・実行してください。採用チェックを通してから `scripts/export_game_questions.py` でゲームに反映し、画面の収録数も更新します。


## 分類ルール（更新）

`question_type` は「必修問題」「一般問題」「状況設定問題」のいずれかです。科目は指定11科目のみで、「必修」は科目ではありません。分類済み240問には科目・中分類・トピックを保持し、未確認の2,160問はこれらをnull、needs_reviewをtrueとしています。

共通症例は同じ `case_id` と `case_text` を持ち、`question` には各設問固有の文だけを保存します。症例の境界は抽出時に読み取った範囲を使い、3問ずつと推測して結合しません。原本の症例抽出に問題が残るものは要確認です。`preceding_context` は同じ症例の先行設問で追加された情報を保持します。ゲーム表示時だけ症例・先行設問・当該設問を組み立てます。

`classification_confidence` は確信度未評価のためnullです。個別に公式出題基準と照合した記録がないため `classification_source` もnullであり、公式準拠とはしていません。`classification_status` で非公式分類済みか確認待ちかを区別します。

選択肢別解説は全228問処理済みです。choice_explanations.json に id、choice_explanations、status、review_reason、fixes_made を保持します。PASS 199問、FIXED 24問、REJECT 5問、未処理0問。掲載は223問です。問題・選択肢・公式正答は変更せず、REJECTは元データを残して全出題モードから除外します。choice_explanation_report.json は最終ID照合による件数です。過去の短文解説・一次検証・最終検証は履歴であり、現在の掲載可否はchoice_explanations.jsonを参照してください。

最終確認：従来FIXEDの23問はAPPROVED。従来REJECTの6問はRESCUED 1問（115-AM-088）、KEEP_REJECTED 5問です。個別結果は `data/choice_final_validation.json`、集計は `data/choice_final_report.json` に保存しています。PASS 199問は再検証していません。
