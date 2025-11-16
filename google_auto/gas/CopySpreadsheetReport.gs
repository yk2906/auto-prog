/**
 * シート名から番号を抽出して次の番号を生成
 */
function generateNextNumber(currentTitle) {
  // undefined/nullチェックを追加
  if (!currentTitle || typeof currentTitle !== 'string') {
    return '①';
  }
  
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
  // undefined/nullチェックを追加
  if (!latestSheetTitle || typeof latestSheetTitle !== 'string') {
    latestSheetTitle = '①';
  }
  
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
  log('=== copySpreadsheetReport 開始 ===');
  
  try {
    const config = getConfig();
    log('設定を取得しました: ' + JSON.stringify(config));
    
    const reportConfig = config.daily_report;
    log('日次レポート設定: ' + JSON.stringify(reportConfig));
    
    if (!reportConfig.source_folder_id) {
      log('エラー: source_folder_id が設定されていません');
      return;
    }
    
    log('フォルダID: ' + reportConfig.source_folder_id);
    
    // フォルダ内のスプレッドシートを取得
    const spreadsheets = getFilesInFolder(
      reportConfig.source_folder_id,
      MimeType.GOOGLE_SHEETS
    );
    
    log('見つかったスプレッドシート数: ' + spreadsheets.length);
    
    if (spreadsheets.length === 0) {
      log('対象フォルダにスプレッドシートが見つかりませんでした');
      return;
    }
    
    spreadsheets.forEach(function(spreadsheetItem, index) {
      log('--- スプレッドシート ' + (index + 1) + '/' + spreadsheets.length + ' を処理中: ' + spreadsheetItem.name + ' ---');
      
      try {
        const spreadsheet = SpreadsheetApp.openById(spreadsheetItem.id);
        const sheets = spreadsheet.getSheets();
        
        log('シート数: ' + sheets.length);
        
        if (sheets.length === 0) {
          log('スプレッドシート ' + spreadsheetItem.name + ' にシートがありません');
          return;
        }
        
        // 最新のシート（一番右）を取得
        const latestSheet = sheets[sheets.length - 1];
        const sheetName = latestSheet.getName();
        
        log('最新シート名: ' + sheetName);
        
        // シート名のチェックを追加
        if (!sheetName) {
          log('スプレッドシート ' + spreadsheetItem.name + ' のシート名が取得できませんでした');
          return;
        }
        
        const newSheetTitle = generateNewSheetTitle(sheetName);
        log('新しいシート名: ' + newSheetTitle);
        
        // シートを複製
        const newSheet = latestSheet.copyTo(spreadsheet);
        newSheet.setName(newSheetTitle);
        log('シートを複製しました: ' + newSheetTitle);
        
        // セルをクリア
        if (reportConfig.cells_to_clear && reportConfig.cells_to_clear.length > 0) {
          log('クリアするセル数: ' + reportConfig.cells_to_clear.length);
          clearCells(newSheet, reportConfig.cells_to_clear);
          log('セルをクリアしました');
        } else {
          log('クリアするセルが設定されていません');
        }
        
        // 日付を更新
        if (reportConfig.date_cell && reportConfig.date_cell.row && reportConfig.date_cell.column) {
          log('日付セルを更新: 行=' + reportConfig.date_cell.row + ', 列=' + reportConfig.date_cell.column);
          updateDate(newSheet, reportConfig.date_cell);
          log('日付を更新しました');
        } else {
          log('日付セルが設定されていません');
        }
        
        log('スプレッドシート ' + spreadsheetItem.name + ' に新しいシート \'' + newSheetTitle + '\' を作成しました');
        
      } catch (error) {
        log('スプレッドシート ' + spreadsheetItem.name + ' の処理中にエラー: ' + error.toString());
        log('エラースタック: ' + (error.stack || 'スタック情報なし'));
      }
    });
    
    log('=== copySpreadsheetReport 完了 ===');
    
  } catch (error) {
    log('エラーが発生しました: ' + error.toString());
    log('エラースタック: ' + (error.stack || 'スタック情報なし'));
  }
}

