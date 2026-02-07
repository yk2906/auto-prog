function syncMarkdownToCell() {
    // --- 設定エリア ---
    const targetSpreadsheetName = '【項番2】udemy受講レポート_gas検証用'; 
    const fileId = '1WmsKFPG5PVP42fY_H0qhPj9sKsQSSZOLkh5GxlZlcTo'; 
    
    // 今日の日付から「3月」のような文字列を作成
    const today = new Date();
    const currentMonthName = (today.getMonth() + 1) + '月'; // 実行時の月（例：3月）
  
    const syncMap = {
      '### 内容': 'D9',
      '### 学んだこと': 'B15',
      '### 今後の活用': 'B22',
      '### 活用実践の成果': 'B28',
    };
    // ----------------
  
    try {
      // 1. スプレッドシートを名前で検索
      const files = DriveApp.getFilesByName(targetSpreadsheetName);
      if (!files.hasNext()) throw new Error('スプレッドシートが見つかりません。');
      const ss = SpreadsheetApp.open(files.next());
  
      // 2. 「3月」を含むシートを自動で探す
      const allSheets = ss.getSheets();
      let targetSheet = null;
      
      for (let i = 0; i < allSheets.length; i++) {
        let name = allSheets[i].getName();
        if (name.indexOf(currentMonthName) !== -1) { // 名前に「3月」が含まれていれば
          targetSheet = allSheets[i];
          break;
        }
      }
  
      if (!targetSheet) {
        throw new Error('名前に「' + currentMonthName + '」を含むシートが見つかりません。');
      }
  
      // 3. Markdownファイルの内容を取得して解析（以前と同じ）
      const file = DriveApp.getFileById(fileId);
      const fullText = file.getBlob().getDataAsString('UTF-8');
      const lines = fullText.split(/\r?\n/);
      
      let results = {};
      Object.keys(syncMap).forEach(key => results[key] = []);
      let currentTarget = null;
  
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line.startsWith('#')) {
          if (syncMap[line]) {
            currentTarget = line;
          } else {
            currentTarget = null;
          }
          continue;
        }
        if (currentTarget && (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./))) {
          results[currentTarget].push(line);
        }
      }
  
      // 4. 特定したシートのセルへ書き込み
      Object.keys(syncMap).forEach(heading => {
        const cell = syncMap[heading];
        const data = results[heading].join('\n');
        targetSheet.getRange(cell).setValue(data || '');
      });
  
      console.log(targetSheet.getName() + ' への同期が完了しました。');
  
    } catch (e) {
      console.error(e.toString());
    }
  }