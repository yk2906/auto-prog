function syncMarkdownToCell() {
    const ssId = '1WmsKFPG5PVP42fY_H0qhPj9sKsQSSZOLkh5GxlZlcTo'; 
    const fileId = '1WmsKFPG5PVP42fY_H0qhPj9sKsQSSZOLkh5GxlZlcTo'; 
    const sheetName = '②02月07日'; 
    const cellAddress = 'D9'; 
  
    try {
      const ss = SpreadsheetApp.openById(ssId);
      const sheet = ss.getSheetByName(sheetName);
      const file = DriveApp.getFileById(fileId);
      const content = file.getBlob().getDataAsString();
  
      sheet.getRange(cellAddress).setValue(content);
      
      // UIが使える状況（シート側から実行）のときだけアラートを出す
      if (MailApp) { console.log('同期完了'); } 
      try { SpreadsheetApp.getUi().alert('同期が完了しました！'); } catch(e) {}
  
    } catch (e) {
      console.error(e.toString());
    }
  }
  
  function onOpen() {
    SpreadsheetApp.getUi().createMenu('🛠️ カスタム同期')
      .addItem('Markdownから読み込む', 'syncMarkdownToCell')
      .addToUi();
  }