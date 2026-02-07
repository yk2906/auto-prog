function syncMarkdownToCellReport2() {
    // --- 設定エリア ---
    // この名前と同じ名前の「スプレッドシート」と「Markdownファイル」を探します
    const targetFileName = '【項番2】udemy受講レポート'; 
    
    // 今日の日付から「2月」のような文字列を作成（シート検索用）
    const today = new Date();
    const currentMonthName = (today.getMonth() + 1) + '月'; 
  
    const syncMap = {
      '### 内容': 'D9',
      '### 学んだこと': 'B15',
      '### 今後の活用': 'B22',
      '### 活用実践の成果': 'B28',
    };
    // ----------------
  
    try {
      // 1. スプレッドシートを名前で検索
      const ssFiles = DriveApp.getFilesByName(targetFileName);
      let ssFile = null;
      while (ssFiles.hasNext()) {
        let file = ssFiles.next();
        if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
          ssFile = file;
          break;
        }
      }
      if (!ssFile) throw new Error('スプレッドシート「' + targetFileName + '」が見つかりません。');
      const ss = SpreadsheetApp.open(ssFile);
  
      // 2. 同じ名前の Markdownファイル（.md）を名前で検索
      const mdFiles = DriveApp.getFilesByName(targetFileName + '.md');
      // もし拡張子なしで保存している場合は DriveApp.getFilesByName(targetFileName)
      let mdFile = null;
      if (mdFiles.hasNext()) {
        mdFile = mdFiles.next();
      } else {
        // 拡張子 .md が付いていない可能性も考慮して再検索
        const mdFilesNoExt = DriveApp.getFilesByName(targetFileName);
        if (mdFilesNoExt.hasNext()) {
          mdFile = mdFilesNoExt.next();
        }
      }
      
      if (!mdFile) throw new Error('Markdownファイル「' + targetFileName + '.md」が見つかりません。');
  
      // 3. 「○月」を含むシートを自動で探す
      const allSheets = ss.getSheets();
      let targetSheet = null;
      for (let i = 0; i < allSheets.length; i++) {
        if (allSheets[i].getName().indexOf(currentMonthName) !== -1) {
          targetSheet = allSheets[i];
          break;
        }
      }
      if (!targetSheet) throw new Error('名前に「' + currentMonthName + '」を含むシートが見つかりません。');
  
      // 4. 特定したMarkdownファイルの内容を解析
      const fullText = mdFile.getBlob().getDataAsString('UTF-8');
      const lines = fullText.split(/\r?\n/);
      
      let results = {};
      Object.keys(syncMap).forEach(key => results[key] = []);
      let currentTarget = null;
  
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i]; // .trim() を外して元の空白を保持する
        let trimmedLine = line.trim(); // 判定用に、空白を除去した変数も用意
  
        // 行が見出し（#）で始まるかチェック
        if (trimmedLine.startsWith('#')) {
          if (syncMap[trimmedLine]) {
            currentTarget = trimmedLine;
          } else {
            currentTarget = null;
          }
          continue;
        }
  
        // 抽出対象の見出し配下にいる場合
        if (currentTarget) {
          // 空白を除去した状態でリスト記号から始まっているか判定
          if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || trimmedLine.match(/^\d+\./)) {
            // 保存するのは「元の空白（インデント）が残っている line」
            results[currentTarget].push(line); 
          }
        }
      }
  
      // 5. 書き込み
      Object.keys(syncMap).forEach(heading => {
        const cell = syncMap[heading];
        const data = results[heading].join('\n');
        targetSheet.getRange(cell).setValue(data || '');
      });
  
      console.log('同期完了: ' + targetFileName + ' -> ' + targetSheet.getName());
  
    } catch (e) {
      console.error(e.toString());
    }
  }