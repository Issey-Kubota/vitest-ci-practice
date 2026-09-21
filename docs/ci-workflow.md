# P29 fixed CI workflow

この workflow は単一の合成例を GitHub-hosted `ubuntu-24.04` / Linux x64 で確認するためのものです。単一 job、15 分上限、`workflow_dispatch` のみで、`main` の run attempt 1 を確認します。再実行は別の判断が必要です。テストの worker 並列度は既存の Vitest 設定を維持し、複数 job へ分割しません。

Node 24.19.0 / npm 11.9.0 と同梱 lockfile を使用します。指定の Node を取得できない場合は setup で失敗します。npm が指定版と異なる場合だけ `npm install --global npm@11.9.0` で指定版を用意し、その後の版照合で一致を必須とします。別版へのフォールバックや lockfile 再生成はありません。

## 実行順

1. 空の evidence / npm cache ディレクトリ作成、run / runner 条件記録。
2. dispatch 対象 commit を credentials 非永続で checkout。
3. 全 tracked ファイルの SHA-256 と既存 artifact 一覧を保存。
4. 指定 Node / npm を用意し、版を確認。
5. `npm ci`。
6. 実際の主要依存版を JSON に記録し、指定版との一致を要求。
7. `npm run verify:manifest`。
8. `npm run measure`（baseline / candidate 交互に各 3 回）。
9. `npm run failure-check`（故障なし / 実装故障 / 予定された環境エラー）。
10. `node --test --test-concurrency=1 scripts/check-manifest.test.mjs scripts/check-measure.test.mjs scripts/check-failure.test.mjs`。
11. `npm run verify:manifest`。
12. 成否にかかわらず元ファイルの SHA-256 と protected file inventory を比較し、今回新しく作られた artifact だけを evidence へコピー。
13. `p29-ci-<run ID>-attempt-<run attempt>` を artifact として保存（30 日）。

通常の検証ステップは、前段が失敗した場合はスキップされます。保存処理は `always()` で実行を試みますが、runner の消失や強制終了で保存できない場合は未取得として扱います。`continue-on-error` は使わず、意図しないエラーや保存失敗を成功にしません。各コマンドのログは `pipefail` と `tee` で記録し、失敗の exit code を維持します。CI の step 開始・終了時刻は GitHub run/job の記録で確認します。

## 記録と区別

- run ID / attempt / commit / runner label / image ID / OS / CPU / メモリー / Node / npm / 主要依存版を記録します。環境変数は許可したフィールドだけを読みます。
- npm キャッシュは実行ごとの空ディレクトリから開始し、Actions の依存キャッシュは無効です。Node の toolcache 利用有無は setup-node のログで確認します。OS page cache はフラッシュしません。
- 旧 `results/` と同梱 `artifacts/` は変更せず、今回の新規ディレクトリだけを別 artifact にまとめます。
- `measure.mjs` は受領版のままであり、実プロセス実行時の固定ラベル `evidenceKind: real-vitest-local` が CI でも出力されます。このラベルは改変しません。CI 実行であることは、同梱 `run-context.json` と GitHub run URL / 対象 commit で判断してください。
- 6 回すべて有効な場合だけ、既存 measure が中央値の比較を出します。短縮率は成功条件にしません。
- helper 回帰 24 件には模擬結果を含みます。性能測定の 24 回追加ではありません。
- CPU 時間は runner 占有・課金時間ではありません。固定した runner label は同一ハードウェア・同一ホスト状態を意味しません。
- CI で成功した場合にも、この合成例を 1 回確認した事実に限定します。

## 公式 Actions と固定 SHA

以下は公式 `actions` リポジトリの release ref を GitHub connector で読み、commit SHA と同 SHA の `action.yml` を確認して採用しました。全て action 自身の実行 runtime は `node24` です。これは sample を実行する Node 24.19.0 の指定とは別です。

| Action | 確認 ref | full commit SHA | 根拠 |
|---|---|---|---|
| actions/checkout | v5 | `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` | [commit](https://github.com/actions/checkout/commit/fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09) / [action.yml](https://github.com/actions/checkout/blob/fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09/action.yml) |
| actions/setup-node | v5 | `a0853c24544627f65ddf259abe73b1d18a591444` | [commit](https://github.com/actions/setup-node/commit/a0853c24544627f65ddf259abe73b1d18a591444) / [action.yml](https://github.com/actions/setup-node/blob/a0853c24544627f65ddf259abe73b1d18a591444/action.yml) |
| actions/upload-artifact | v6 (v6.0.0) | `b7c566a772e6b6bfb58ed0dc250532a479d7789f` | [commit](https://github.com/actions/upload-artifact/commit/b7c566a772e6b6bfb58ed0dc250532a479d7789f) / [action.yml](https://github.com/actions/upload-artifact/blob/b7c566a772e6b6bfb58ed0dc250532a479d7789f/action.yml) |

upload-artifact v6 は [README](https://github.com/actions/upload-artifact/blob/b7c566a772e6b6bfb58ed0dc250532a479d7789f/README.md) で Node 24 と runner 2.327.1 以上を要求しています。標準 GitHub-hosted runner を対象にし、実際の runner version は job の Set up job ログでも確認します。権限は `contents: read` のみで、リポジトリへの書き戻しや個別 secret はありません。

## GitHub 公式資料

- [Manually running a workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)：default branch 上の workflow_dispatch を手動で実行。
- [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)：起動条件・権限・runner・timeout・ステップ条件。
- [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)：最小権限と full commit SHA 固定。
- [GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)：標準 runner label とホスト環境。

公式資料は今回の実行条件の根拠であり、合成例の性能、実業務での効果、商品需要の実証ではありません。
