/**
 * 特定のフォルダ内の最新の Google ドキュメントをコピーし、新しい名前で保存します。
 */
function copyLatestDocumentReport() {
  // 設定 (Python の config.json に相当)
  // 必要に応じて適切なフォルダIDに書き換えてください。
  const CONFIG = {
    source_folder_id: "YOUR_SOURCE_FOLDER_ID",      // 元ファイルがあるフォルダID
    destination_folder_id: "YOUR_DEST_FOLDER_ID"    // コピー先のフォルダID
  };

  try {
    const sourceFolder = DriveApp.getFolderById(CONFIG.source_folder_id);
    const destFolder = DriveApp.getFolderById(CONFIG.destination_folder_id);

    // 最新の Google ドキュメントを取得
    const latestFile = getLatestFileInFolder(sourceFolder, MimeType.GOOGLE_DOCS);

    if (!latestFile) {
      Logger.log("指定されたフォルダに Google ドキュメントが見つかりませんでした。");
      return;
    }

    // 新しいファイル名を生成
    const newFileName = generateNewFileName();

    // ドキュメントをコピー
    const copiedFile = latestFile.makeCopy(newFileName, destFolder);

    Logger.log("新しい Google Document が作成されました: " + newFileName);
    Logger.log("ファイル ID: " + copiedFile.getId());

  } catch (e) {
    Logger.log("エラーが発生しました: " + e.toString());
  }
}

/**
 * 新しいファイル名を生成します (例: 状況報告書_4月)。
 */
function generateNewFileName() {
  const now = new Date();
  const month = now.getMonth() + 1; // 0-11 なので +1
  return "状況報告書_" + month + "月";
}

/**
 * 指定されたフォルダ内で最新の（最終更新日時が一番新しい）ファイルを取得します。
 */
function getLatestFileInFolder(folder, mimeType) {
  const files = folder.getFilesByType(mimeType);
  let latestFile = null;
  let lastUpdated = 0;

  while (files.hasNext()) {
    const file = files.next();
    const updateTime = file.getLastUpdated().getTime();
    if (updateTime > lastUpdated) {
      lastUpdated = updateTime;
      latestFile = file;
    }
  }

  return latestFile;
}
