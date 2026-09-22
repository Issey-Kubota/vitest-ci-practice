# Vitest CI Practice

Vitestのテストを減らさずに、import方法の変更による実行時間の違いを比較するサンプルプロジェクトです。TypeScriptで書かれた小さなサンプルを使い、**計測 → 変更 → 同じ条件で再計測 → テスト内容の維持確認**を実践できます。

テストの高速化を試したい方や、CIでの計測・比較手順を学びたい方を対象としています。リポジトリをcloneして実行する学習・検証用のサンプルで、任意のプロジェクトを自動診断・修正する機能はありません。

## できること

- 変更前・変更後のテストを交互に各3回実行し、経過時間とCPU時間を記録する。
- テストID、assertion、snapshot、coverage条件を維持したまま比較する。
- 意図的に実装へ不具合を入れ、変更前後のテストがその不具合を検出できるか確認する。
- 測定結果・ログ・coverageを保存し、無効な測定と有効な測定を区別する。
- 同じ検証手順をローカルとGitHub Actionsで実行する。

## 比較する内容

このサンプルでは、48個のモジュールをまとめて再exportするファイル（barrel）経由のimportと、対象モジュールからの直接importを比較します。各モジュールは読み込み時に検索用のindexを作成するため、不要なモジュールの読み込みを減らすと実行時間が変わる、という仮説を試せます。

```diff
-import { key01, lookup01 } from '../src/features/index.js'
+import { key01, lookup01 } from '../src/features/feature-01.js'
```

`baseline`は変更前、`candidate`は変更後を表します。16個のテストファイルでimport先だけを切り替え、32テスト・48 assertions・16 inline snapshotsとcoverage設定を維持します。

## 動作環境

Linux x64を対象としています。GitHub ActionsではUbuntu 24.04を使用します。

| 項目 | バージョン・設定 |
|---|---|
| Node.js | 24.19.0 |
| npm | 11.9.0 |
| Vitest / @vitest/coverage-v8 | 5.0.1 / 5.0.1 |
| Vite / TypeScript | 8.3.0 / 5.9.2 |
| テスト環境 | Node、forks pool、isolate有効 |
| 並列実行 | 4 workers、fileParallelism有効 |
| coverage閾値 | lines / functions / statements 95%、branches 75% |

比較条件を揃えるため、指定のNode.jsとnpmを使用してください。依存パッケージは同梱の`package-lock.json`からインストールします。

## クイックスタート

Git、上記バージョンのNode.jsとnpmを用意して、以下を実行します。初回の依存取得にはネットワーク接続が必要です。

```bash
git clone https://github.com/Issey-Kubota/vitest-ci-practice.git
cd vitest-ci-practice

node --version
npm --version
npm ci

# 1. 計測前：テストが比較用の固定基準に一致するか確認
npm run verify:manifest

# 2. import先を切り替えて計測し、開始時のテストへ復元
npm run measure

# 3. 計測後：テストに想定外の変更が残っていないか再確認
npm run verify:manifest
```

### なぜ計測の前後で同じ確認をするのか

`verify:manifest`は、その時点の`tests/`を`reference/baseline-tests.json`という固定の見本と照合するコマンドです。テストを実行したり、基準やファイルを書き換えたりはしません。前後で使う基準は同じで、**確認するタイミングと目的が違います。**

| 手順 | 確認・実行すること | 目的 |
|---|---|---|
| 1. 計測前の`verify:manifest` | 16ファイルの全文とファイル一覧を照合。指定されたimport先以外の変更、ファイルの追加・欠落を検出 | テストの期待値などが変わっていない、比較できる状態から始める |
| 2. `measure` | import先をbaseline/candidateへ交互に切り替え、各3回計測。最後に開始時のファイル内容へ復元 | 同じテスト内容でimport方法だけを比較する |
| 3. 計測後の`verify:manifest` | 計測後のテストを、手順1と同じ固定の見本へ再照合 | 計測後もテストが許可された内容であることを確認する |

照合では、全ファイルがbaselineまたはcandidateに揃っている状態を許可します。そのため、後の`verify:manifest`だけで「開始時と全く同じ内容へ戻った」と判定しているわけではありません。**開始時の内容とのバイト単位の一致は`measure`自身が確認し、`summary.json`の`restoration.restored`へ記録します。** 後のコマンドは、その復元処理が終わった後の独立した再確認です。

正常時は、前後の照合で`valid: true`が表示されます。途中で失敗したら次へ進まず、`reasons`や測定の`fatalReasons`を確認してください。Node.js・依存版、ソース、lockfile、Vitest設定などの測定条件は、`verify:manifest`ではなく`measure`側が別途検証します。

**未コミットの変更がない作業用コピーで実行してください。** 実行中に対象ファイルを編集したり、複数の計測を同時に走らせたりしないでください。

## 結果の見方

**[コマンド出力・保存ファイルの例と読み方](docs/output-guide.md)**では、正常時のJSON、各項目の意味、測定前に停止した場合の調べ方を説明しています。`summary.json`・`record.json`・テスト結果・coverage・故障確認のファイル例も掲載しています。

実行ごとに新しい`artifacts/measure-*/`ディレクトリが作られます。

| 出力 | 内容 |
|---|---|
| `summary.json` | 各回の時間、有効・無効の判定理由、中央値、実行条件、復元結果 |
| 各回のVitest JSON | テストとsnapshotの実行結果 |
| 各回のcoverage・ログ | coverageの詳細、標準出力・標準エラー |

