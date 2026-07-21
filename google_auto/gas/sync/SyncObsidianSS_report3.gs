/**
 * Obsidian版: 【項番3】Udemy受講レポート
 * 同名の「スプレッドシート」と「Markdownファイル」をDrive全体から探し、
 * Markdownの見出し単位でスプレッドシートの当月シートへ同期する。
 * 共通ロジックは sync/SyncCommon.gs を参照。
 */
function syncMarkdownToCellReport3() {
  const targetFileName = '【項番3】Udemy受講レポート';
  const currentMonthName = (new Date().getMonth() + 1) + '月';

  const syncMap = {
    '### 内容': 'D15',
    '### 学んだこと': 'B21',
    '### 今後の活用': 'B28',
    '### 活用実践の成果': 'B34',
  };
  // 1番目・2番目…の見出しの「一番浅いインデント」だけを同期するセル（順にE9〜E14）
  const shallowCells = ['E9', 'E10', 'E11', 'E12', 'E13', 'E14'];
  // 各 E 列と同じ行の S 列に、タイトル行の「（17分）」形式の括弧内を同期（E9↔S9, E10↔S10 …）
  const shallowTimeCells = ['S9', 'S10', 'S11', 'S12', 'S13', 'S14'];

  try {
    const ss = findSpreadsheetByName(targetFileName);
    const targetSheet = findSheetByMonthName(ss, currentMonthName);

    const lines = fetchObsidianMarkdownLines(targetFileName);
    const parsed = buildSyncResultsFromLines(lines, syncMap, '### 内容');

    writeShallowReport(ss, targetSheet, syncMap, parsed.results, parsed.shallowResults, shallowCells, shallowTimeCells);

    console.log('同期完了: ' + targetFileName + ' -> ' + targetSheet.getName());
  } catch (e) {
    console.error(e.toString());
  }
}
