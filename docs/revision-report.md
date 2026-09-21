# P29 補助スクリプト修正後のローカル確認

修正対象：既存合成例の3補助スクリプトと、その根拠・説明。外部公開前のローカル確認。

## 結果

3補助スクリプトを修正し、元と同じNode 24.19.0、npm 11.9.0、Vitest/coverage-v8 5.0.1、Vite 8.3.0、TypeScript 5.9.2のLinux x64環境で確認しました。実装・テスト・依存・Vitest設定は元ZIPとバイト一致です。必要なテスト集合や閾値を変更していません。

- 実Vitestの性能測定6回：全回32/32成功、有効6、無効0、コマンドexit 0。
- 実Vitestの故障確認：baseline/candidateとも故障なし成功、実装故障検知、意図的環境エラーの区別に成功。
- 補助処理の回帰試験：計測8件、固定基準照合9件、故障分類7件、計24件成功。16件は最初の統合ログ、計測8件は最終ログが根拠です。
- 元のresults全20ファイルをバイト単位で保全。旧6回の時間合計は **13.910秒**。旧報告の15.910秒は加算誤りです。

この文書は修正時のローカル再実行の記録です。初版ローカル結果や後続のCI結果とは別セッションとして扱います。

## 1. measure.mjs

各呼出しで`artifacts/measure-*/`を新規作成し、各回のJSON・coverage・stdout/stderrも別保存します。旧`results/`へのフォールバックはありません。保存先を再利用せず、JSONのstartTimeがその子プロセスの開始〜終了に入ることも確認します。

起動失敗、JSON欠測・不正、古い時刻、終了コード異常、条件不一致、テストIDやsnapshot・coverageの不一致を理由付きで無効とします。固定Node/npm/主要依存版、source/config/lockfileのハッシュ、固定テスト基準を確認します。変更前後の両側で入力を照合し、測定後の条件変化も無効にします。事前照合に失敗した場合はVitestを起動せず、fatalReasonsへ理由を残します。

比較は実測の有効6回が揃った場合にだけ出します。欠測等を0秒や推定値で埋めず、1回でも無効ならcomparisonはnull、コマンド全体はexit 1です。正常でも異常でも、スクリプトが切り替えたテストを開始時のバイト列へ戻します。

確認済み：古い成功JSONだけが残る状態、新しいJSON欠測、spawn ENOENT、設定不一致、1回欠測＋5回有効、子コマンドexit 0でも結果欠測なら親CLI exit 1。回帰用に作った模擬結果は`regression-harness-not-performance`と明記し、性能結果として使いません。

## 2. verify-manifest.mjs

元ZIPのcandidateから、指定のimportだけをbaselineへ戻した固定基準を`reference/baseline-tests.json`へ保存しました。これは保全した成果物からの再構成であり、新たな過去実測ではありません。由来と元ZIPのSHA-256は`reference/LINEAGE.md`にあります。

検証は固定基準と全テストの全文を比較し、各ファイルに指定したimport変更のみ許可します。期待値・assertion・snapshot・ID・その他の編集、間違ったimport、追加・欠落ファイル、条件混在は失敗します。基準自体のハッシュも固定し、検証時には基準も旧manifestも更新しません。

確認済み：正常baseline、正常candidate、期待値変更、誤import、追加、欠落、条件混在、基準改変、CLIの成功exit 0／変更拒否exit 1。すべて隔離コピーで確認しました。

## 3. failure-check.mjs

期待値137を変えず、`src/features/feature-01.ts`のlookup実装に「既知キーの戻り値へ1を加える」故障を1件入れます。未知キーの-1は維持します。対象IDは`feature-01 round-trips a catalogue key`。検知にはこのIDが失敗し、`expected 138 to be 137`というAssertionErrorが記録され、もう1件とsnapshotが成功することを要求します。

| 条件 | 故障なし | 実装故障あり | 起動環境エラー |
|---|---|---|---|
| baseline | 2/2成功、exit 0 | 指定IDだけ失敗、exit 1 | JSONなし、環境エラー、検知成功に数えない |
| candidate | 2/2成功、exit 0 | 指定IDだけ失敗、exit 1 | JSONなし、環境エラー、検知成功に数えない |

