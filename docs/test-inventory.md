# 対応するテスト一覧

対象ファイルは`feature-01.test.ts`〜`feature-16.test.ts`の16件です。各ファイルに次の2 IDがあります。

| IDパターン | assertion | snapshot | 目的 |
|---|---:|---:|---|
| `feature-NN > round-trips a catalogue key` | 2 | 1 | key取得、inline snapshot、逆引きindexを確認 |
| `feature-NN > returns -1 for an unknown key` | 1 | 0 | 未登録keyの戻り値を確認 |

合計は32 test ID、48 assertions、16 inline snapshotsです。baseline/candidate間のソース差分は、各ファイルのimport先だけです。

```diff
- import { keyNN, lookupNN } from '../src/features/index.js'
+ import { keyNN, lookupNN } from '../src/features/feature-NN.js'
```

初版の`results/test-manifest.json`は一覧生成のみで照合機能がありませんでした。旧ファイルはそのまま保全しています。修正版は元ZIPから再構成した固定変更前基準`reference/baseline-tests.json`に対し、全16ファイルの全文を照合します。許可するのは各ファイルに指定されたimport先の変更だけで、期待値・snapshot・ID・その他の文言や追加／欠落ファイルが変われば非ゼロ終了します。検証時に基準を書き換えません。生成根拠は`reference/LINEAGE.md`。
