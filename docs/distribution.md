# 配布内容と原記録

この配布物は、受領した合成例を公開用に整理したものです。受領ZIPのSHA-256は `31addf499cb52fbb5908f164ffe29cb3fd4dbbd3108fee91357d406dcbf4271c` です。公開用の文書・Issue案内・workflowの追加により、配布ツリー全体はそのZIPと同一ではありません。

## 変更しない部分

`src/`、`tests/`、`scripts/`、`vitest.config.ts`、`package.json`、`package-lock.json`、`reference/`、LICENSE、旧`results/`を受領版のまま保持します。フィクスチャや基準の再生成で変更を受け入れ直してはいません。

`reference/LINEAGE.md`のZIPハッシュは初版の由来を示します。上記の修正版ZIPハッシュとは対象が異なります。`review/original-evidence-sha256.json`は旧`results/`20ファイルの保全確認に使えます。

## 保存したセッション

|区分|保存先|意味|
|---|---|---|
|初版ローカル|`results/`|旧6回と関連原記録。旧故障確認は期待値変更方式で、実装故障検知の根拠にはしない|
|修正後ローカル6回|`artifacts/measure-IIQ5Qj/`|全6回のVitest JSON、時間、coverage、条件、復元|
|実装故障の確認|`artifacts/failure-caa614d7-c1e2-4f66-bff6-ab74994de52c/`|故障なし・実装故障・環境エラーを両import条件で確認|
|補助回帰・初期|`artifacts/measure-regression-gsWq2y/`|模擬結果を含む初期回帰。性能比較には使わない|
|補助回帰・最終|`artifacts/measure-regression-YmoELc/`|欠測・起動失敗・条件不一致等。性能比較には使わない|
|確認ログ|`review/logs/`|正常・故障・補助回帰のstdout/stderr等|

補助回帰24件の根拠は、`review/logs/regression.stdout.log`内の固定基準9件＋故障分類7件と、`measure-regression-final.stdout.log`の最終計測8件です。最初のログ全体は23件であり、最終24件の一括実行ログとは説明しません。

原記録には合成プロジェクトの実行先を表すsandboxパスや一時ディレクトリ識別子が残っています。個人・会社のディレクトリ名や認証情報ではありません。テストID・coverageパスとの照合、原記録のバイト一致を維持するため加工していません。別の場所で再実行すれば、その場所のパスが新しい記録へ出ます。本人環境の生ログを公開提出しないでください。

## 配布用の整理

READMEと公開説明を更新し、Issue案内とCI確認記録を追加しています。内部管理の文書、作業時間メモ、それらの内容を含む旧総合差分は配布対象から外しています。具体的な除外対象は `docs/parent-report.md`、`review/work-log.json`、`review/changes.patch`、`review/logs/work-start.json`、`manifest-start.json`、`manifest-end.json`、同ディレクトリの`*.time.json`です。性能測定の各回時間・条件・結果は上記の原記録へ保持しています。

旧測定の悪化回・失敗記録を成功例だけに整理してはいません。新しいCIの結果は旧ファイルへ上書きせず、run単位のartifactと[CI確認記録](ci-result.md)へ分けます。

`node_modules`や認証ファイルは配布しません。依存は同梱lockfileから復元してください。利用条件は[MIT License](../LICENSE)です。
