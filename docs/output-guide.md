# 出力例と結果の読み方

まずコマンド出力で成否を確認し、保存先の`summary.json`で全体を、各回の`record.json`で理由を確認します。テストの詳細は`vitest.json`、coverageは`coverage/coverage-summary.json`、起動エラーの詳細は`stdout.txt`・`stderr.txt`を開いてください。JSONとログはテキストエディターで読めます。

以下の成功例は[GitHub Actionsでの実行例](https://github.com/Issey-Kubota/vitest-ci-practice/actions/runs/35611291375)の値を使っています。対象commitは`655c46762be358e2342677317d1d872dc957faf4`で、現行版の再測定結果や性能保証ではありません。保存先は説明用の`/path/to/vitest-ci-practice`へ置き換えています。ファイル例は読み方に必要なフィールドを抜粋しており、実物には環境・ハッシュ・他のテストなども含まれます。サンプルJSONを実行結果の代わりに配置しないでください。

## 1. 固定基準の確認：verify:manifest

`npm run verify:manifest`の出力例（抜粋）です。このコマンドはJSONを標準出力へ表示し、単独実行では結果ファイルを保存しません。

```json
{
  "valid": true,
  "reasons": [],
  "variant": "candidate",
  "assertions": 48,
  "snapshots": 16
}
```

`valid: true`は、その時点のテストが固定基準に合うことを表します。テストを実行して成功したという意味ではありません。`variant`はimportの状態で、`baseline`がbarrel経由、`candidate`が直接importです。

失敗時は`reasons`を確認します。`reference_digest_mismatch`は基準ファイルの不一致、`unauthorized_test_change`は許可されたimport変更以外の差分です。現行版ではCRLF/LFだけの違いは許容します。詳しくは[テストと固定基準](test-inventory.md)を参照してください。

## 2. 計測コマンドの出力：measure

`npm run measure`は全6回を実行した後、画面へ次の要約を表示します。

```json
{
  "output": "/path/to/vitest-ci-practice/artifacts/measure-4SgbKg",
  "complete": true,
  "validCount": 6,
  "invalidCount": 0,
  "fatalReasons": [],
  "comparison": {
    "baseline": {
      "samples": 3,
      "medianWallMs": 2226,
      "medianCpuMs": 6817
    },
    "candidate": {
      "samples": 3,
      "medianWallMs": 1517,
      "medianCpuMs": 4531
    }
  }
}
```

| 項目 | 読み方 |
|---|---|
| `output` | 今回の結果を保存したディレクトリ |
| `complete` | 有効な6回が揃い、致命的なエラーがなく、復元確認も完了したか |
| `validCount` / `invalidCount` | 有効／無効と判定された測定回数 |
| `fatalReasons` | 事前条件や復元など、処理全体に関するエラー |
| `comparison` | 条件を満たした実測の比較。比較できなければ`null` |
| `samples` | そのvariantの有効な測定数 |
| `medianWallMs` | 経過時間の中央値（ミリ秒）。2226 msは2.226秒 |
| `medianCpuMs` | 並列workerを含む合計CPU時間の中央値（ミリ秒） |

この例は、経過時間の中央値が2.226秒から1.517秒へ、0.709秒（約31.9%）短縮したと読めます。CPU時間は並列処理の合計なので経過時間を上回ることがあります。CIの占有時間や課金時間には読み替えません。

**`complete: true`は「高速化に成功した」という意味ではありません。** 変更後が遅くても、計測・検証・復元が正常なら`true`です。中央値だけでなく各回の値も確認してください。

## 3. 保存されるファイル

`measure-*`の末尾は毎回変わります。既存の結果へ上書きせず、新しいディレクトリに保存します。

| 保存先（measure-*からの相対パス） | 内容 |
|---|---|
| `summary.json` | 6回分の記録、比較、環境、キャッシュ条件、復元結果 |
| `1-baseline/record.json` | 1回目の有効性・時間・条件・判定理由 |
| `1-baseline/vitest.json` | 1回目のVitestによるテスト・snapshot結果 |
| `1-baseline/coverage/coverage-summary.json` | 1回目のcoverage集計 |
| `1-baseline/stdout.txt` / `stderr.txt` | 1回目の標準出力／標準エラー |
| `2-candidate/`〜`6-candidate/` | 同じ種類のファイルを各回別に保存 |

順番は`1-baseline`、`2-candidate`、`3-baseline`、`4-candidate`、`5-baseline`、`6-candidate`です。測定前に停止した場合は、各回のディレクトリやファイルが作られないことがあります。

### summary.json：全体と復元の確認

コマンド出力より詳しい情報を持つファイルです。以下は集計と復元状態の抜粋です。

```json
{
  "validCount": 6,
  "invalidCount": 0,
  "complete": true,
  "fatalReasons": [],
  "comparison": {
    "baseline": {
      "samples": 3,
      "medianWallMs": 2226,
      "medianCpuMs": 6817
    },
    "candidate": {
      "samples": 3,
      "medianWallMs": 1517,
      "medianCpuMs": 4531
    }
  },
  "restoration": {
    "restored": true,
    "files": 16
  }
}
```

`restoration.restored: true`は、保存したテストを元に戻し、開始時とのバイト一致を確認できたことを表します。`files: 16`は復元対象のファイル数です。計測前に停止して`files: 0`の場合は、テストの切り替えまで進んでいません。復元欄だけで測定成功とは判断せず、`complete`・回数・エラーも見てください。

同じファイルの`records`配列には各回の詳細が入り、`conditions`・`runner`・`cache`には実行条件が入ります。異なる環境やセッションの値はひとつの比較に混ぜないでください。

### record.json：1回分の有効性と時間

`1-baseline/record.json`の抜粋です。

```json
{
  "sequence": 1,
  "variant": "baseline",
  "attempt": 1,
  "valid": true,
  "reasons": [],
  "wallMs": 2226,
  "exitCode": 0,
  "jsonPresent": true,
  "totalRunnerCpuMs": 6817,
  "testCounts": {
    "total": 32,
    "passed": 32,
    "failed": 0,
    "skipped": 0,
    "todo": 0
  }
}
```

`sequence`は全体での実行順、`attempt`は各variantの1〜3回目を表します。GitHub Actionsの再実行回数とは別です。

この例は「変更前の1回目が有効で、2.226秒かかり、32テストすべて成功した」と読めます。`before`と`after`には各回の前後の条件確認、`coverageTotals`にはcoverage集計も保存されます。

`exitCode: 0`や`jsonPresent: true`だけでは有効になりません。新しいレポートか、必要なテスト・coverage・時間が揃っているかも検証し、総合した結果が`valid`になります。

### vitest.json：テストとsnapshotの確認

`1-baseline/vitest.json`の抜粋です。

```json
{
  "success": true,
  "numTotalTests": 32,
  "numPassedTests": 32,
  "numFailedTests": 0,
  "numPendingTests": 0,
  "numTodoTests": 0,
  "snapshot": {
    "total": 16,
    "matched": 16,
    "unmatched": 0,
    "added": 0,
    "updated": 0,
    "failure": false
  }
}
```

32件すべて成功し、skipやtodoはなく、16個のsnapshotが一致しています。`added: 0`・`updated: 0`なので、この実行でsnapshotを追加・更新して成功させたものではありません。

個別テストは`testResults`内の`assertionResults`を確認します。主な項目は`fullName`（テスト名）、`status`（成否）、`failureMessages`（失敗理由）です。

### coverage-summary.json：対象コードの確認

`1-baseline/coverage/coverage-summary.json`の`total`から、主要4指標を抜粋しています。

```json
{
  "total": {
    "lines": {
      "total": 64,
      "covered": 64,
      "skipped": 0,
      "pct": 100
    },
    "statements": {
      "total": 96,
      "covered": 96,
      "skipped": 0,
      "pct": 100
    },
    "functions": {
      "total": 64,
      "covered": 64,
      "skipped": 0,
      "pct": 100
    },
    "branches": {
      "total": 64,
      "covered": 48,
      "skipped": 0,
      "pct": 75
    }
  }
}
```

`total`は対象数、`covered`は実行された数、`pct`は割合（%）です。たとえばbranchesは64分岐中48分岐、75%です。この例ではlines・statements・functionsが100%、branchesが75%で、設定された閾値を満たしています。

実際のファイルにはソースファイルごとの集計も入ります。coverageが高いことだけで、バグがないとは判断できません。

### stdout.txt / stderr.txt：エラーの詳細

`stdout.txt`にはVitestのテスト一覧・集計など、`stderr.txt`には警告・エラーやCPU時間を取得するための情報が入ります。内容や色付けの制御文字は環境で異なります。

**`stderr.txt`が空でないだけでは失敗とは限りません。** まず`record.json`の`valid`と`reasons`を確認し、問題がある場合に該当回のログを読んでください。

## 4. 測定前に止まった場合

次はNode.jsの指定版と異なる環境で止まった場合の説明用の例です。性能の測定結果ではありません。

```json
{
  "output": "/path/to/vitest-ci-practice/artifacts/measure-example",
  "complete": false,
  "validCount": 0,
  "invalidCount": 0,
  "fatalReasons": [
    "condition_mismatch: Node v24.21.0; expected v24.19.0"
  ],
  "comparison": null
}
```

`validCount: 0`・`invalidCount: 0`は、測定が一度も始まっていない状態です。「6回すべて失敗した」という意味ではありません。保存先の`summary.json`で`fatalReasons`や`preflight`を確認します。

| 理由 | 確認すること |
|---|---|
| `condition_mismatch: Node ...` | 指定のNode.js 24.19.0か |
| `condition_mismatch: platform/architecture` | Linux x64で実行しているか |
| `environment_error: npm version unavailable` | 実行環境からnpmを起動できるか |
| `condition_mismatch: changed ...` | 指定ファイルに内容変更がないか |

Windowsネイティブ環境での`measure`は対象外です。WindowsではWSL2などのLinux環境に指定のNode.js・npmを用意するか、GitHub Actionsを使ってください。LF/CRLFへの対応はWindowsでの性能測定対応とは別です。

測定を開始した後の無効結果は、`summary.json`の`records`または各回の`record.json`の`reasons`へ記録されます。全6回が有効でなければ比較は出しません。

| 各回の理由の例 | 意味 |
|---|---|
| `missing_test_json` | その回のテストレポートがない |
| `stale_or_invalid_test_json: ...` | レポートの時刻がその実行区間に入っていない |
| `test_id_mismatch` | 必要なテストの一覧と一致しない |
| `snapshot_mismatch` | snapshotの一致条件を満たしていない |
| `missing_coverage_summary` | coverage集計がない |
| `missing_cpu_timing` | CPU時間を取得できなかった |

欠測を0秒で補ったり、無効な回を除いて成功した回だけで比較したりしないでください。

## 5. 故障検出の確認：failure-check

`npm run failure-check`は性能測定とは別に、正常・既知の実装故障・意図した環境エラーを両variantで確認します。出力先は`artifacts/failure-*/`です。

画面には`passed`・`directory`・`reasons`・各ケースの判定・`restored`を要約して表示します。ファイル`failure-check.json`には期待した故障、全6ケース、復元した各ファイルの情報を保存します。以下はファイルから1ケースだけを抜粋した例です（実物の`records`は6件あります）。

```json
{
  "passed": true,
  "reasons": [],
  "records": [
    {
      "variant": "baseline",
      "scenario": "implementation_fault",
      "expectedClassification": "implementation_fault_detected",
      "exitCode": 1,
      "classification": "implementation_fault_detected",
      "expectedFailureDetected": true,
      "targetTestId": "feature-01 round-trips a catalogue key",
      "passed": true
    }
  ]
}
```

このケースの`exitCode: 1`は、意図して入れた不具合をテストが検出したためです。指定テストが「期待値137、実値138」で失敗したことを確認できるので、検証ケース自体は`passed: true`です。

環境エラーのケースは`classification: environment_error`・`expectedFailureDetected: false`になります。意図した起動エラーとして確認できれば、そのケースは`passed: true`です。任意の起動失敗を不具合検出の成功として扱うわけではありません。

ケース別の`record.json`・`vitest.json`・`stdout.txt`・`stderr.txt`は、たとえば`baseline/implementation_fault/`へ保存されます。意図的に起動できない環境エラーのケースでは`vitest.json`が作られないのが正常です。`implementation-fault.patch`には注入した差分、`failure-check.json`の`restoration`には元に戻した確認結果が入ります。

GitHub Actionsから取得する場合の格納先は[CIの手順](ci-workflow.md)を参照してください。生成結果には実行環境のパスなどが含まれるため、共有時は必要な箇所を抜粋してください。
