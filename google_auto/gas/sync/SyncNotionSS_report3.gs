/**
 * Notion版: 【項番3】Udemy受講レポート
 * 同期元がNotionページである点以外は SyncObsidianSS_report3.gs と同じ挙動。
 * 事前に NotionCommon.gs の説明に従い NOTION_API_TOKEN を設定し、
 * 対象のNotionページをインテグレーションに共有しておくこと。
 */
function syncNotionToCellReport3() {
  // --- 設定エリア ---
  const targetName = '【項番3】Udemy受講レポート';
  // この親ページ配下から同名のページを探す（親ページを開いてURLをコピーして設定）
  const notionRootPageUrl = 'https://app.notion.com/p/7-3a4b5b5ab776800eb7f6e9c57bbfb233';

  const today = new Date();
  const currentMonthName = (today.getMonth() + 1) + '月';

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

    // 4. 見出し単位で抽出
    const parsed = buildSyncResultsFromLines(lines, syncMap, '### 内容');
    const results = parsed.results;
    const shallowResults = parsed.shallowResults;

    // 5. 書き込み
    Object.keys(syncMap).forEach(heading => {
      const cell = syncMap[heading];
      targetSheet.getRange(cell).setValue(results[heading].join('\n') || '');
    });

    const collectedTimes = [];
    for (let i = 0; i < shallowResults.length && i < shallowCells.length; i++) {
      const cellValue = shallowResults[i].join('\n') || '';
      targetSheet.getRange(shallowCells[i]).setValue(cellValue);
      const timeStr = notionExtractParenTime(cellValue);
      targetSheet.getRange(shallowTimeCells[i]).setValue(timeStr);
      collectedTimes.push(timeStr);
    }
    for (let j = shallowResults.length; j < shallowCells.length; j++) {
      targetSheet.getRange(shallowCells[j]).setValue('');
      targetSheet.getRange(shallowTimeCells[j]).setValue('');
      collectedTimes.push('');
    }

    // S9~S14の受講時間を合算してX9と目次シートのF列に書き込む
    const totalMinutes = collectedTimes.reduce((sum, t) => sum + parseStudyTime(t), 0);
    const formattedTotal = formatStudyTime(totalMinutes);
    targetSheet.getRange('X9').setValue(formattedTotal);
    writeTocStudyTime(ss, formattedTotal);

    // 過去シートのX9が未計算（空）の場合、S9〜S14から合算して書き込む
    const allSheetsForBackfill = ss.getSheets();
    for (let k = 0; k < allSheetsForBackfill.length; k++) {
      const sheet = allSheetsForBackfill[k];
      if (sheet.getName() === targetSheet.getName()) continue;
      const existingX9 = sheet.getRange('X9').getValue();
      if (existingX9 !== '' && existingX9 !== null && existingX9 !== 0) continue;
      const backfillTimes = shallowTimeCells.map(cell => sheet.getRange(cell).getValue());
      const backfillTotal = backfillTimes.reduce((sum, t) => sum + parseStudyTime(String(t)), 0);
      if (backfillTotal > 0) {
        sheet.getRange('X9').setValue(formatStudyTime(backfillTotal));
      }
    }

    console.log('同期完了(Notion): ' + targetName + ' -> ' + targetSheet.getName());

  } catch (e) {
    console.error(e.toString());
  }
}
