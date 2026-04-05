function convertSheetsToExcel() {
    const sourceFolderId = '1fkouegK9E7AlonDmaqQSaZCCnjJe1eBB';
    const outputFolderId = '1ylH419h-HBMEf3Jy5Eot3o2Ll0fLwsjG';
    
    const sourceFolder = DriveApp.getFolderById(sourceFolderId);
    const outputFolder = DriveApp.getFolderById(outputFolderId);
    const files = sourceFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
    
    while (files.hasNext()) {
      let file = files.next();
      let fileId = file.getId();
      let fileName = file.getName() + ".xlsx";

      let existingFiles = outputFolder.getFilesByName(fileName);
      while (existingFiles.hasNext()) {
        let existingFile = existingFiles.next();
        existingFile.setTrashed(true); // ゴミ箱へ移動（誤操作防止のため完全に消さずゴミ箱推奨）
        console.log("既存の同名ファイルをゴミ箱に移動しました: " + fileName);
      }
      
      // Excelエクスポート用URLの生成
      let url = "https://docs.google.com/spreadsheets/d/" + fileId + "/export?format=xlsx";
      let token = ScriptApp.getOAuthToken();
      
      let response = UrlFetchApp.fetch(url, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });
      
      // 出力フォルダに保存
      outputFolder.createFile(response.getBlob()).setName(fileName);
      
      // (オプション) 変換が終わった元のファイルを削除または移動
      // file.setTrashed(true); // ゴミ箱へ
      console.log(fileName + " の変換が完了しました。");
    }
  }