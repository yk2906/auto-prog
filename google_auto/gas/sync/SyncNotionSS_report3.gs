/**
 * Notion版: 【項番3】Udemy受講レポート
 * 同期元がNotionページである点以外は SyncObsidianSS_report3.gs と同じ挙動。
 * 事前に NotionCommon.gs の説明に従い NOTION_API_TOKEN を設定し、
 * 対象のNotionページをインテグレーションに共有しておくこと。
 */
function syncNotionToCellReport3() {
  // --- 設定エリア ---
  const targetName = '【項番3】Udemy受講レポート';
  // スプレッドシートの検索対象フォルダ
  const spreadsheetFolderId = '17NUktwOSniJ0ZMQ8ViBxFqKzVswtrXKx';
  // この親ページ配下から同名のページを探す（親ページを開いてURLをコピーして設定）
  const notionRootPageUrl = 'https://app.notion.com/p/25-3a4b5b5ab776805d8e1de70ebb53a430';

  const currentMonthName = (new Date().getMonth() + 1) + '月';

  const syncMap = {
    '### 内容': 'D15',
    '### 学んだこと': 'B21',
    '### 今後の活用': 'B28',
    '### 活用実践の成果': 'B34',
  };
  const shallowCells = ['E9', 'E10', 'E11', 'E12', 'E13', 'E14'];
  const shallowTimeCells = ['S9', 'S10', 'S11', 'S12', 'S13', 'S14'];
  // ----------------

  try {
    const ss = findSpreadsheetByName(targetName, spreadsheetFolderId);
    const targetSheet = findSheetByMonthName(ss, currentMonthName);

    // 親ページ配下の「今月」フォルダを特定し、その配下から同名のNotionページを取得
    const notionMonthPageId = findNotionPageIdUnderParent(notionRootPageUrl, currentMonthName);
    const notionPageId = findNotionPageIdUnderParent(notionMonthPageId, targetName);
    const lines = fetchNotionPageAsLines(notionPageId);

    const parsed = buildSyncResultsFromLines(lines, syncMap, '### 内容');
    writeShallowReport(ss, targetSheet, syncMap, parsed.results, parsed.shallowResults, shallowCells, shallowTimeCells);

    console.log('同期完了(Notion): ' + targetName + ' -> ' + targetSheet.getName());
  } catch (e) {
    console.error(e.toString());
  }
}
