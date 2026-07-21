/**
 * Notion版: 【項番4】自主勉強会開催レポート
 * 同期元がNotionページである点以外は SyncObsidianSS_report4.gs と同じ挙動。
 * 事前に NotionCommon.gs の説明に従い NOTION_API_TOKEN を設定し、
 * 対象のNotionページをインテグレーションに共有しておくこと。
 */
function syncNotionToCellReport4() {
  // --- 設定エリア ---
  const targetName = '【項番4】自主勉強会開催レポート';
  // この親ページ配下から同名のページを探す（親ページを開いてURLをコピーして設定）
  const notionRootPageUrl = 'https://app.notion.com/p/7-3a4b5b5ab776800eb7f6e9c57bbfb233';

  const today = new Date();
  const currentMonthName = (today.getMonth() + 1) + '月';

  const syncMap = {
    '### 内容': 'D10',
    '### 目的': 'B15',
    '### 受講者の反応': 'B22',
    '### 開催内容の反省点、次回の改善点': 'B28',
  };
  // ----------------

  try {
    // 1. スプレッドシートを名前で検索
    const ssFiles = DriveApp.getFilesByName(targetName);
    let ssFile = null;
    while (ssFiles.hasNext()) {
      const file = ssFiles.next();
      if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
        ssFile = file;
        break;
      }
    }
    if (!ssFile) throw new Error('スプレッドシート「' + targetName + '」が見つかりません。');
    const ss = SpreadsheetApp.open(ssFile);

    // 2. 「○月」を含むシートを自動で探す
    const allSheets = ss.getSheets();
    let targetSheet = null;
    for (let i = 0; i < allSheets.length; i++) {
      if (allSheets[i].getName().indexOf(currentMonthName) !== -1) {
        targetSheet = allSheets[i];
        break;
      }
    }
    if (!targetSheet) throw new Error('名前に「' + currentMonthName + '」を含むシートが見つかりません。');

    // 3. 親ページ配下から同名のNotionページを取得し、Markdown風の行配列に変換
    const notionPageId = findNotionPageIdUnderParent(notionRootPageUrl, targetName);
    const lines = fetchNotionPageAsLines(notionPageId);

    // 4. 見出し単位で抽出（このレポートには「一番浅いインデント」抽出は無い）
    const parsed = buildSyncResultsFromLines(lines, syncMap, null);
    const results = parsed.results;

    // 5. 書き込み
    Object.keys(syncMap).forEach(heading => {
      const cell = syncMap[heading];
      targetSheet.getRange(cell).setValue(results[heading].join('\n') || '');
    });

    console.log('同期完了(Notion): ' + targetName + ' -> ' + targetSheet.getName());

  } catch (e) {
    console.error(e.toString());
  }
}