環境エラーは存在しないVitest entryを指定して確認しました。想定した環境エラーを正しく区別できたため、確認スクリプト全体はexit 0です。「環境エラーでテストが成功した」という意味ではありません。想定外の結果ならスクリプト全体はexit 1になります。

実装と16テストをfinallyで復元し、17ファイルすべて開始前後のSHA-256とバイト一致を確認しています。この対象2件の故障確認だけはcoverageを無効にし、性能測定から分離しています。性能6回は全32件と元と同じcoverage条件です。

## 元記録と新規確認の分離

`results/`は旧納品そのままです。旧`failure-check.json`は期待値変更だけを確認した旧記録として保存し、実装故障検知の根拠にはしません。

| 根拠 | 保存先 |
|---|---|
| 元の6回・旧結果 | `results/` |
| 旧結果の保全と元ZIPハッシュ | `review/original-evidence-sha256.json` |
| 修正後の実Vitest6回・各回coverage・条件 | `artifacts/measure-IIQ5Qj/` |
| 修正後の実装故障・正常・環境エラー | `artifacts/failure-caa614d7-c1e2-4f66-bff6-ab74994de52c/` |
| 計測異常系の最終回帰結果 | `artifacts/measure-regression-YmoELc/` |
| コマンド・回帰テストログ | `review/logs/` |

修正後の実Vitest測定は次のとおりです。元の数値へ混ぜず、補助処理の正常系確認として残します。

| 順番 | 条件 | OS経過 秒 | 合計CPU 秒 | 結果 |
|---:|---|---:|---:|---|
| 1 | baseline | 4.603 | 14.104 | 有効・32/32成功 |
| 2 | candidate | 2.979 | 7.873 | 有効・32/32成功 |
| 3 | baseline | 5.193 | 15.032 | 有効・32/32成功 |
| 4 | candidate | 5.281 | 13.395 | 有効・32/32成功 |
| 5 | baseline | 4.288 | 13.235 | 有効・32/32成功 |
| 6 | candidate | 2.535 | 8.081 | 有効・32/32成功 |

新規6回の経過時間合計は24.879秒、中央値はbaseline 4.603秒、candidate 2.979秒でした。一方、2組目はcandidate 5.281秒がbaseline 5.193秒より長くなりました。すべての回が改善したとは扱いません。ホスト負荷とOS page cacheは制御していません。新規実行ではNode compile cacheを明示的に無効にし、時刻・条件を保存しました。旧測定の値と同一になるとは主張しません。

合計CPU時間はrunner占有時間や課金時間ではありません。CIの総runner占有時間は未測定としてnullです。

## barrelが公開APIの場合

barrelが公開APIの入口なら、その入口を通るexport名・公開経路・契約の試験を維持してください。必要な入口試験を直接importに置き換えて除外することは勧めません。本例は内部機能の合成試験であり、公開API入口の保証は対象外です。本例の直接import化を、公開API試験を減らす理由にはしません。

## 再確認コマンド

Node 24.19.0とnpm 11.9.0、同梱lockfileを使います。

```bash
npm ci
npm run verify:manifest
npm run measure
npm run failure-check
node --test --test-concurrency=1 scripts/check-manifest.test.mjs scripts/check-measure.test.mjs scripts/check-failure.test.mjs
npm run verify:manifest
```

依存導入ができない場合は未実行として止めてください。別Node版での結果を固定環境の追試として扱いません。このローカル確認では既存の固定依存を確認して実行し、再インストールはしていません。クリーンな依存復元の証拠とは区別します。


## 後続のCI確認

[CI確認記録](ci-result.md)を参照してください。旧ローカル記録をCI記録で上書きしません。受領スクリプトが出力する `evidenceKind: real-vitest-local` と `localRunnerCount` は従来のフィールド名です。CI実行場所は別途保存するrun ID・対象commit・runner情報で確認し、この名前だけで判定しません。`ciRunnerOccupancyMs: null`をCPU時間から補完しません。
