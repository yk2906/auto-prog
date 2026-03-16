/**************************************
 * 設定値
 **************************************/
// 元データ側フォルダID
const SOURCE_FOLDER_ID = 'フォルダAのIDをここに書く';
// 同期先フォルダID
const TARGET_FOLDER_ID = 'フォルダBのIDをここに書く';

// 対象シート名とセル番地
const TARGET_SHEET_NAME = 'Sheet1';
const TARGET_CELL_A1 = 'B2';

/**************************************
 * メイン関数
 * フォルダA内のスプレッドシートのセルを
 * フォルダB側の同名ファイルにコピーする
 **************************************/
function syncCellBetweenFolders() {
  const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  const targetFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);

  const sourceFiles = sourceFolder.getFilesByType(MimeType.GOOGLE_SHEETS);

  while (sourceFiles.hasNext()) {
    const srcFile = sourceFiles.next();
    const fileName = srcFile.getName();

    // 同名ファイルをフォルダBから探す
    const targetFiles = targetFolder.getFilesByName(fileName);
    if (!targetFiles.hasNext()) {
      // 対応するファイルがなければスキップ
      continue;
    }

    const tgtFile = targetFiles.next();

    // 元シート・セルから値を取得
    const srcSs = SpreadsheetApp.openById(srcFile.getId());
    const srcSheet = srcSs.getSheetByName(TARGET_SHEET_NAME);
    if (!srcSheet) {
      continue;
    }
    const srcValue = srcSheet.getRange(TARGET_CELL_A1).getValue();

    // 先シート・セルに値を書き込み
    const tgtSs = SpreadsheetApp.openById(tgtFile.getId());
    const tgtSheet = tgtSs.getSheetByName(TARGET_SHEET_NAME);
    if (!tgtSheet) {
      continue;
    }
    tgtSheet.getRange(TARGET_CELL_A1).setValue(srcValue);
  }
}