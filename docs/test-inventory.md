# テストと固定基準

対象は`tests/feature-01.test.ts`〜`feature-16.test.ts`です。各ファイルに次の2テストがあります。

| テスト | assertion数 | snapshot数 | 確認すること |
|---|---:|---:|---|
| `feature-NN > round-trips a catalogue key` | 2 | 1 | keyの生成と逆引き結果 |
| `feature-NN > returns -1 for an unknown key` | 1 | 0 | 未登録keyの戻り値 |

全体で32テスト・48 assertions・16 inline snapshotsです。baselineはbarrel経由、candidateは対象モジュールから直接importします。

## 実行に必要なreferenceファイル

`reference/`は過去の実行結果ではなく、現在の検証スクリプトが読み込む固定基準です。

- `baseline-tests.json`：変更前のテスト全文と、許可するimport先の対応表。`verify:manifest`がファイル一覧・全文を照合し、期待値・snapshot・テストIDなどの変更や、ファイルの追加・欠落を検出します。
- `measurement-conditions.json`：Node.js・依存パッケージの版と、ソース・設定・lockfileなどのハッシュ。`measure`が同じ測定条件かを確認します。

スクリプトは基準JSON自身のハッシュも検証します。通常の実行では基準を編集・再生成しないでください。JSONに含まれる由来の識別子は固定基準の一部で、別途ZIPや過去ログを取得する必要はありません。

## 照合と復元の違い

`verify:manifest`は、その時点のテストが許可されたbaselineまたはcandidateに揃っているかを調べる読み取り専用の処理です。前回実行時のファイルを保存したり、前後の内容を比較したりはしません。

`measure`は、開始時のテスト内容をメモリーに保存し、計測後に復元してバイト一致を検証します。`summary.json`の`restoration.restored`で結果を確認できます。計測後の`verify:manifest`は、復元処理後のテストを固定基準へ再照合します。

強制終了などで復元処理が完了しなかった場合は、作業ツリーの差分を確認してから次の実行を始めてください。
