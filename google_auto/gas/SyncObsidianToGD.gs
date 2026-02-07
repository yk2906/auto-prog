function syncMarkdownToCell() {
    // --- 設定エリア ---
    const ssId = '1WmsKFPG5PVP42fY_H0qhPj9sKsQSSZOLkh5GxlZlcTo'; 
    const fileId = '1WmsKFPG5PVP42fY_H0qhPj9sKsQSSZOLkh5GxlZlcTo'; 
    const sheetName = '②02月07日'; 
    const cellAddress = 'D9'; 
    // ----------------
  
    try {
      // スプレッドシートをIDで直接取得
      const ss = SpreadsheetApp.openById(ssId);
      const sheet = ss.getSheetByName(sheetName);
  
      if (!sheet) {
        throw new Error('シート名「' + sheetName + '」が見つかりません。');
      }
  
      // GoogleドライブからMarkdownファイルを取得
      const file = DriveApp.getFileById(fileId);
      const content = file.getBlob().getDataAsString();
  
      // 書き込み
      sheet.getRange(cellAddress).setValue(content);
  
      // 完了をポップアップ通知
      SpreadsheetApp.getUi().alert('同期が完了しました！');
    } catch (e) {
      // エラー内容をポップアップ通知
      if (SpreadsheetApp.getUi()) {
        SpreadsheetApp.getUi().alert('エラーが発生しました: ' + e.toString());
      } else {
        console.error(e.toString());
      }
    }
  }
  
  // メニュー作成（スプレッドシートを開き直した時に実行されます）
  function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🛠️ カスタム同期')
      .addItem('Markdownから読み込む', 'syncMarkdownToCell')
      .addToUi();
  }