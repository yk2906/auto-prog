/**
 * メイン処理: Googleドキュメントの月次コピー
 */
function copyDocumentReport() {
  try {
    const config = getConfig();
    const docConfig = config.document_report;
    
    if (!docConfig.source_folder_id) {
      log('エラー: source_folder_id が設定されていません');
      return;
    }
    
    // 最新のGoogleドキュメントを取得
    const latestFile = getLatestFileInFolder(
      docConfig.source_folder_id,
      MimeType.GOOGLE_DOCS
    );
    
    if (!latestFile) {
      log('最新のドキュメントが見つかりませんでした');
      return;
    }
    
    // 新しいファイル名を生成
    const now = new Date();
    const month = now.getMonth() + 1;
    const newFileName = '状況報告書_' + month + '月';
    
    // ドキュメントをコピー
    const copiedFile = latestFile.makeCopy(newFileName);
    
    // 保存先フォルダに移動
    if (docConfig.destination_folder_id) {
      const destFolder = DriveApp.getFolderById(docConfig.destination_folder_id);
      copiedFile.moveTo(destFolder);
    }
    
    log('新しいドキュメントを作成しました: ' + newFileName + ' (ID: ' + copiedFile.getId() + ')');
    
  } catch (error) {
    log('エラーが発生しました: ' + error.toString());
  }
}

