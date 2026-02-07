function syncMarkdownToCell() {
    // --- 設定エリア ---
    const fileId = '1WmsKFPG5PVP42fY_H0qhPj9sKsQSSZOLkh5GxlZlcTo'; 
    const sheetName = '②02月07日'; // 反映させたいシート名
    const cellAddress = 'D9';   // 反映させたいセル
    // ----------------
  
    try {
      // Googleドライブからファイルを取得
      const file = DriveApp.getFileById(fileId);
      const content = file.getBlob().getDataAsString();
  
      // スプレッドシートの指定セルに書き込み
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      sheet.getRange(cellAddress).setValue(content);
  
      console.log('同期が完了しました！');
    } catch (e) {
      console.error('エラーが発生しました: ' + e.toString());
    }
  }
  
  // メニューを追加して、ボタン一発で実行できるようにする
  function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🛠️ カスタム同期')
      .addItem('Markdownから読み込む', 'syncMarkdownToCell')
      .addToUi();
  }