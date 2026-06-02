/**
 * 設定値を返す。この関数を編集すれば clasp push だけで反映される。
 */
function getConfigValues() {
  const sharedFolderId = '1jA0UwCHPFDo-Nutn7m_I-DTJhk2N4wG-';
  return {
    document_report: {
      source_folder_id: sharedFolderId,
      destination_folder_id: sharedFolderId
    },
    daily_report: {
      source_folder_id: '1fkouegK9E7AlonDmaqQSaZCCnjJe1eBB',
      cells_to_clear: [[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [13, 4], [20, 2], [9, 19], [10, 19], [11, 19], [12, 19], [13, 19], [9, 24]],
      // スプレッドシート名ごとにクリアするセルを変える場合。キー=ファイル名（完全一致）、値=[[行,列],...]
      cells_to_clear_by_name: {},
      // スプレッドシート名に文字列を含む場合のクリアセル。キー=含まれる文字列（大文字小文字区別）、値=[[行,列],...]
      cells_to_clear_by_name_contains: {
        'Udemy受講レポート': [[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [13, 4], [14, 4], [15, 4], [21, 2], [28, 2], [34, 2], [9, 19], [10, 19], [11, 19], [12, 19], [13, 19], [14, 19], [9, 24]],
        '自主勉強会開催レポート': [[9, 5], [10, 4], [15, 2], [22, 2], [28, 2]]
      },
      date_cell: {row: 8, column: 5}
    },
    goal_management_report: {
      source_folder_id: sharedFolderId,
      calendar_id: 'yk050696@gmail.com',
      cells_to_clear: [
        [22, 39], [31, 39], [40, 39], [50, 39], [60, 39], // AM列
        [22, 52], [31, 52], [40, 52], [50, 52], [60, 52]  // AZ列
      ],
      date_cell: {row: 8, column: 5}
    }
  };
}

/**
 * 初回のみ実行: ScriptProperties への移行前の互換用。現在は getConfigValues() で代替。
 * トリガー設定は setupTriggers() を使用してください。
 */
function setupConfig() {
  Logger.log('setupConfig は不要になりました。getConfigValues() が直接参照されます。');
}

/**
 * トリガーを設定（初回のみ実行）
 */
function setupTriggers() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  
  // 毎月1日の午前9時にドキュメントをコピー
  ScriptApp.newTrigger('copyDocumentReport')
    .timeBased()
    .onMonthDay(1)
    .atHour(9)
    .create();
  
  // 毎日午前9時に日次レポートを生成
  ScriptApp.newTrigger('copySpreadsheetReport')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
  
  // 毎月1日の午前9時に目標管理レポートを生成
  ScriptApp.newTrigger('copyMokuhyoukanriReport')
    .timeBased()
    .onMonthDay(1)
    .atHour(9)
    .create();
  
  Logger.log('トリガーを設定しました');
}

