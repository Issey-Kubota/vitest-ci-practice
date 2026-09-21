# 初回CI確認記録

**CI状態：未実行。** GitHub Actionsのrun ID・対象commit・実行結果はまだありません。公開リポジトリ[Issey-Kubota/vitest-ci-practice](https://github.com/Issey-Kubota/vitest-ci-practice)の存在は確認済みです。この文書を含むmainのcommitを初回CIの対象にし、実行後にそのSHAとrun URLを記録します。

公開先のdefault branchは `main`、配置するworkflowは `.github/workflows/p29-fixed-validation.yml`（`P29 fixed validation`）です。

初回配置と設定確認の完了後、GitHubのActions画面でこのworkflowを**1回だけ**手動起動します。pushでは自動起動しません。完了結果を取得するまで、CI成功とは扱いません。

## 初回の固定条件

- 手動の`workflow_dispatch`のみ。1回のworkflowでbaseline/candidateを交互に各3回。
- 単一job、matrixなし、`ubuntu-24.04`、timeout 15分。
- Node 24.19.0、npm 11.9.0、Vitest／coverage-v8 5.0.1、Vite 8.3.0、TypeScript 5.9.2。
- `npm ci`で同梱lockfileから復元。試験、coverage、isolation、4 workersは受領例のまま。
- 予期しない失敗を成功へ変更せず、自動再試行はしません。成功・失敗の取得できた証拠をrun単位で保存します。

## 実行後に確認するもの

run URL／ID／attempt／対象commit、開始・完了時刻、job・stepの成否、runner image識別子・OS・CPU・メモリー、実際のツール版、依存復元、キャッシュ条件、6回の有効性・絶対時間・中央値、snapshot・coverage・試験維持、故障確認・補助回帰・復元、artifactの取得先をここへ記載します。

有効6回が揃わない場合、性能比較は未確認です。欠測を0や推定値で埋めません。合成例1回のCI確認から、利用者のCI復帰・継続運用・商品需要を結論しません。

受領スクリプトの `evidenceKind: real-vitest-local` と `localRunnerCount` は従来のフィールド名です。CIの実行場所はrun ID・commit・runner条件と合わせて確認し、原JSONを書き換えません。CPU時間はrunner占有時間・課金時間ではありません。

旧ローカル6回、修正後ローカル6回、この初回CIは別セッションとして保存します。

設定と手順は[CI workflowの説明](ci-workflow.md)を参照してください。設定の静的確認と実際のCI実行は区別します。
