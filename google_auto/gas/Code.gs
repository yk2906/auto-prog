/**
 * 設定を取得。値の変更は Setup.gs の getConfigValues() を編集し clasp push するだけでよい。
 */
function getConfig() {
  return getConfigValues();
}

/**
 * Drive の ID 文字列を正規化する
 * - URL が入っていても ID 部分を抽出
 * - 前後の空白を除去
 */
function normalizeDriveId(rawId) {
  const value = String(rawId || '').trim();
  if (!value) {
    throw new Error('ID が空です。スクリプトプロパティを確認してください。');
  }

  // そのままIDなら返す
  if (/^[a-zA-Z0-9_-]{20,}$/.test(value)) {
    return value;
  }

  // URL から ID を抽出（folders / d / id）
  const match = value.match(/\/(?:folders|d)\/([a-zA-Z0-9_-]{20,})/) ||
    value.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (match) {
    return match[1];
  }

  throw new Error('Drive のID形式として解釈できません: ' + value);
}

/**
 * フォルダIDを解決する
 * - フォルダIDならそのまま返す
 * - ファイルIDが渡された場合は親フォルダを返す
 */
function resolveFolder(folderId) {
  const normalizedId = normalizeDriveId(folderId);
  try {
    return DriveApp.getFolderById(normalizedId);
  } catch (folderError) {
    try {
      const file = DriveApp.getFileById(normalizedId);
      const parents = file.getParents();
      if (!parents.hasNext()) {
        throw new Error('親フォルダが見つかりません: ' + normalizedId);
      }
      const parentFolder = parents.next();
      log('警告: フォルダIDではなくファイルIDが指定されていたため、親フォルダを使用します: ' + parentFolder.getId());
      return parentFolder;
    } catch (fileError) {
      throw new Error(
        'フォルダID解決に失敗しました。ID=' + normalizedId +
        ' folderError=' + folderError +
        ' fileError=' + fileError
      );
    }
  }
}

/**
 * フォルダ内の最新ファイルを取得
 */
function getLatestFileInFolder(folderId, mimeType) {
  const folder = resolveFolder(folderId);
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
    const folder = resolveFolder(folderId);
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
    // Pythonの %-m/%-d/%Y に合わせる (例: 4/5/2026)
    const dateString = Utilities.formatDate(now, Session.getScriptTimeZone(), "M/d/yyyy");
    sheet.getRange(dateCell.row, dateCell.column).setValue(dateString);
  }
}

function parseStudyTime(text) {
  const s = String(text || '');
  const hourMatch = s.match(/(\d+)時間/);
  const minMatch = s.match(/(\d+)分/);
  return (hourMatch ? parseInt(hourMatch[1]) : 0) * 60 + (minMatch ? parseInt(minMatch[1]) : 0);
}

function formatStudyTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

// 目次シートのC5~C10から今月の日付が入っている行を探し、F列に受講時間合計を書き込む
function writeTocStudyTime(ss, studyTime) {
  const tocSheet = ss.getSheetByName('目次');
  if (!tocSheet) return;
  const today = new Date();
  const values = tocSheet.getRange(5, 3, 6, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    const val = values[i][0];
    if (val instanceof Date && val.getMonth() === today.getMonth() && val.getFullYear() === today.getFullYear()) {
      tocSheet.getRange(5 + i, 6).setValue(studyTime);
      return;
    }
  }
}

/**
 * ログ出力
 */
function log(message) {
  Logger.log('[' + new Date().toISOString() + '] ' + message);
}

