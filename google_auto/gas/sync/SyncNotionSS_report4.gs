/**
 * Notion版: 【項番4】自主勉強会開催レポート
 * 同期元がNotionページである点以外は SyncObsidianSS_report4.gs と同じ挙動。
 * 事前に NotionCommon.gs の説明に従い NOTION_API_TOKEN を設定し、
 * 対象のNotionページをインテグレーションに共有しておくこと。
 */
function syncNotionToCellReport4() {
  // --- 設定エリア ---
  const targetName = '【項番4】自主勉強会開催レポート';
  // スプレッドシートの検索対象フォルダ
  const spreadsheetFolderId = '17NUktwOSniJ0ZMQ8ViBxFqKzVswtrXKx';
  // この親ページ配下から同名のページを探す（親ページを開いてURLをコピーして設定）
  const notionRootPageUrl = 'https://app.notion.com/p/25-3a4b5b5ab776805d8e1de70ebb53a430';

  const currentMonthName = (new Date().getMonth() + 1) + '月';

  const syncMap = {
    '### 内容': 'D10',
    '### 目的': 'B15',
    '### 受講者の反応': 'B22',
    '### 開催内容の反省点、次回の改善点': 'B28',
  };
  // ----------------

  try {
    const ss = findSpreadsheetByName(targetName, spreadsheetFolderId);
    const targetSheet = findSheetByMonthName(ss, currentMonthName);

    // 親ページ配下の「今月」フォルダを特定し、その配下から同名のNotionページを取得
    const notionMonthPageId = findNotionPageIdUnderParent(notionRootPageUrl, currentMonthName);
    const notionPageId = findNotionPageIdUnderParent(notionMonthPageId, targetName);
    const lines = fetchNotionPageAsLines(notionPageId);

    // このレポートには「一番浅いインデント」抽出は無い
    const parsed = buildSyncResultsFromLines(lines, syncMap, null);
    writeSimpleReport(targetSheet, syncMap, parsed.results);

    console.log('同期完了(Notion): ' + targetName + ' -> ' + targetSheet.getName());
  } catch (e) {
    console.error(e.toString());
  }
}
