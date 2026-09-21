# Vitest CI practice — P29

TypeScript/Vitestの合成プロジェクトで、**計測 → 変更1つ → 同条件の再計測 → 必要な試験の維持確認**を体験する無料の実行例です。利用者のコードを自動診断・自動修正するツールではありません。

公開先は[Issey-Kubota/vitest-ci-practice](https://github.com/Issey-Kubota/vitest-ci-practice)です。2026-09-21に設定エラーを修正し、GitHub Actionsで手動1回の確認に成功しました。全6回が有効で、経過時間中央値は2.226秒→1.517秒でした。各回・維持確認・最初の失敗も[CI確認記録](docs/ci-result.md)へ記録しています。

## 固定構成

|項目|条件|
|---|---|
|Node / npm|24.19.0 / 11.9.0|
|Vitest / coverage-v8|5.0.1 / 5.0.1|
|Vite / TypeScript|8.3.0 / 5.9.2|
|実行環境|Linux x64、Node environment、forks pool|
|分離・並列度|isolate有効、4 workers、fileParallelism有効|
|試験|16ファイル、32テストID、48 assertions、16 inline snapshots|
|coverage|v8、feature-01〜16、lines/functions/statements 95%以上、branches 75%以上|

依存は同梱の`package-lock.json`で固定します。React、DOM、外部API、DB、sleepは使いません。48個の合成カタログモジュールはimport時に決定的な検索indexを作ります。

## 比較する変更

baselineは各テストから48モジュールを再exportするbarrelの`src/features/index.ts`をimportします。candidateは対象の`feature-NN.ts`を直接importします。不要なモジュール評価がimport時間へ影響する、という1つの仮説を比較します。

```diff
-import { key01, lookup01 } from '../src/features/index.js'
+import { key01, lookup01 } from '../src/features/feature-01.js'
```

全16ファイルで各対象に対応するimport先だけを変更します。固定した変更前の全文は[`reference/baseline-tests.json`](reference/baseline-tests.json)、対応表は[テスト一覧](docs/test-inventory.md)にあります。テストID・assertion・snapshot・coverage・worker・isolationは維持します。検証時に固定基準を生成し直しません。

**barrelが公開APIの入口でもある場合は、入口を通るexport名・公開経路・契約の試験を残してください。** 本例は内部機能の合成試験です。必要な公開API試験を除外する理由にはなりません。

## 再実行する

上記のNode/npmを用意し、利用・変更を許可された作業用コピーで実行してください。依存を取得できない、または指定版を用意できない場合は、その条件の確認を未実行として止めます。別版への置換やlockfile再生成で成功に見せないでください。

```bash
npm ci
npm run verify:manifest
npm run measure
npm run failure-check
node --test --test-concurrency=1 scripts/check-manifest.test.mjs scripts/check-measure.test.mjs scripts/check-failure.test.mjs
npm run verify:manifest
```

`measure`はbaseline/candidateを交互に各3回、計6回実行します。毎回`node_modules/.vite`を削除し、Node compile cacheを無効にします。OS page cacheやホスト負荷は制御しません。新しいVitest JSON、stdout/stderr、coverage、条件、時間は新規の`artifacts/measure-*/`に保存し、最後にテストを開始時の内容へ戻します。

`generate`や単独の`test:baseline`／`test:candidate`はこの確認手順では使いません。後者は旧`results/current.json`を上書きします。旧結果と新しい実行結果は分離してください。

`failure-check`は各import条件で「故障なし」「既知の実装故障」「意図した環境エラー」を確認し、実装とテストを復元します。この別実行は対象2件・coverageなしです。性能測定の全32件・同一coverageとは別に扱います。

補助回帰24件は、模擬結果を含む補助処理の確認です。性能を24回測ったことにはなりません。

## 結果を読む

- 起動失敗、欠測、古いJSON、条件不一致、テスト不一致は理由付きの無効記録です。有効6回が揃った場合だけ比較し、欠測を0や推定値にしません。無効があれば測定コマンド全体も失敗します。
- OS経過時間、VitestのDuration、並列子プロセスを含む合計CPU時間は別の指標です。CPU時間をrunner占有時間・課金時間へ読み替えません。
- 初版ローカルの中央値は2.710秒→1.960秒、修正後ローカルは4.603秒→2.979秒でした。修正後の2組目は5.193秒→5.281秒と遅くなりました。短い合成例の観測で、普遍的な効果ではありません。
- 初版ローカル、修正後ローカル、今回のCIは別セッションです。キャッシュ制御も完全には同じではなく、12回・18回の一つの比較へまとめません。

根拠：[初版ローカル6回](docs/actual-report.md)、[修正後ローカル6回・正常／異常確認](docs/revision-report.md)、[CI確認記録](docs/ci-result.md)、[配布内容と原記録](docs/distribution.md)。

## CIの扱いと限界

同梱の[workflow](.github/workflows/p29-fixed-validation.yml)と[実行条件の説明](docs/ci-workflow.md)にある初回構成は`ubuntu-24.04`、上記ツール版、単一job、上限15分です。workflowの起動条件は手動の`workflow_dispatch`だけとし、push・PR・定期実行は設定しません。4 workersはそのjob内のVitest並列度です。

runnerラベル・ツール版・依存・測定条件を揃えることを「固定」と呼びます。ローカルと同じハードウェアや、全実行で同じホスト状態を意味しません。実CIで成功しても、この合成例をCIで1回確認したという範囲です。

CIへの必要テスト復帰、継続運用、利用者環境への効果、商品需要は未確認です。DOM/Browser Mode、DB・外部I/O、複数jobの結果結合、実コードの状態・順序依存もこの例では解決しません。試験一致と既知の故障1件の検知は、品質全体の保証ではありません。

## 試用・質問

[試用案内](docs/offer-and-questions.md)とIssueテンプレートを用意しています。[GitHub Issues](https://github.com/Issey-Kubota/vitest-ci-practice/issues)では、課題報告・公開例の実行・本人環境への適用を分けて記録します。社名、個人名、会社コード、生ログ、秘密情報は投稿しないでください。

初回の個別試用支援は最大2チーム、必要時の説明30分＋非同期30分を1チームの予算目安とします。無期限サポートや個別改修の約束ではありません。現在は無料の検証例で、価格・有料版・販売開始日・方式は未定です。予約・決済は受け付けません。

## 利用条件

本合成例は[MIT License](LICENSE)です。既存の著作権表記を維持してください。自分の環境へ適用するときは、コード・依存・ログの利用条件と変更許可を確認してください。
