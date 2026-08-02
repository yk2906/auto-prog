/**
 * ABC目標シート（{期短縮}-ABC目標）の評価セルを、
 * 目標管理進捗報告シートの新規作成タブへ同期する。
 * copyMokuhyoukanriReport() から呼び出される想定。
 */
function syncAbcGoalCells(targetSheet, syncConfig) {
  if (!syncConfig || !syncConfig.abc_parent_folder_id) {
    log('ABC目標同期設定（abc_parent_folder_id）が見つからないためスキップします');
    return;
  }

  const periodFolder = getLatestPeriodFolder(syncConfig.abc_parent_folder_id);
  const abcFile = findAbcGoalSpreadsheetFile(periodFolder);
  if (!abcFile) {
    log('ABC目標ファイルが見つかりませんでした: ' + periodFolder.getName());
    return;
  }

  const opened = openAsGoogleSheet(abcFile, periodFolder);
  try {
    const sheets = opened.spreadsheet.getSheets();
    syncConfig.sheet_mappings.forEach(function(mapping) {
      const sourceSheet = sheets[mapping.source_sheet_index];
      if (!sourceSheet) {
        log('ABC目標のシートが見つかりませんでした（index: ' + mapping.source_sheet_index + '）');
        return;
      }

      const sourceCells = mapping.source_cells;
      const targetCells = mapping.target_cells;
      for (let i = 0; i < sourceCells.length; i++) {
        const value = sourceSheet.getRange(sourceCells[i]).getValue();
        targetSheet.getRange(targetCells[i]).setValue(value);
      }
    });
    log('ABC目標（' + abcFile.getName() + '）のセルを進捗報告シートへ同期しました');
  } finally {
    if (opened.tempFileId) {
      DriveApp.getFileById(opened.tempFileId).setTrashed(true);
    }
  }
}

/**
 * フォルダ内から「ABC目標」を含み「ABC結果」を含まないファイルを探す
 */
function findAbcGoalSpreadsheetFile(folder) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (name.indexOf('ABC目標') !== -1 && name.indexOf('ABC結果') === -1) {
      return file;
    }
  }
  return null;
}

/**
 * Googleスプレッドシートとして開く。
 * xlsx等のネイティブでないファイルの場合は、Drive APIで
 * Googleスプレッドシート形式へ変換した一時コピーを作成して開く
 * （呼び出し側で opened.tempFileId をゴミ箱へ移動すること）
 */
function openAsGoogleSheet(file, parentFolder) {
  if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
    return { spreadsheet: SpreadsheetApp.openById(file.getId()), tempFileId: null };
  }

  log('Googleスプレッドシート形式でないため、一時変換コピーを作成します: ' + file.getName());
  const token = ScriptApp.getOAuthToken();
  const response = UrlFetchApp.fetch(
    'https://www.googleapis.com/drive/v3/files/' + file.getId() + '/copy',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({
        name: '__tmp_sync_' + file.getName(),
        mimeType: MimeType.GOOGLE_SHEETS,
        parents: [parentFolder.getId()]
      })
    }
  );
  const copiedFileId = JSON.parse(response.getContentText()).id;
  return { spreadsheet: SpreadsheetApp.openById(copiedFileId), tempFileId: copiedFileId };
}
