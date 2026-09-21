# 初回CI確認記録

2026-09-21、設定エラー修正後に手動で1回実行し、成功しました。単一の合成例での確認であり、利用者環境への効果や継続運用・需要は未確認です。

## 実行と修正履歴

- 公開先：[Issey-Kubota/vitest-ci-practice](https://github.com/Issey-Kubota/vitest-ci-practice)、public、default branch `main`。
- 初回公開commit：`053d1ba121b873a287820d243535a6d13207dec6`。
- 初回の[失敗記録 35609668548](https://github.com/Issey-Kubota/vitest-ci-practice/actions/runs/35609668548)はworkflow登録時の設定検証エラーです。jobのenvで使えない`runner.temp`を参照していたため、job・テストは開始されず、artifactもありません。eventはpush、attempt 1、記録時刻は2026-09-21 14:04:17 UTCです。
- 修正commit：`655c46762be358e2342677317d1d872dc957faf4`。参照を最初のstepのenvへ移し、後続stepへ`GITHUB_ENV`で引き継ぎました。変更はworkflowのみです。
- [成功run 35611291375](https://github.com/Issey-Kubota/vitest-ci-practice/actions/runs/35611291375)：`workflow_dispatch`、attempt **1**、対象commitは上記修正commit。手動起動1回、再実行なし。
- 開始14:18:40 UTC、完了14:19:23 UTC、全体43秒。job `106370793824`（fixed-validation）は37秒、全18step成功。2026-09-21の記録です。

起動条件は手動のみ、単一job、matrixなし、`ubuntu-24.04`、上限15分です。push・PR・定期起動は設定していません。設定エラーのpush記録と、実際の手動実行を区別します。

## 実際の条件

Node 24.19.0、npm 11.9.0、Vitest / coverage-v8 5.0.1、Vite 8.3.0、TypeScript 5.9.2を照合済みです。setup-nodeはNodeをダウンロードし、同梱npm 11.17.0から指定の11.9.0へ調整しました。`npm ci`成功、lockfile変更なし、依存復元は性能測定の外です。

runner 2.337.0、Ubuntu 24.04.5 LTS、image `20260907.300.1`、kernel `6.17.0-1022-azure`、AMD EPYC 7763 64-Core Processor、論理CPU4、メモリー16,770,748,416 bytes。CPU型番の64-Core表記はこのjobの利用可能CPU数を意味しません。

Actions依存キャッシュなし、npmは新しい空ディレクトリ。各測定前にViteキャッシュ削除、Node compile cache無効。OS page cache・ホスト負荷は制御していません。forks、isolate有効、4 workers、fileParallelism有効を維持しました。

## 全6回の結果

|順番|条件|OS経過時間 秒|合計CPU時間 秒|有効|
|---:|---|---:|---:|---|
|1|baseline|2.226|6.817|はい|
|2|candidate|1.525|4.531|はい|
|3|baseline|2.176|6.794|はい|
|4|candidate|1.517|4.586|はい|
|5|baseline|2.228|6.855|はい|
|6|candidate|1.497|4.521|はい|

有効6、無効0。経過時間中央値は**2.226 → 1.517秒**（0.709秒、31.9%短縮）、6回の経過時間合計11.169秒。今回の対応3組に悪化回はありません。CPU中央値は6.817 → 4.531秒ですが、CPU時間はrunner占有時間・課金時間ではありません。短縮率は成功条件にしていません。

全6回で32テスト成功、16 inline snapshots一致（追加・更新なし）。固定基準と照合した16ファイル・32テストID・48 assertionsを維持。coverageは各回ともlines 64/64、statements 96/96、functions 64/64（各100%）、branches 48/64（75%）。対象・閾値を変更していません。

初版ローカル（中央値2.710→1.960秒）、修正後ローカル（4.603→2.979秒）、今回CIは別セッションです。修正後ローカルには5.193→5.281秒の悪化回があり、その原記録も保持しています。18回をひとつの比較にはまとめません。

## 故障・補助回帰・復元

baseline/candidate双方で、故障なし、既知の実装故障、意図した環境エラーの計6ケースを想定どおり分類しました。既知故障は`lookup01`の戻り値へ1を加える変更で、期待値137を維持した`feature-01 round-trips a catalogue key`が実値138で失敗しました。環境エラーは存在しない実行ファイルによる別分類です。

この故障確認は対象2テスト・coverage無効の別実行であり、性能測定には含めません。補助回帰24件は24件成功・失敗0で、模擬結果を含みます。追加24回の性能実測ではありません。実装・テストの復元、全trackedファイルのハッシュ維持、protected inventory維持を`integrity.json`で確認しました（changed / missing / addedProtectedはいずれも空）。

## Artifactと追跡手順

[artifact取得先](https://github.com/Issey-Kubota/vitest-ci-practice/actions/runs/35611291375/artifacts/10643619820)の名前は`p29-ci-35611291375-attempt-1`、ID `10643619820`。ZIPは290,047 bytes、172ファイル、ダウンロード・展開・SHA-256照合済みです。

SHA-256：`089c6c6fc7d29c2e6dd5a10642c6cf9305a1aa930e348acd9f739ae8d8992f45`。

保存期限は2026-10-21 14:19:21 UTC（30日）。取得時にGitHubへのログインが必要な場合があります。期限後はGitHubから取得できない可能性があります。

1. 成功runを開き、attempt 1・対象commitを確認してartifactを取得します。
2. ZIPのSHA-256を照合して展開します。
3. `run-context.json`、`versions.json`、`integrity.json`を確認します。
4. `new-artifacts/measure-4SgbKg/summary.json`と各回のVitest JSON・coverage・stdout/stderrを照合します。
5. `new-artifacts/failure-4ceb5031-4086-4477-ab65-5edc10b41bf2/failure-check.json`と補助回帰ログを確認します。

受領helperの`evidenceKind: real-vitest-local`等は元の固定ラベルを保持しています。実際のCI由来はrun URL、commit、run-contextで判断してください。原JSONのラベルを書き換えてはいません。再現手順は[README](../README.md)、設定は[workflow説明](ci-workflow.md)を参照してください。

品質全体の保証、利用者のCIへの必要テスト復帰、複数job・DOM・DB・外部I/Oへの一般化、価格・需要・第三者反応は、この実行から確認できません。
