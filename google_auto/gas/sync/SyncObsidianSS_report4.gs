/**
 * Obsidian版: 【項番4】自主勉強会開催レポート
 * 同名の「スプレッドシート」と「Markdownファイル」をDrive全体から探し、
 * Markdownの見出し単位でスプレッドシートの当月シートへ同期する。
 * 共通ロジックは sync/SyncCommon.gs を参照。
 */
function syncMarkdownToCellReport4() {
  const targetFileName = '【項番4】自主勉強会開催レポート';
  const currentMonthName = (new Date().getMonth() + 1) + '月';

  const syncMap = {
    '### 内容': 'D10',
    '### 目的': 'B15',
    '### 受講者の反応': 'B22',
    '### 開催内容の反省点、次回の改善点': 'B28',
  };

  try {
    const ss = findSpreadsheetByName(targetFileName);
    const targetSheet = findSheetByMonthName(ss, currentMonthName);

    const lines = fetchObsidianMarkdownLines(targetFileName);
    const parsed = buildSyncResultsFromLines(lines, syncMap, null);

    writeSimpleReport(targetSheet, syncMap, parsed.results);

    console.log('同期完了: ' + targetFileName + ' -> ' + targetSheet.getName());
  } catch (e) {
    console.error(e.toString());
  }
}
