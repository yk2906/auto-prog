/**
 * シート名から番号を抽出して次の番号を生成
 */
function generateNextNumber(currentTitle) {
  const match = currentTitle.match(/^[①-⑳]/);
  if (match) {
    const currentUnicode = match[0].charCodeAt(0);
    const nextUnicode = currentUnicode + 1;
    return String.fromCharCode(nextUnicode);
  }
  return '①';
}

/**
 * 新しいシート名を生成
 */
function generateNewSheetTitle(latestSheetTitle) {
  const nextNumber = generateNextNumber(latestSheetTitle);
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return nextNumber + ' ' + month + '月' + day + '日';
}

/**
 * メイン処理: 日次レポートの自動生成
 */
function copySpreadsheetReport() {
  try {
    const config = getConfig();
    const reportConfig = config.daily_report;
    
    if (!reportConfig.source_folder_id) {
      log('エラー: source_folder_id が設定されていません');
      return;
    }
    
    // フォルダ内のスプレッドシートを取得
    const spreadsheets = getFilesInFolder(
      reportConfig.source_folder_id,
      MimeType.GOOGLE_SHEETS
    );
    
    if (spreadsheets.length === 0) {
      log('対象フォルダにスプレッドシートが見つかりませんでした');
      return;
    }
    
    spreadsheets.forEach(function(spreadsheetItem) {
      try {
        const spreadsheet = SpreadsheetApp.openById(spreadsheetItem.id);
        const sheets = spreadsheet.getSheets();
        
        if (sheets.length === 0) {
          log('スプレッドシート ' + spreadsheetItem.name + ' にシートがありません');
          return;
        }
        
        // 最新のシート（一番右）を取得
        const latestSheet = sheets[sheets.length - 1];
        const newSheetTitle = generateNewSheetTitle(latestSheet.getName());
        
        // シートを複製
        const newSheet = latestSheet.copyTo(spreadsheet);
        newSheet.setName(newSheetTitle);
        
        // セルをクリア
        if (reportConfig.cells_to_clear) {
          clearCells(newSheet, reportConfig.cells_to_clear);
        }
        
        // 日付を更新
        if (reportConfig.date_cell) {
          updateDate(newSheet, reportConfig.date_cell);
        }
        
        log('スプレッドシート ' + spreadsheetItem.name + ' に新しいシート \'' + newSheetTitle + '\' を作成しました');
        
      } catch (error) {
        log('スプレッドシート ' + spreadsheetItem.name + ' の処理中にエラー: ' + error.toString());
      }
    });
    
  } catch (error) {
    log('エラーが発生しました: ' + error.toString());
  }
}

