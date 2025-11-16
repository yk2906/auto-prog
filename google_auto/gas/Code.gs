/**
 * 設定をスクリプトプロパティから取得
 */
function getConfig() {
  const properties = PropertiesService.getScriptProperties();
  return {
    document_report: {
      source_folder_id: properties.getProperty('DOC_SOURCE_FOLDER_ID'),
      destination_folder_id: properties.getProperty('DOC_DEST_FOLDER_ID')
    },
    daily_report: {
      source_folder_id: properties.getProperty('DAILY_SOURCE_FOLDER_ID'),
      cells_to_clear: JSON.parse(properties.getProperty('DAILY_CELLS_TO_CLEAR') || '[]'),
      date_cell: JSON.parse(properties.getProperty('DAILY_DATE_CELL') || '{}')
    },
    goal_management_report: {
      source_folder_id: properties.getProperty('GOAL_SOURCE_FOLDER_ID'),
      calendar_id: properties.getProperty('GOAL_CALENDAR_ID'),
      cells_to_clear: JSON.parse(properties.getProperty('GOAL_CELLS_TO_CLEAR') || '[]'),
      date_cell: JSON.parse(properties.getProperty('GOAL_DATE_CELL') || '{}')
    }
  };
}

/**
 * フォルダ内の最新ファイルを取得
 */
function getLatestFileInFolder(folderId, mimeType) {
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFilesByType(mimeType);
  
  let latestFile = null;
  let latestDate = new Date(0);
  
  while (files.hasNext()) {
    const file = files.next();
    const modifiedDate = file.getLastUpdated();
    if (modifiedDate > latestDate) {
      latestDate = modifiedDate;
      latestFile = file;
    }
  }
  
  return latestFile;
}

/**
 * フォルダ内のすべてのファイルを取得
 */
function getFilesInFolder(folderId, mimeType) {
  log('getFilesInFolder 開始: folderId=' + folderId + ', mimeType=' + mimeType);
  
  try {
    const folder = DriveApp.getFolderById(folderId);
    log('フォルダを取得しました: ' + folder.getName());
    
    const files = folder.getFilesByType(mimeType);
    const fileList = [];
    
    while (files.hasNext()) {
      const file = files.next();
      fileList.push({
        id: file.getId(),
        name: file.getName()
      });
      log('ファイルを発見: ' + file.getName() + ' (ID: ' + file.getId() + ')');
    }
    
    log('合計 ' + fileList.length + ' 個のファイルを取得しました');
    return fileList;
  } catch (error) {
    log('getFilesInFolder エラー: ' + error.toString());
    log('エラースタック: ' + (error.stack || 'スタック情報なし'));
    return [];
  }
}

/**
 * セルをクリア
 */
function clearCells(sheet, cellsToClear) {
  if (!cellsToClear || cellsToClear.length === 0) return;
  
  cellsToClear.forEach(function(cell) {
    const row = cell[0];
    const col = cell[1];
    sheet.getRange(row, col).clearContent();
  });
}

/**
 * 日付を更新
 */
function updateDate(sheet, dateCell) {
  if (dateCell && dateCell.row && dateCell.column) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const year = now.getFullYear();
    const dateString = month + '/' + day + '/' + year;
    sheet.getRange(dateCell.row, dateCell.column).setValue(dateString);
  }
}

/**
 * ログ出力
 */
function log(message) {
  Logger.log('[' + new Date().toISOString() + '] ' + message);
}

