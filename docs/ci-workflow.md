# GitHub Actionsでの検証

## 実行方法

1. リポジトリをforkし、GitHub Actionsを有効にします。
2. Actionsで **Vitest validation** を選択します。
3. **Run workflow** で`main`を選びます。
4. 完了後にjobのログとArtifactsを確認します。

起動は`workflow_dispatch`による手動実行のみです。push・Pull Request・定期実行では起動しません。`main`以外や同じrunの再実行は受け付けないため、再度試す場合は新しいrunを開始してください。

## 実行条件

Ubuntu 24.04 / Linux x64、単一job、上限15分です。Node.js 24.19.0、npm 11.9.0、Vitest / coverage-v8 5.0.1、Vite 8.3.0、TypeScript 5.9.2を使用します。依存は`npm ci`で復元します。

Actionsは公式リポジトリのcommit SHAで固定し、権限は`contents: read`です。checkoutした認証情報は永続化せず、リポジトリへの書き戻しも行いません。

## 処理の流れ

1. 実行ID、commit、runner情報を記録し、対象commitをcheckoutする。
2. 実行前の追跡ファイルのハッシュを保存する。
3. Node.js・npmを準備し、依存を取得して版を照合する。
4. `verify:manifest`で計測前のテストを固定基準と照合する。
5. `measure`でbaseline/candidateを交互に各3回計測し、開始時のテストへ復元する。
6. `failure-check`で正常・既知の不具合・環境エラーを確認し、実装とテストを復元する。
7. 補助スクリプトの回帰テストを実行する。模擬結果を含み、追加の性能測定ではない。
8. `verify:manifest`で処理後のテストを再照合する。
9. 追跡ファイルのハッシュと保護対象のファイル一覧を実行前と比較し、今回生成した出力をartifactへ保存する。

予期しないエラーは失敗として扱います。前段の失敗で通常の後続stepはスキップされますが、復元状態の記録とartifact保存は成否にかかわらず試みます。runnerの消失などでは保存できないこともあります。

## 出力の確認

artifactの保存期間は30日です。必要な結果は実行ページからダウンロードしてください。

| ファイル | 確認すること |
|---|---|
| `run-context.json` | 実行ID・対象commit・OS・CPU・メモリー・キャッシュ条件 |
| `versions.json` | 指定版と実際の版の一致 |
| `integrity.json` | 実行前後の追跡ファイルの一致 |
| `new-artifacts/measure-*/summary.json` | 各回の有効性、時間、比較、テストの復元 |
| `new-artifacts/failure-*/failure-check.json` | 不具合の検出と実装・テストの復元 |
| 各コマンドのログ | エラーの詳細と補助テストの結果 |

## 測定上の注意

Actionsの依存キャッシュは使わず、npmキャッシュは空のディレクトリから開始します。Node.jsのtoolcache利用有無はsetupログで確認できます。依存インストールは測定区間に含めません。

各回でViteキャッシュを削除し、Node compile cacheを無効にしますが、OS page cacheやホスト負荷は制御しません。同じrunnerラベルでも同一ハードウェアとは限りません。CPU時間とrunner占有・課金時間も異なります。

測定JSONの`evidenceKind: real-vitest-local`は実プロセスを起動するhelperの固定ラベルです。CIで実行されたかは`run-context.json`とGitHubの実行ページを合わせて確認してください。
