# P29 初版ローカル実測レポート

実測日：2026-09-21。説明用モックの数値は使用していません。以下の数値は保全した初版の6回です。修正後の確認結果は`revision-report.md`に分離しています。

旧6回のOS経過時間合計は13.910秒です。旧報告の15.910秒は加算誤りでした。

## 結論

このローカル合成例では、barrel importを対象モジュールの直接importへ変える1変更により、3回中央値のOS経過時間は2.710秒から1.960秒へ27.7%短くなりました。子プロセスの合計CPU時間は9.169秒から6.556秒へ28.5%減りました。32テストは全回成功し、coverage条件も全回同じです。

これはCIで必要テストを復帰できた証拠ではありません。短い合成suiteで観測したローカル結果です。

## 条件

Node 24.19.0、Vitest 5.0.1、TypeScript 5.9.2、coverage-v8 5.0.1、Linux x86_64、forks、isolate有効、4 workers、冷Vitest/Viteキャッシュ。baseline/candidateを交互に各3回実行しました。

coverageはv8、対象16モジュール、excludeはbarrelだけ、閾値はlines/functions/statements 95%、branches 75%。結果はstatements 100%、branches 75%、functions 100%、lines 100%でした。

## 元結果と比較

|順番|条件|OS経過 ms|合計CPU ms|Vitest Duration|結果|
|---:|---|---:|---:|---|---|
|1|baseline 1|2,710|9,539|2.19s|32/32成功|
|2|candidate 1|1,878|6,042|1.42s|32/32成功|
|3|baseline 2|2,722|9,169|2.15s|32/32成功|
|4|candidate 2|2,116|6,686|1.45s|32/32成功|
|5|baseline 3|2,524|8,703|2.05s|32/32成功|
|6|candidate 3|1,960|6,556|1.50s|32/32成功|

|指標|baseline中央値|candidate中央値|変化|
|---|---:|---:|---:|
|OS経過時間|2,710 ms|1,960 ms|-27.7%|
|合計CPU時間|9,169 ms|6,556 ms|-28.5%|
|Vitest Duration|2.15 s|1.45 s|-32.6%|

baselineではVitestのフェーズ比率でimportが48〜50%でした。candidateではimportが22〜24%でした。比率は並列フェーズ合計に対する値で、wall-clock比率ではありません。

元データは`results/measurements.json`、各回のVitest JSONは`results/baseline-N.json`と`candidate-N.json`、表示結果は対応する`.stdout.txt`です。

## 維持確認

- 同じ16ファイル、32 test ID、48 assertions、16 inline snapshots。
- skip/todo/retryは0。excludeやskipの追加なし。
- coverage provider、対象、exclude、閾値は同一。
- environment、pool、isolate、worker数は同一。
- 初版の別実行は期待値を137から138へ変更したもので、実装故障の検知証拠にはしません。旧ログは保全し、修正版で実装側の逆引き結果を138へ変え、元の期待値137による失敗を両条件で検知しました。詳細は`revision-report.md`。

修正後の故障確認も、1つの既知の異常の検知に限ります。品質全体は保証しません。

## 正常、失敗、欠測の扱い

元の正常測定6回の保存内容はexit code 0、JSONあり、32/32成功と整合しています。保存記録の照合と、固定環境での実行は別の確認です。旧`results/failure-check.json`は期待値変更方式の記録としてのみ保全しています。

この初版の最終6回に欠測はありません。準備中にsnapshot表記とcoverage閾値の不整合で失敗した実行がありました。これは有効測定前の実装不備として採用せず、最終レポートの成功回へ混ぜていません。初版の補助処理には古い成功JSONを再利用し得る不備がありました。修正後は新規保存先と実行時刻を確認し、欠測・起動失敗・条件不一致を理由付きで無効とします。無効回があれば比較を出さずコマンド全体を失敗にします。

## 次の判断

この保存結果だけで第三者の再現を確認したことにはなりません。価値仮説の確認には第三者が同じ手順を実行し、公式情報の後に残る判断負担、個別支援時間、本人環境での適用可否を記録する必要があります。CI復帰判断は、実CIのworkflow時間、runner費用、安定性、継続実行を確認してから行います。

## 公開API入口の注意

barrelが公開APIの入口である実プロジェクトでは、入口経由のexport・契約を確認する試験を残してください。本例は内部機能の試験であり、直接importにすべて置換して公開API試験を削ることは勧めません。

## 後続のCI確認

この文書は初版ローカル6回のみを扱います。後続のCI状態は[CI確認記録](ci-result.md)へ分離しています。
