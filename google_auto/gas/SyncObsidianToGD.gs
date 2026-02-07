function syncMarkdownToCell() {
    const ssId = '1WmsKFPG5PVP42fY_H0qhPj9sKsQSSZOLkh5GxlZlcTo'; 
    const fileId = '10MtwaVpnfjJ-5VoZhAYB-g_1ff0jDGp5XFfo7CXw2M0'; 
    const sheetName = '②02月07日'; 
    const cellAddress = 'D9'; 
  
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName(sheetName);
    const file = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString();
  
    sheet.getRange(cellAddress).setValue(content);
  }