最初に`summary.json`で6回すべてが有効かを確認し、その後で各回の値と中央値を比較してください。起動失敗、欠測、古い結果ファイル、条件やテストの不一致があると測定は無効になり、コマンドは失敗します。欠測を0秒として比較することはありません。

経過時間は処理の開始から終了までの時間です。CPU時間は並列workerを含む処理時間の合計で、経過時間を上回る場合があります。CPU時間をCIの占有時間や課金時間として扱わないでください。

環境や実行回によって結果は変わるため、各回の値と中央値の両方を確認してください。`artifacts/`は実行時に自動作成される出力先です。過去の測定結果は配布せず、新しい結果もGitの追跡対象から除外しています。

## 不具合の検出を確認する

```bash
npm run failure-check
npm run verify:manifest
```

変更前・変更後の両方で、次の3つを確認します。

1. 正常な実装でテストが成功すること。
2. 実装に既知の不具合を入れると、期待するテストが失敗すること。
3. 実行ファイルが見つからない環境エラーを、テストによる不具合検出と区別できること。

結果は`artifacts/failure-*/`へ保存され、実装とテストは終了時に復元されます。この確認では対象を2テストに絞り、coverageを無効にします。性能比較用の測定とは別の実行です。

## GitHub Actionsで実行する

自分のアカウントで試す場合は、このリポジトリをforkしてGitHub Actionsを有効にしてください。

1. forkしたリポジトリの **Actions** を開きます。
2. 同梱の[検証workflow](.github/workflows)を選択します。
3. **Run workflow** で`main`ブランチを選び、実行します。
4. 実行ページで各stepの結果を確認し、**Artifacts**からログと測定結果をダウンロードします。

workflowは手動起動のみです。単一jobで依存取得、測定、不具合検出の確認、補助スクリプトのテスト、ファイルの復元確認を行います。上限は15分、artifactの保存期間は30日です。

`main`ブランチからの新規実行を想定しています。同じrunの **Re-run jobs** は受け付けないため、再度試す場合も **Run workflow** から新しいrunを開始してください。詳しい条件は[CIの設定と実行手順](docs/ci-workflow.md)を参照してください。

## ディレクトリ構成

| パス | 内容 |
|---|---|
| `src/` | 検証対象のTypeScriptサンプル |
| `tests/` | 機能テストとinline snapshots |
| `scripts/` | 計測・検証スクリプトと開発用テスト。`fixtures/`は補助テスト専用データ |
| `reference/` | 変更前のテストと比較用の固定基準 |
| `artifacts/` | 実行時に生成される測定結果とログ（Git管理外） |
| `results/` | 個別テストコマンドの実行時に生成される出力（Git管理外） |
| `docs/` | CIの使い方、テスト・固定基準の説明、出力例と読み方 |

## 開発用の確認

計測・検証スクリプトを変更する場合は、以下で補助処理のテストを実行できます。

```bash
node --test --test-concurrency=1 scripts/check-manifest.test.mjs scripts/check-measure.test.mjs scripts/check-failure.test.mjs
```

このテストには模擬データによる異常系の確認を含みます。`scripts/fixtures/vitest-success.json`はそのための最小限の入力データで、性能測定結果ではありません。過去の実行ログを用意せずにテストできます。

## 利用上の注意

- **直接importが常に適切とは限りません。** barrelが公開APIの入口なら、export名や公開経路を確認するテストも残してください。
- このサンプルは外部API・DB・DOMを使いません。Browser Mode、外部I/O、状態・順序依存、複数jobの結果結合は対象外です。
- 各測定前にViteキャッシュを削除し、Node compile cacheを無効にしますが、OSのキャッシュやホスト負荷は制御しません。短い測定ではばらつきがあるため、一定の短縮率は保証されません。
- 既知の不具合1件を検出できても、すべての不具合を検出できることや品質全体を保証するものではありません。
- 通常の比較には`measure`を使用してください。`test:baseline`と`test:candidate`はテストファイルを切り替え、`results/current.json`を上書きします。`generate`はサンプル生成用なので、通常の実行手順では不要です。
- ログには実行環境のパスが含まれます。共有前に内容を確認し、認証情報や非公開コードなどを含めないでください。

## 不具合報告・質問

[GitHub Issues](https://github.com/Issey-Kubota/vitest-ci-practice/issues)から報告できます。OS、Node.js・npmのバージョン、実行コマンド、期待した動作と実際の動作を添えてください。ログは必要な箇所を抜粋し、個人情報や機密情報を除いてください。

## ライセンス

[MIT License](LICENSE)


## 改行コードの扱い

固定基準・テスト・測定対象ファイルの照合では、CRLFをLFとして比較します。改行形式だけの違いで失敗することはありません。空白、期待値、コードなど、それ以外の変更は引き続き検出します。ファイルを自動変換する処理ではなく、測定後の復元では開始時の改行を含む元のバイト列を維持します。照合用ハッシュはLFに揃えた内容のハッシュです。

Gitでの取得時は`.gitattributes`によりLFを使用します。以前取得したコピーにCRLFが残っていても、更新後の照合処理で扱えます。

なお、改行への対応はWindowsネイティブ環境での性能測定への対応とは別です。`measure`はLinux x64を対象とするため、Windowsでは指定版のNode.jsとnpmを用意したWSL2などのLinux環境で実行してください。
