function syncMarkdownToCell() {
    const ssId = '1WmsKFPG5PVP42fY_H0qhPj9sKsQSSZOLkh5GxlZlcTo'; 
    const fileId = '1UNyH2kLjwk_96Lwtld3xOkdpzcBn9rLP'; 
    const sheetName = '②02月07日'; 
    const cellAddress = 'B15'; 
  
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName(sheetName);
    const file = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString();
  
    sheet.getRange(cellAddress).setValue(content);
  }