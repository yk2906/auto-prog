/**
 * 初期設定: スクリプトプロパティに設定を保存
 * config.jsonの内容を基に設定してください
 */
function setupConfig() {
  const properties = PropertiesService.getScriptProperties();
  
  // ドキュメントレポート設定
  properties.setProperty('DOC_SOURCE_FOLDER_ID', 'REPLACE_WITH_YOUR_DOCUMENT_SOURCE_FOLDER_ID');
  properties.setProperty('DOC_DEST_FOLDER_ID', '12gKaJbxAjtSkCatQF0sm6vl2GLC-fvVP');
  
  // 日次レポート設定
  properties.setProperty('DAILY_SOURCE_FOLDER_ID', '11IVtllpoBz8Oih_LaOVkfpali0MLUND7');
  properties.setProperty('DAILY_CELLS_TO_CLEAR', JSON.stringify([[8, 5], [9, 4], [15, 2], [22, 2], [28, 2]]));
  properties.setProperty('DAILY_DATE_CELL', JSON.stringify({row: 8, column: 5}));
  
  // 目標管理レポート設定
  properties.setProperty('GOAL_SOURCE_FOLDER_ID', '12gyDaNA_PW5OHhMhvB4_FHnNDP25jGYQ');
  properties.setProperty('GOAL_CALENDAR_ID', 'yk050696@gmail.com');
  properties.setProperty('GOAL_CELLS_TO_CLEAR', JSON.stringify([[22, 39], [31, 39], [40, 39], [50, 39], [60, 39]]));
  properties.setProperty('GOAL_DATE_CELL', JSON.stringify({row: 8, column: 5}));
  
  Logger.log('設定を保存しました');
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

